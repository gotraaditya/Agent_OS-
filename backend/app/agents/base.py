from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class AgentTaskPackage:
    task_id: str
    title: str
    description: str
    assigned_agent: str
    project_id: str
    project_path: str
    related_files: list[str] = field(default_factory=list)
    relevant_docs: list[str] = field(default_factory=list)
    constraints: list[str] = field(default_factory=list)
    expected_output: str = ""
    do_not_change: list[str] = field(default_factory=list)
    branch: str = ""
    report_instructions: str = (
        "Stream progress to the adapter logs, leave edits as an uncommitted diff, "
        "and submit the final result for Codex review."
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "taskId": self.task_id,
            "title": self.title,
            "description": self.description,
            "assignedAgent": self.assigned_agent,
            "projectId": self.project_id,
            "projectPath": self.project_path,
            "relatedFiles": self.related_files,
            "relevantDocs": self.relevant_docs,
            "constraints": self.constraints,
            "expectedOutput": self.expected_output,
            "doNotChange": self.do_not_change,
            "branch": self.branch,
            "reportInstructions": self.report_instructions,
        }


@dataclass
class AgentRunResult:
    agent_id: str
    task_id: str
    status: str
    summary: str
    files_changed: list[str] = field(default_factory=list)
    tests_run: list[str] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    raw_output_path: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "agentId": self.agent_id,
            "taskId": self.task_id,
            "status": self.status,
            "summary": self.summary,
            "filesChanged": self.files_changed,
            "testsRun": self.tests_run,
            "errors": self.errors,
            "rawOutputPath": self.raw_output_path,
        }

class AgentAdapter(ABC):
    adapter_kind = "Manual"
    supports_workspace_execution = False
    supports_file_modification = False
    supports_streaming = False
    supports_task_resume = False

    @abstractmethod
    def start(self) -> None:
        """Start the agent subprocess or connection."""
        pass

    @abstractmethod
    def stop(self) -> None:
        """Stop the agent subprocess or connection."""
        pass

    @abstractmethod
    def send_task(self, task_id: str, title: str, description: str, expected_output: str, related_files: list[str]) -> None:
        """Transmit task instructions to the agent adapter."""
        pass

    def send_task_package(self, task_package: AgentTaskPackage) -> None:
        """Transmit a structured task package to the adapter."""
        self.send_task(
            task_package.task_id,
            task_package.title,
            task_package.description,
            task_package.expected_output,
            task_package.related_files,
        )

    @abstractmethod
    def get_status(self) -> str:
        """Query agent status (e.g. idle, working, blocked)."""
        pass

    @abstractmethod
    def get_logs(self) -> list[str]:
        """Fetch accumulated agent stdout/stderr logs."""
        pass

    @abstractmethod
    def get_progress(self) -> int:
        """Fetch current task completion percentage."""
        pass

    def stream_output(self) -> list[str]:
        return self.get_logs()

    def capture_result(self) -> AgentRunResult | None:
        return None

    def capture_error(self) -> str | None:
        return None

    def submit_result(self) -> AgentRunResult | None:
        return self.capture_result()

    def health_check(self) -> dict[str, Any]:
        return {
            "status": self.get_status(),
            "adapterKind": self.adapter_kind,
            "supportsWorkspaceExecution": self.supports_workspace_execution,
            "supportsFileModification": self.supports_file_modification,
            "supportsStreaming": self.supports_streaming,
            "supportsTaskResume": self.supports_task_resume,
        }


def resolve_existing_workspace(project_path: str | None) -> Path:
    if not project_path:
        raise RuntimeError("Project path is not configured.")
    path = Path(project_path)
    if not path.is_dir():
        raise RuntimeError(f"Project path does not exist: {project_path}")
    return path.resolve()
