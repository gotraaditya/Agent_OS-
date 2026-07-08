import json
import os
import shutil
import subprocess
import threading
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

from backend.app.agents.base import AgentAdapter


@dataclass
class CodexRunResult:
    final_response: str


class CodexClient(Protocol):
    def run(self, prompt: str, cwd: str, sandbox: str) -> CodexRunResult:
        ...


class LocalCodexSDKClient:
    """Thin wrapper around the optional local Codex Python SDK."""

    def run(self, prompt: str, cwd: str, sandbox: str) -> CodexRunResult:
        try:
            from openai_codex import Codex, Sandbox
        except ImportError as exc:
            raise RuntimeError(
                "The openai-codex Python SDK is not installed. Install it or ensure the Codex CLI fallback is available."
            ) from exc

        sandbox_value = {
            "read-only": Sandbox.read_only,
            "workspace-write": Sandbox.workspace_write,
            "danger-full-access": Sandbox.full_access,
        }[sandbox]

        previous_cwd = os.getcwd()
        try:
            os.chdir(cwd)
            with Codex() as codex:
                thread = codex.thread_start(sandbox=sandbox_value)
                result = thread.run(prompt)
                return CodexRunResult(final_response=getattr(result, "final_response", str(result)))
        finally:
            os.chdir(previous_cwd)


class CodexExecFallbackClient:
    """Fallback for systems with Codex CLI installed but without the Python SDK."""

    def run(self, prompt: str, cwd: str, sandbox: str) -> CodexRunResult:
        if shutil.which("codex") is None:
            raise RuntimeError("Neither openai-codex SDK nor the codex CLI is available.")

        timeout_seconds = int(os.environ.get("AI_TEAM_CODEX_TIMEOUT_SECONDS", "300"))
        cmd = [
            "codex",
            "-a",
            "never",
            "exec",
            "--json",
            "--color",
            "never",
            "--sandbox",
            sandbox,
            "-",
        ]
        process = subprocess.Popen(
            cmd,
            cwd=cwd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        try:
            stdout, stderr = process.communicate(input=prompt, timeout=timeout_seconds)
        except subprocess.TimeoutExpired as exc:
            process.kill()
            stdout, stderr = process.communicate()
            stdout = stdout or ""
            stderr = stderr or ""
            output_tail = "\n".join(
                part.strip()
                for part in [stderr, stdout]
                if part and part.strip()
            )[-1200:]
            details = f" Last output: {output_tail}" if output_tail else ""
            raise RuntimeError(f"codex exec timed out after {timeout_seconds} seconds.{details}") from exc

        stdout = stdout or ""
        stderr = stderr or ""
        if process.returncode != 0:
            raise RuntimeError(stderr.strip() or f"codex exec exited with {process.returncode}")
        if not stdout.strip():
            raise RuntimeError("codex exec returned no JSON output.")

        final_response = ""
        for line in stdout.splitlines():
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("type") == "item.completed":
                item = event.get("item") or {}
                if item.get("type") == "agent_message":
                    final_response = item.get("text") or final_response
            elif event.get("type") == "turn.completed" and not final_response:
                final_response = "Codex task completed."

        return CodexRunResult(final_response=final_response or stdout.strip())


class AutoCodexClient:
    def __init__(self):
        self.sdk_client = LocalCodexSDKClient()
        self.cli_client = CodexExecFallbackClient()

    def run(self, prompt: str, cwd: str, sandbox: str) -> CodexRunResult:
        try:
            return self.sdk_client.run(prompt, cwd, sandbox)
        except RuntimeError as sdk_error:
            try:
                return self.cli_client.run(prompt, cwd, sandbox)
            except RuntimeError as cli_error:
                raise RuntimeError(f"{sdk_error} CLI fallback failed: {cli_error}") from cli_error


def get_git_diff(project_path: str) -> str:
    diff_parts: list[str] = []
    result = subprocess.run(
        ["git", "diff", "--", "."],
        cwd=project_path,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or "Failed to capture git diff.")
    if result.stdout:
        diff_parts.append(result.stdout.rstrip())

    untracked = subprocess.run(
        ["git", "ls-files", "--others", "--exclude-standard"],
        cwd=project_path,
        text=True,
        capture_output=True,
        check=False,
    )
    if untracked.returncode != 0:
        raise RuntimeError(untracked.stderr.strip() or "Failed to list untracked files.")

    for rel_path in [line.strip() for line in untracked.stdout.splitlines() if line.strip()]:
        file_path = Path(project_path) / rel_path
        if not file_path.is_file():
            continue
        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            content = ""
        added_lines = "\n".join(f"+{line}" for line in content.splitlines())
        diff_parts.append(
            "\n".join([
                f"diff --git a/{rel_path} b/{rel_path}",
                "new file mode 100644",
                "index 0000000..0000000",
                "--- /dev/null",
                f"+++ b/{rel_path}",
                "@@ -0,0 +1 @@",
                added_lines or "+",
            ])
        )

    return "\n".join(part for part in diff_parts if part).strip() + ("\n" if diff_parts else "")


def parse_git_diff(diff_text: str) -> list[dict]:
    entries: list[dict] = []
    current_path: str | None = None
    current_lines: list[str] = []
    current_status = "modified"

    def flush() -> None:
        nonlocal current_path, current_lines, current_status
        if current_path and current_lines:
            entries.append({
                "file_path": current_path,
                "change_type": current_status,
                "diff_content": "\n".join(current_lines).rstrip() + "\n",
            })
        current_path = None
        current_lines = []
        current_status = "modified"

    for line in diff_text.splitlines():
        if line.startswith("diff --git "):
            flush()
            parts = line.split(" b/", 1)
            current_path = parts[1] if len(parts) == 2 else line.rsplit(" ", 1)[-1].removeprefix("b/")
            current_lines = [line]
            current_status = "modified"
            continue

        if current_path is None:
            continue

        if line.startswith("new file mode"):
            current_status = "added"
        elif line.startswith("deleted file mode"):
            current_status = "deleted"
        current_lines.append(line)

    flush()
    return entries


def filter_diff_entries_since_baseline(current_entries: list[dict], baseline_entries: list[dict]) -> list[dict]:
    baseline_by_path = {
        entry["file_path"]: entry["diff_content"]
        for entry in baseline_entries
    }
    return [
        entry
        for entry in current_entries
        if baseline_by_path.get(entry["file_path"]) != entry["diff_content"]
    ]


def build_worker_prompt(task_id: str, title: str, description: str, expected_output: str, related_files: list[str]) -> str:
    files = ", ".join(related_files) if related_files else "No files were preselected."
    return (
        f"You are Codex Worker running inside AI Team Manager.\n"
        f"Task ID: {task_id}\n"
        f"Title: {title}\n"
        f"Description: {description or 'No additional description provided.'}\n"
        f"Expected output: {expected_output or 'Implement the requested change safely.'}\n"
        f"Related files: {files}\n\n"
        "Implement the smallest correct change in this workspace. "
        "Do not commit, branch, push, or open a pull request. "
        "Leave your changes as an uncommitted git diff and summarize what changed."
    )


def build_review_prompt(task_id: str, title: str, diff_text: str) -> str:
    return (
        f"You are Codex reviewing task {task_id}: {title}.\n"
        "Review the following uncommitted diff. Do not edit files.\n"
        "Start your response with exactly APPROVED or CHANGES_REQUESTED, then provide concise feedback.\n\n"
        f"{diff_text or 'No diff was produced.'}"
    )


class RealCodexAdapter(AgentAdapter):
    def __init__(self, project_path: str | None, client: CodexClient | None = None):
        self.project_path = project_path
        self.client = client or AutoCodexClient()
        self.status = "idle"
        self.progress = 0
        self.logs: list[str] = []
        self.current_task: str | None = None
        self.thread: threading.Thread | None = None
        self.final_response = ""
        self.diff_text = ""
        self.diff_entries: list[dict] = []
        self.error: str | None = None

    def start(self) -> None:
        self.status = "idle"
        self.progress = 0
        self.logs = ["[SYSTEM] Codex SDK worker adapter online."]

    def stop(self) -> None:
        self.status = "offline"
        self.logs.append("[SYSTEM] Codex SDK worker adapter stopped.")

    def send_task(self, task_id: str, title: str, description: str, expected_output: str, related_files: list[str]) -> None:
        self.current_task = task_id
        self.status = "working"
        self.progress = 0
        self.final_response = ""
        self.diff_text = ""
        self.diff_entries = []
        self.error = None
        self.logs = [
            f"[SYSTEM] Dispatching {task_id} to Codex Worker.",
            "[SYSTEM] Sandbox: danger-full-access.",
        ]
        self.thread = threading.Thread(
            target=self._run_task,
            args=(task_id, title, description, expected_output, related_files),
            daemon=True,
        )
        self.thread.start()

    def _resolve_project_path(self) -> str:
        if not self.project_path:
            raise RuntimeError("Project path is not configured for Codex Worker.")
        path = Path(self.project_path)
        if not path.is_dir():
            raise RuntimeError(f"Project path does not exist: {self.project_path}")
        return str(path.resolve())

    def _run_task(self, task_id: str, title: str, description: str, expected_output: str, related_files: list[str]) -> None:
        try:
            project_path = self._resolve_project_path()
            self.progress = 10
            self.logs.append(f"[SYSTEM] Worker cwd: {project_path}")
            self.logs.append("[CODEX] Starting implementation run.")
            baseline_entries = parse_git_diff(get_git_diff(project_path))
            prompt = build_worker_prompt(task_id, title, description, expected_output, related_files)
            result = self.client.run(prompt, project_path, "danger-full-access")
            self.final_response = result.final_response
            self.progress = 85
            self.logs.append(f"[CODEX] Final response: {self.final_response}")
            self.diff_text = get_git_diff(project_path)
            self.diff_entries = filter_diff_entries_since_baseline(parse_git_diff(self.diff_text), baseline_entries)
            self.logs.append(f"[GIT] Captured {len(self.diff_entries)} changed file(s).")
            self.progress = 90
            self.status = "review"
        except Exception as exc:
            self.error = str(exc)
            self.status = "blocked"
            self.logs.append(f"[SYSTEM ERROR] {self.error}")

    def review_task(self, task_id: str, title: str, diff_text: str) -> dict:
        project_path = self._resolve_project_path()
        self.logs.append(f"[REVIEW] Starting Codex reviewer pass for {task_id}.")
        result = self.client.run(build_review_prompt(task_id, title, diff_text), project_path, "read-only")
        feedback = result.final_response.strip() or "No review feedback returned."
        first_line = feedback.splitlines()[0].strip().upper() if feedback else ""
        status = "changes_requested" if first_line.startswith("CHANGES_REQUESTED") else "approved"
        self.logs.append(f"[REVIEW] Codex reviewer result: {status}.")
        return {"status": status, "feedback": feedback}

    def get_status(self) -> str:
        return self.status

    def get_logs(self) -> list[str]:
        return self.logs

    def get_progress(self) -> int:
        return self.progress
