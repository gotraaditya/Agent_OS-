import json
import os
import shlex
import subprocess
import threading
from pathlib import Path

from backend.app.database import get_db_connection
from backend.app.agents.base import AgentAdapter


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_ANTIGRAVITY_LAUNCH_COMMAND = "python -m agents.antigravity"
ALLOWED_PYTHON_EXECUTABLES = {"python", "python.exe", "py", "py.exe"}
ALLOWED_MODULES = {"agents.antigravity"}


class AntiGravityAdapter(AgentAdapter):
    def __init__(self, launch_command: str = DEFAULT_ANTIGRAVITY_LAUNCH_COMMAND, project_path: str | None = None):
        self.launch_command = launch_command or DEFAULT_ANTIGRAVITY_LAUNCH_COMMAND
        self.project_path = project_path
        self.process = None
        self.thread = None
        self.status = "idle"
        self.progress = 0
        self.logs = []
        self.current_task = None
        self.project_id = None

    def start(self) -> None:
        self.status = "idle"
        self.progress = 0
        self.logs = ["[SYSTEM] AntiGravity worker adapter online."]

    def stop(self) -> None:
        if self.process:
            self.process.kill()
            self.process = None
        self.status = "offline"

    def _build_command(self) -> list[str]:
        parts = [part.strip("\"'") for part in shlex.split(self.launch_command, posix=False)]
        if not parts:
            raise ValueError("AntiGravity launch command is empty.")

        executable_name = Path(parts[0]).name.lower()
        if executable_name not in ALLOWED_PYTHON_EXECUTABLES:
            raise ValueError(f"Unsupported AntiGravity executable: {parts[0]}")

        if len(parts) != 3 or parts[1] != "-m" or parts[2] not in ALLOWED_MODULES:
            raise ValueError(
                "Unsupported AntiGravity command. Expected 'python -m agents.antigravity'."
            )

        return parts

    def _resolve_working_directory(self) -> Path:
        if self.project_path:
            candidate = Path(self.project_path)
            if candidate.is_dir():
                return candidate.resolve()
            self.logs.append(
                f"[SYSTEM WARN] Project path '{self.project_path}' was not found. "
                "Running worker from repository root for this simulation."
            )
        return PROJECT_ROOT

    def send_task(self, task_id: str, title: str, description: str, expected_output: str, related_files: list[str]) -> None:
        task_data = {
            "task_id": task_id,
            "title": title,
            "description": description,
            "expected_output": expected_output,
            "related_files": related_files
        }

        self.current_task = task_id
        self.status = "working"
        self.progress = 0
        self.logs = [f"[SYSTEM] Dispatching task {task_id} to AntiGravity worker CLI..."]

        try:
            cmd = self._build_command()
            working_directory = self._resolve_working_directory()
            env = os.environ.copy()
            existing_pythonpath = env.get("PYTHONPATH")
            env["PYTHONPATH"] = (
                str(PROJECT_ROOT)
                if not existing_pythonpath
                else f"{PROJECT_ROOT}{os.pathsep}{existing_pythonpath}"
            )
            self.logs.append(f"[SYSTEM] Worker cwd: {working_directory}")
            self.process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                cwd=str(working_directory),
                env=env
            )

            if self.process.stdin is None:
                raise RuntimeError("AntiGravity subprocess stdin is unavailable.")

            self.process.stdin.write(json.dumps(task_data) + "\n")
            self.process.stdin.flush()

            self.thread = threading.Thread(target=self._read_output, daemon=True)
            self.thread.start()

        except Exception as e:
            self.status = "blocked"
            self.logs.append(f"[SYSTEM ERROR] Failed to start subprocess: {str(e)}")

    def get_status(self) -> str:
        return self.status

    def get_logs(self) -> list[str]:
        return self.logs

    def get_progress(self) -> int:
        return self.progress

    def _read_output(self):
        """Background thread reading process output line-by-line."""
        if self.process is None or self.process.stdout is None:
            self.status = "blocked"
            self.logs.append("[SYSTEM ERROR] AntiGravity subprocess stdout is unavailable.")
            return

        conn = get_db_connection()
        try:
            for line in self.process.stdout:
                line = line.strip()
                if not line:
                    continue

                # Check for progress tags
                if line.startswith("[PROGRESS]"):
                    try:
                        self.progress = int(line[10:].replace("%", "").strip())
                    except ValueError:
                        pass
                    self.logs.append(line)
                elif line.startswith("[RESULT]"):
                    # Task finished
                    self.progress = 90
                    self.status = "review"
                    self.logs.append(line)
                else:
                    self.logs.append(line)

                # Update SQLite database in real-time
                if self.project_id:
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE agents SET progress = ?, logs = ?, status = ? WHERE project_id = ? AND name = 'AntiGravity'",
                        (self.progress, json.dumps(self.logs), self.status, self.project_id)
                    )
                    cursor.execute(
                        "UPDATE tasks SET progress = ? WHERE project_id = ? AND id = ?",
                        (self.progress, self.project_id, self.current_task)
                    )
                    conn.commit()

            # Read stderr if any
            stderr_output = self.process.stderr.read() if self.process.stderr else ""
            if stderr_output and self.project_id:
                self.logs.append(f"[STDERR] {stderr_output.strip()}")
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE agents SET logs = ? WHERE project_id = ? AND name = 'AntiGravity'",
                    (json.dumps(self.logs), self.project_id)
                )
                conn.commit()

        except Exception as e:
            print("Error in AntiGravity reader thread:", e)
        finally:
            conn.close()
