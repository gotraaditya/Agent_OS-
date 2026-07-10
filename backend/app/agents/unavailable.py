from typing import Any

from backend.app.agents.base import AgentAdapter, AgentRunResult, AgentTaskPackage


class UnavailableAgentAdapter(AgentAdapter):
    adapter_kind = "Unavailable"

    def __init__(self, agent_name: str, reason: str):
        self.agent_name = agent_name
        self.reason = reason
        self.status = "blocked"
        self.progress = 0
        self.current_task: str | None = None
        self.logs = [
            f"[UNAVAILABLE] {agent_name} adapter is not available.",
            f"[UNAVAILABLE] {reason}",
        ]

    def start(self) -> None:
        self.status = "blocked"

    def stop(self) -> None:
        self.status = "offline"

    def send_task(self, task_id: str, title: str, description: str, expected_output: str, related_files: list[str]) -> None:
        self.current_task = task_id
        self.status = "blocked"
        self.progress = 0
        self.logs.append(f"[BLOCKED] Cannot execute task {task_id}: {self.reason}")

    def send_task_package(self, task_package: AgentTaskPackage) -> None:
        self.send_task(
            task_package.task_id,
            task_package.title,
            task_package.description,
            task_package.expected_output,
            task_package.related_files,
        )

    def get_status(self) -> str:
        return self.status

    def get_logs(self) -> list[str]:
        return self.logs

    def get_progress(self) -> int:
        return self.progress

    def capture_error(self) -> str | None:
        return self.reason

    def capture_result(self) -> AgentRunResult:
        return AgentRunResult(
            agent_id=self.agent_name,
            task_id=self.current_task or "",
            status="blocked",
            summary=self.reason,
            errors=[self.reason],
        )

    def health_check(self) -> dict[str, Any]:
        base = super().health_check()
        base["reason"] = self.reason
        return base
