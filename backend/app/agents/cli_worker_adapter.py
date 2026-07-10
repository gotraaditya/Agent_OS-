import os
import shlex
import shutil
import subprocess
import threading
from pathlib import Path

from backend.app.agents.base import AgentAdapter, AgentRunResult, AgentTaskPackage, resolve_existing_workspace
from backend.app.agents.real_codex_adapter import (
    filter_diff_entries_since_baseline,
    get_git_diff,
    parse_git_diff,
)


CLI_AGENT_DEFAULT_COMMANDS = {
    "OpenCode": "opencode",
    "Blackbox": "blackbox",
    "Kilocode": "kilocode",
    "Mimo Code": "mimo",
}

ALLOWED_EXECUTABLES = {
    "opencode",
    "opencode.exe",
    "opencode.cmd",
    "opencode.ps1",
    "blackbox",
    "blackbox.exe",
    "blackbox.cmd",
    "blackbox.ps1",
    "kilocode",
    "kilocode.exe",
    "kilocode.cmd",
    "kilocode.ps1",
    "kilo",
    "kilo.exe",
    "kilo.cmd",
    "kilo.ps1",
    "mimo",
    "mimo.exe",
    "mimo.cmd",
    "mimo.ps1",
}


class CLIWorkerAdapter(AgentAdapter):
    adapter_kind = "CLI"
    supports_workspace_execution = True
    supports_file_modification = True
    supports_streaming = False
    supports_task_resume = False

    def __init__(self, agent_name: str, launch_command: str | None, project_path: str | None):
        self.agent_name = agent_name
        self.launch_command = launch_command or CLI_AGENT_DEFAULT_COMMANDS.get(agent_name, "")
        self.project_path = project_path
        self.thread: threading.Thread | None = None
        self.status = "idle"
        self.progress = 0
        self.logs: list[str] = []
        self.current_task: str | None = None
        self.error: str | None = None
        self.final_response = ""
        self.diff_entries: list[dict] = []
        self.task_package: AgentTaskPackage | None = None

    def start(self) -> None:
        self.status = "idle"
        self.progress = 0
        self.logs = [f"[SYSTEM] {self.agent_name} CLI adapter online."]

    def stop(self) -> None:
        self.status = "offline"

    def _base_command(self) -> list[str]:
        parts = [part.strip("\"'") for part in shlex.split(self.launch_command, posix=False)]
        if not parts:
            raise RuntimeError(f"{self.agent_name} launch command is empty.")
        executable_name = Path(parts[0]).name.lower()
        if executable_name not in ALLOWED_EXECUTABLES:
            raise RuntimeError(f"Unsupported {self.agent_name} executable: {parts[0]}")
        resolved = shutil.which(parts[0])
        if resolved is None and not Path(parts[0]).exists():
            raise RuntimeError(f"{self.agent_name} CLI is not installed or not on PATH: {parts[0]}")
        return [resolved or parts[0], *parts[1:]]

    def _wrap_platform_command(self, cmd: list[str]) -> list[str]:
        executable = Path(cmd[0])
        if executable.suffix.lower() == ".ps1":
            return [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(executable),
                *cmd[1:],
            ]
        return cmd

    def _build_prompt(self, task_package: AgentTaskPackage) -> str:
        return (
            f"You are {self.agent_name}, a worker inside AI Team Manager.\n"
            f"Task package:\n{task_package.to_dict()}\n\n"
            "Work only inside the current project directory. "
            "Do not commit, branch, push, or open a pull request. "
            "Leave your edits as an uncommitted git diff and summarize the result."
        )

    def _build_command(self, prompt: str) -> list[str]:
        base = self._base_command()
        if self.agent_name == "Blackbox":
            return [*base, "--prompt", prompt, "--yolo", "--skip-update"]
        if self.agent_name == "Mimo Code":
            return [*base, "run", prompt, "--trust", "--never-ask"]
        if self.agent_name == "Kilocode":
            return [*base, "run", prompt]
        if self.agent_name == "OpenCode":
            return [*base, "run", prompt]
        raise RuntimeError(f"No non-interactive command builder for {self.agent_name}.")

    def send_task(self, task_id: str, title: str, description: str, expected_output: str, related_files: list[str]) -> None:
        project_path = str(resolve_existing_workspace(self.project_path))
        self.task_package = AgentTaskPackage(
            task_id=task_id,
            title=title,
            description=description,
            assigned_agent=self.agent_name,
            project_id=getattr(self, "project_id", ""),
            project_path=project_path,
            related_files=related_files,
            constraints=[
                "Work only inside the selected project workspace.",
                "Do not commit, branch, push, or open a pull request.",
                "Leave code changes as an uncommitted diff for Codex review.",
            ],
            expected_output=expected_output,
        )
        self.current_task = task_id
        self.status = "working"
        self.progress = 5
        self.error = None
        self.final_response = ""
        self.diff_entries = []
        self.logs = [f"[SYSTEM] Dispatching {task_id} to {self.agent_name} CLI."]
        self.thread = threading.Thread(target=self._run_task, args=(project_path,), daemon=True)
        self.thread.start()

    def _run_task(self, project_path: str) -> None:
        try:
            if self.task_package is None:
                raise RuntimeError("Task package is missing.")
            baseline_entries = parse_git_diff(get_git_diff(project_path))
            prompt = self._build_prompt(self.task_package)
            cmd = self._wrap_platform_command(self._build_command(prompt))
            timeout_seconds = int(os.environ.get("AI_TEAM_GENERIC_CLI_TIMEOUT_SECONDS", "600"))
            self.logs.append(f"[SYSTEM] Worker cwd: {project_path}")
            self.logs.append(f"[SYSTEM] Running {Path(cmd[0]).name} non-interactively.")
            self.progress = 20
            process = subprocess.Popen(
                cmd,
                cwd=project_path,
                stdin=subprocess.DEVNULL,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            try:
                stdout, stderr = process.communicate(timeout=timeout_seconds)
            except subprocess.TimeoutExpired as exc:
                process.kill()
                stdout, stderr = process.communicate()
                raise RuntimeError(f"{self.agent_name} CLI timed out after {timeout_seconds} seconds.") from exc

            stdout = stdout or ""
            stderr = stderr or ""
            if stdout.strip():
                self.logs.extend(f"[STDOUT] {line}" for line in stdout.strip().splitlines())
            if stderr.strip():
                self.logs.extend(f"[STDERR] {line}" for line in stderr.strip().splitlines())
            if process.returncode != 0:
                raise RuntimeError(stderr.strip() or stdout.strip() or f"{self.agent_name} CLI exited with {process.returncode}")

            self.final_response = stdout.strip() or f"{self.agent_name} CLI completed."
            self.progress = 85
            current_entries = parse_git_diff(get_git_diff(project_path))
            self.diff_entries = filter_diff_entries_since_baseline(current_entries, baseline_entries)
            self.logs.append(f"[GIT] Captured {len(self.diff_entries)} changed file(s).")
            if not self.diff_entries:
                raise RuntimeError(f"{self.agent_name} CLI completed but did not change any files.")
            self.progress = 90
            self.status = "review"
        except Exception as exc:
            self.error = str(exc)
            self.status = "blocked"
            self.logs.append(f"[SYSTEM ERROR] {self.error}")

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
            agent_id=self.agent_name,
            task_id=self.current_task,
            status="completed" if self.status == "review" else self.status,
            summary=self.final_response or self.error or f"{self.agent_name} has not produced a result yet.",
            files_changed=[entry["file_path"] for entry in self.diff_entries],
            errors=[self.error] if self.error else [],
        )
