import json
import os
import shlex
import subprocess
import threading
from pathlib import Path

from backend.app.database import get_db_connection
from backend.app.agents.base import AgentAdapter, AgentRunResult, AgentTaskPackage, resolve_existing_workspace
from backend.app.agents.real_codex_adapter import (
    filter_diff_entries_since_baseline,
    get_git_diff,
    parse_git_diff,
)


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_ANTIGRAVITY_LAUNCH_COMMAND = "python -m agents.antigravity"
ALLOWED_PYTHON_EXECUTABLES = {"python", "python.exe", "py", "py.exe"}
ALLOWED_MODULES = {"agents.antigravity"}
ALLOWED_ANTIGRAVITY_EXECUTABLES = {"agy", "agy.exe"}
AGY_PROMPT_FLAGS = {"--print", "-p", "--prompt"}


class AntiGravityAdapter(AgentAdapter):
    adapter_kind = "CLI"
    supports_workspace_execution = True
    supports_file_modification = True
    supports_streaming = True
    supports_task_resume = False

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
        self.diff_entries: list[dict] = []
        self.error: str | None = None
        self._baseline_entries: list[dict] = []
        self.task_package: AgentTaskPackage | None = None

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
        if executable_name in ALLOWED_ANTIGRAVITY_EXECUTABLES:
            return parts

        if executable_name not in ALLOWED_PYTHON_EXECUTABLES:
            raise ValueError(f"Unsupported AntiGravity executable: {parts[0]}")

        if len(parts) != 3 or parts[1] != "-m" or parts[2] not in ALLOWED_MODULES:
            raise ValueError(
                "Unsupported AntiGravity command. Expected 'python -m agents.antigravity'."
            )

        return parts

    def _is_real_agy_command(self, cmd: list[str]) -> bool:
        return bool(cmd) and Path(cmd[0]).name.lower() in ALLOWED_ANTIGRAVITY_EXECUTABLES

    def _build_agy_command(self, cmd: list[str], prompt: str) -> list[str]:
        if any(part in AGY_PROMPT_FLAGS for part in cmd[1:]):
            return [*cmd, prompt]
        return [*cmd, "--print", prompt]

    def _resolve_working_directory(self) -> Path:
        try:
            return resolve_existing_workspace(self.project_path)
        except RuntimeError as exc:
            raise RuntimeError(str(exc).replace("Project path", "Project path for AntiGravity")) from exc

    def _build_prompt(
        self,
        task_id: str,
        title: str,
        description: str,
        expected_output: str,
        related_files: list[str],
        task_package: dict | None = None,
    ) -> str:
        files = ", ".join(related_files) if related_files else "No files were preselected."
        package_text = f"\nStructured task package:\n{json.dumps(task_package, indent=2)}\n" if task_package else ""
        return (
            "You are AntiGravity running as a worker inside AI Team Manager.\n"
            f"Task ID: {task_id}\n"
            f"Title: {title}\n"
            f"Description: {description or 'No additional description provided.'}\n"
            f"Expected output: {expected_output or 'Implement the requested change safely.'}\n"
            f"Related files: {files}\n"
            f"{package_text}\n"
            "Implement the requested change in this workspace. "
            "Do not commit, branch, push, or open a pull request. "
            "Leave your changes as an uncommitted git diff and summarize what changed."
        )

    def _build_stdin_payload(self, task_id: str, title: str, description: str, expected_output: str, related_files: list[str]) -> str:
        task_data = self.task_package.to_dict() if self.task_package else {
            "task_id": task_id,
            "title": title,
            "description": description,
            "expected_output": expected_output,
            "related_files": related_files
        }
        if self.task_package:
            task_data.update({
                "task_id": self.task_package.task_id,
                "expected_output": self.task_package.expected_output,
                "related_files": self.task_package.related_files,
            })
        return json.dumps(task_data) + "\n"

    def _capture_baseline(self, working_directory: Path) -> None:
        self._baseline_entries = []
        try:
            self._baseline_entries = parse_git_diff(get_git_diff(str(working_directory)))
        except Exception as exc:
            self.logs.append(f"[GIT WARN] Could not capture baseline diff: {str(exc)}")

    def _capture_task_diff(self, working_directory: Path) -> None:
        self.diff_entries = []
        try:
            current_entries = parse_git_diff(get_git_diff(str(working_directory)))
            self.diff_entries = filter_diff_entries_since_baseline(current_entries, self._baseline_entries)
            self.logs.append(f"[GIT] Captured {len(self.diff_entries)} changed file(s).")
        except Exception as exc:
            self.logs.append(f"[GIT WARN] Could not capture task diff: {str(exc)}")

    def send_task(self, task_id: str, title: str, description: str, expected_output: str, related_files: list[str]) -> None:
        self.current_task = task_id
        self.status = "working"
        self.progress = 0
        self.diff_entries = []
        self.error = None
        self._baseline_entries = []
        self.logs = [f"[SYSTEM] Dispatching task {task_id} to AntiGravity worker CLI..."]

        try:
            cmd = self._build_command()
            working_directory = self._resolve_working_directory()
            self.task_package = AgentTaskPackage(
                task_id=task_id,
                title=title,
                description=description,
                assigned_agent="AntiGravity",
                project_id=self.project_id or "",
                project_path=str(working_directory),
                related_files=related_files,
                constraints=[
                    "Work only inside the selected project workspace.",
                    "Do not commit, branch, push, or open a pull request.",
                    "Leave code changes as an uncommitted diff for Codex review.",
                ],
                expected_output=expected_output,
            )
            prompt = self._build_prompt(
                task_id,
                title,
                description,
                expected_output,
                related_files,
                self.task_package.to_dict(),
            )
            is_real_agy = self._is_real_agy_command(cmd)
            if is_real_agy:
                cmd = self._build_agy_command(cmd, prompt)
            self._capture_baseline(working_directory)
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
                stdin=subprocess.DEVNULL if is_real_agy else subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                bufsize=1,
                cwd=str(working_directory),
                env=env
            )

            if is_real_agy:
                self.logs.append("[SYSTEM] Running real Antigravity CLI in --print mode.")
            elif self.process.stdin is None:
                raise RuntimeError("AntiGravity subprocess stdin is unavailable.")
            else:
                self.process.stdin.write(self._build_stdin_payload(task_id, title, description, expected_output, related_files))
                self.process.stdin.flush()
                self.process.stdin.close()

            self.thread = threading.Thread(target=self._read_output, args=(working_directory,), daemon=True)
            self.thread.start()

        except Exception as e:
            self.error = str(e)
            self.status = "blocked"
            self.logs.append(f"[SYSTEM ERROR] Failed to start subprocess: {str(e)}")

    def get_status(self) -> str:
        return self.status

    def get_logs(self) -> list[str]:
        return self.logs

    def get_progress(self) -> int:
        return self.progress

    def capture_error(self) -> str | None:
        return self.error

    def capture_result(self) -> AgentRunResult | None:
        if not self.current_task:
            return None
        return AgentRunResult(
            agent_id="AntiGravity",
            task_id=self.current_task,
            status="completed" if self.status == "review" else self.status,
            summary=self.logs[-1] if self.logs else "AntiGravity has not produced a result yet.",
            files_changed=[entry["file_path"] for entry in self.diff_entries],
            errors=[self.error] if self.error else [],
        )

    def _read_output(self, working_directory: Path):
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

            return_code = self.process.wait(timeout=5)

            # Read stderr if any
            stderr_output = self.process.stderr.read() if self.process.stderr else ""
            if stderr_output:
                self.logs.append(f"[STDERR] {stderr_output.strip()}")

            if return_code != 0:
                self.error = stderr_output.strip() or f"AntiGravity CLI exited with code {return_code}"
                self.status = "blocked"
                self.logs.append(f"[SYSTEM ERROR] {self.error}")
            elif self.status == "working":
                self.progress = max(self.progress, 90)
                self.status = "review"
                self.logs.append("[RESULT] AntiGravity CLI completed without an explicit result marker.")

            if self.status == "review":
                self._capture_task_diff(working_directory)

            if self.project_id:
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE agents SET progress = ?, logs = ?, status = ? WHERE project_id = ? AND name = 'AntiGravity'",
                    (self.progress, json.dumps(self.logs), self.status, self.project_id)
                )
                cursor.execute(
                    "UPDATE tasks SET progress = ?, status = ? WHERE project_id = ? AND id = ?",
                    (self.progress, self.status if self.status == "blocked" else "working", self.project_id, self.current_task)
                )
                conn.commit()

        except Exception as e:
            self.error = str(e)
            self.status = "blocked"
            self.logs.append(f"[SYSTEM ERROR] Error in AntiGravity reader thread: {self.error}")
        finally:
            conn.close()
