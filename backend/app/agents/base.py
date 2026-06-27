from abc import ABC, abstractmethod

class AgentAdapter(ABC):
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
