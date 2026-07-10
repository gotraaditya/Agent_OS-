from backend.app.agents.base import AgentAdapter, AgentRunResult

class MockAgentAdapter(AgentAdapter):
    adapter_kind = "Mock"
    supports_workspace_execution = False
    supports_file_modification = False
    supports_streaming = True
    supports_task_resume = False

    def __init__(self, agent_name: str):
        self.agent_name = agent_name
        self.status = "idle"
        self.progress = 0
        self.logs = []
        self.current_task = None
        self.step = 0

    def start(self) -> None:
        self.status = "idle"
        self.progress = 0
        self.logs = [f"[SYSTEM] Agent adapter for {self.agent_name} initialized and standing by."]
        self.step = 0

    def stop(self) -> None:
        self.status = "offline"
        self.logs.append(f"[SYSTEM] Agent adapter for {self.agent_name} stopped.")

    def send_task(self, task_id: str, title: str, description: str, expected_output: str, related_files: list[str]) -> None:
        self.current_task = task_id
        self.status = "working"
        self.progress = 0
        self.step = 0
        self.logs = [
            f"[INFO] Initializing task environment for {task_id}: {title}...",
            f"[INFO] Target files: {', '.join(related_files) if related_files else 'None'}",
            f"[INFO] Expected output constraint: {expected_output}"
        ]

    def get_status(self) -> str:
        return self.status

    def get_logs(self) -> list[str]:
        return self.logs

    def get_progress(self) -> int:
        return self.progress

    def capture_result(self) -> AgentRunResult | None:
        if self.current_task is None:
            return None
        return AgentRunResult(
            agent_id=self.agent_name,
            task_id=self.current_task,
            status="completed" if self.status == "idle" and self.progress >= 90 else self.status,
            summary="Mock adapter simulation completed. This is not a verified real worker run.",
            errors=[],
        )

    def update_simulation_step(self) -> bool:
        """
        Run one step of the task simulation.
        Returns True if the task has completed and moved to review.
        """
        if self.status != "working":
            return False

        self.step += 1
        
        if self.step == 1:
            self.progress = 15
            self.logs.append(f"[LOAD] Reading workspace structure and parsing dependencies...")
            self.logs.append(f"[LOAD] Loaded task context: {self.agent_name} focusing on relevant code nodes.")
        elif self.step == 2:
            self.progress = 40
            self.logs.append(f"[RUN] Implementing requested feature modifications...")
            self.logs.append(f"[BUILD] Writing test cases and coverage targets...")
        elif self.step == 3:
            self.progress = 75
            self.logs.append(f"[TEST] Running tests suite (pytest)...")
            self.logs.append(f"[SUCCESS] Test coverage at 94.2%. Found 0 syntax errors, 0 warnings.")
        elif self.step >= 4:
            self.progress = 90
            self.status = "idle"
            self.logs.append(f"[SUCCESS] Task {self.current_task} execution successfully completed.")
            self.logs.append(f"[SUBMIT] Transmitting file diffs and reports back to Codex review queue.")
            return True # Completed!

        return False
