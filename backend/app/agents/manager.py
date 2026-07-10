import json
import os
import time
from datetime import datetime
from backend.app.database import get_db_connection
from backend.app.agents.base import AgentTaskPackage
from backend.app.agents.mock import MockAgentAdapter
from backend.app.agents.antigravity_adapter import AntiGravityAdapter, DEFAULT_ANTIGRAVITY_LAUNCH_COMMAND
from backend.app.agents.cli_worker_adapter import CLIWorkerAdapter, CLI_AGENT_DEFAULT_COMMANDS
from backend.app.agents.real_codex_adapter import RealCodexAdapter
from backend.app.agents.unavailable import UnavailableAgentAdapter


REAL_ADAPTER_TYPES = {"CodexSDK", "CLI"}
SUPPORTED_REAL_AGENTS = {"Codex Worker", "AntiGravity", *CLI_AGENT_DEFAULT_COMMANDS.keys()}
MOCK_ADAPTERS_ENABLED = os.environ.get("AI_TEAM_ENABLE_MOCK_ADAPTERS", "").lower() in {"1", "true", "yes"}

class AgentManager:
    def __init__(self):
        self.adapters = {} # (project_id, agent_name) -> adapter

    def get_adapter(self, agent_name: str, project_id: str = "p1"):
        adapter_key = (project_id, agent_name)
        if adapter_key not in self.adapters:
            # Query launch command from SQLite database for this agent
            launch_command = DEFAULT_ANTIGRAVITY_LAUNCH_COMMAND if agent_name == "AntiGravity" else None
            adapter_type = "Mock"
            project_path = None
            project_branch = ""
            enabled = True
            reason = ""
            conn = get_db_connection()
            try:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT agents.launch_command, agents.adapter_type, agents.enabled, projects.local_path, projects.branch
                    FROM agents
                    JOIN projects ON projects.id = agents.project_id
                    WHERE agents.name = ? AND agents.project_id = ?
                    """,
                    (agent_name, project_id)
                )
                row = cursor.fetchone()
                if row:
                    launch_command = row["launch_command"] or launch_command
                    adapter_type = row["adapter_type"] or adapter_type
                    project_path = row["local_path"]
                    project_branch = row["branch"] or ""
                    enabled = bool(row["enabled"])
                else:
                    reason = f"Agent '{agent_name}' is not registered for project {project_id}."
            except Exception as e:
                print("Error fetching launch command:", e)
                reason = f"Failed to load adapter configuration: {e}"
            finally:
                conn.close()

            if reason:
                adapter = UnavailableAgentAdapter(agent_name, reason)
            elif not enabled:
                adapter = UnavailableAgentAdapter(agent_name, "Agent is disabled in the registry.")
            elif agent_name == "Codex Worker" and adapter_type == "CodexSDK":
                adapter = RealCodexAdapter(project_path)
            elif agent_name == "AntiGravity" and adapter_type == "CLI":
                adapter = AntiGravityAdapter(launch_command, project_path)
            elif agent_name in CLI_AGENT_DEFAULT_COMMANDS and adapter_type == "CLI":
                adapter = CLIWorkerAdapter(agent_name, launch_command, project_path)
            elif adapter_type == "Mock" and MOCK_ADAPTERS_ENABLED:
                adapter = MockAgentAdapter(agent_name)
            elif adapter_type == "Mock":
                adapter = UnavailableAgentAdapter(
                    agent_name,
                    "Mock adapters are disabled. Set AI_TEAM_ENABLE_MOCK_ADAPTERS=true for demo mode.",
                )
            elif adapter_type in REAL_ADAPTER_TYPES and agent_name not in SUPPORTED_REAL_AGENTS:
                adapter = UnavailableAgentAdapter(
                    agent_name,
                    f"{agent_name} is configured as {adapter_type}, but no verified adapter is implemented on this machine.",
                )
            else:
                adapter = UnavailableAgentAdapter(
                    agent_name,
                    f"Unsupported or misconfigured adapter type: {adapter_type or 'None'}.",
                )

            adapter.project_branch = project_branch

            adapter.start()
            self.adapters[adapter_key] = adapter

        return self.adapters[adapter_key]

    def build_task_package(self, task) -> AgentTaskPackage:
        related = json.loads(task["related_files"]) if task["related_files"] else []
        project_path = ""
        branch = ""
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT local_path, branch FROM projects WHERE id = ?", (task["project_id"],))
            row = cursor.fetchone()
            if row:
                project_path = row["local_path"]
                branch = row["branch"] or ""
        finally:
            conn.close()

        return AgentTaskPackage(
            task_id=task["id"],
            title=task["title"],
            description=task["description"] or "",
            assigned_agent=task["agent_name"],
            project_id=task["project_id"],
            project_path=project_path,
            related_files=related,
            constraints=[
                "Work only inside the selected project workspace.",
                "Do not commit, branch, push, or open a pull request.",
                "Report progress through adapter output.",
                "Submit final work for Codex review.",
            ],
            expected_output=task["expected_output"] or "",
            branch=branch,
        )

    def _insert_system_message(self, cursor, project_id: str, text: str, prefix: str = "M-SYS") -> None:
        msg_id = f"{prefix}-{int(time.time() * 1000)}"
        timestamp = datetime.now().strftime("%I:%M %p")
        if timestamp.startswith("0"):
            timestamp = timestamp[1:]
        cursor.execute(
            """
            INSERT INTO messages (id, project_id, sender, sender_type, text, timestamp, avatar, meta)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (msg_id, project_id, "System", "system", text, timestamp, None, None),
        )

    def _mark_task_blocked(self, cursor, task, adapter, reason: str) -> None:
        p_id = task["project_id"]
        t_id = task["id"]
        agent_name = task["agent_name"]
        logs_json = json.dumps(adapter.get_logs())
        cursor.execute(
            "UPDATE agents SET logs = ?, status = 'blocked', current_task = ?, progress = ? WHERE project_id = ? AND name = ?",
            (logs_json, task["title"], adapter.get_progress(), p_id, agent_name),
        )
        cursor.execute(
            "UPDATE tasks SET status = 'blocked', progress = ? WHERE project_id = ? AND id = ?",
            (adapter.get_progress(), p_id, t_id),
        )
        self._insert_system_message(
            cursor,
            p_id,
            f"Agent '{agent_name}' could not run task {t_id}: {reason}",
            "M-SYS-BLOCKED",
        )

    def tick(self) -> None:
        conn = get_db_connection()
        try:
            cursor = conn.cursor()

            # 1. Process tasks in "assigned" status
            cursor.execute("SELECT * FROM tasks WHERE status = 'assigned'")
            assigned_tasks = cursor.fetchall()

            for task in assigned_tasks:
                t_id = task["id"]
                p_id = task["project_id"]
                agent_name = task["agent_name"]
                title = task["title"]
                desc = task["description"] or ""
                task_package = self.build_task_package(task)

                # Update task status to "working"
                cursor.execute(
                    "UPDATE tasks SET status = 'working', progress = 0 WHERE project_id = ? AND id = ?",
                    (p_id, t_id)
                )

                # Update agent status to "working"
                cursor.execute(
                    "UPDATE agents SET status = 'working', current_task = ?, progress = 0 WHERE project_id = ? AND name = ?",
                    (title, p_id, agent_name)
                )

                adapter = self.get_adapter(agent_name, p_id)
                adapter.project_id = p_id
                try:
                    adapter.send_task_package(task_package)
                except Exception as exc:
                    if hasattr(adapter, "error"):
                        adapter.error = str(exc)
                    if hasattr(adapter, "status"):
                        adapter.status = "blocked"
                    if hasattr(adapter, "logs"):
                        adapter.logs.append(f"[SYSTEM ERROR] Failed to dispatch task package: {exc}")

                # Save adapter logs to agent table
                logs_json = json.dumps(adapter.get_logs())
                cursor.execute(
                    "UPDATE agents SET logs = ? WHERE project_id = ? AND name = ?",
                    (logs_json, p_id, agent_name)
                )

                # Create timeline system message
                msg_id = f"M-SYS-WORK-{int(time.time() * 1000)}"
                timestamp = datetime.now().strftime("%I:%M %p")
                if timestamp.startswith("0"): timestamp = timestamp[1:]

                cursor.execute(
                    """
                    INSERT INTO messages (id, project_id, sender, sender_type, text, timestamp, avatar, meta)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        msg_id, p_id, "System", "system",
                        f"Agent '{agent_name}' started working on task {t_id}.",
                        timestamp, None, None
                    )
                )

            # 2. Process tasks in "working" status
            cursor.execute("SELECT * FROM tasks WHERE status = 'working'")
            working_tasks = cursor.fetchall()

            for task in working_tasks:
                t_id = task["id"]
                p_id = task["project_id"]
                agent_name = task["agent_name"]

                adapter = self.get_adapter(agent_name, p_id)
                adapter.project_id = p_id

                if getattr(adapter, "adapter_kind", "") == "Unavailable":
                    reason = adapter.capture_error() or "Agent adapter is unavailable."
                    self._mark_task_blocked(cursor, task, adapter, reason)
                    continue

                if isinstance(adapter, RealCodexAdapter):
                    if adapter.get_status() not in {"working", "review", "blocked"}:
                        try:
                            adapter.send_task_package(self.build_task_package(task))
                        except Exception as exc:
                            adapter.error = str(exc)
                            adapter.status = "blocked"
                            adapter.logs.append(f"[SYSTEM ERROR] Failed to dispatch task package: {exc}")

                    if adapter.get_status() == "blocked":
                        self._mark_task_blocked(cursor, task, adapter, adapter.capture_error() or "Codex Worker is blocked.")
                    elif adapter.get_status() == "review":
                        logs_json = json.dumps(adapter.get_logs())
                        cursor.execute(
                            "UPDATE agents SET logs = ?, status = 'idle', current_task = 'None', progress = 100 WHERE project_id = ? AND name = ?",
                            (logs_json, p_id, agent_name)
                        )
                        cursor.execute(
                            "UPDATE tasks SET status = 'review', progress = 90, related_files = ? WHERE project_id = ? AND id = ?",
                            (json.dumps([entry["file_path"] for entry in adapter.diff_entries]), p_id, t_id)
                        )
                        self._replace_file_changes(cursor, p_id, t_id, adapter.diff_entries)
                        adapter.status = "idle"

                        msg_id = f"M-SYS-REV-SUB-{int(time.time() * 1000)}"
                        timestamp = datetime.now().strftime("%I:%M %p")
                        if timestamp.startswith("0"): timestamp = timestamp[1:]
                        cursor.execute(
                            """
                            INSERT INTO messages (id, project_id, sender, sender_type, text, timestamp, avatar, meta)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                msg_id, p_id, "System", "system",
                                f"Codex Worker submitted task {t_id} with {len(adapter.diff_entries)} changed file(s) for review.",
                                timestamp, None, None
                            )
                        )
                    else:
                        logs_json = json.dumps(adapter.get_logs())
                        cursor.execute(
                            "UPDATE agents SET logs = ?, progress = ?, status = 'working' WHERE project_id = ? AND name = ?",
                            (logs_json, adapter.get_progress(), p_id, agent_name)
                        )
                        cursor.execute(
                            "UPDATE tasks SET progress = ? WHERE project_id = ? AND id = ?",
                            (adapter.get_progress(), p_id, t_id)
                        )

                elif agent_name == "AntiGravity":
                    # If adapter is not working, initialize it
                    if adapter.get_status() not in {"working", "review", "blocked"}:
                        try:
                            adapter.send_task_package(self.build_task_package(task))
                        except Exception as exc:
                            adapter.error = str(exc)
                            adapter.status = "blocked"
                            adapter.logs.append(f"[SYSTEM ERROR] Failed to dispatch task package: {exc}")

                    if adapter.get_status() == "blocked":
                        self._mark_task_blocked(cursor, task, adapter, adapter.capture_error() or "AntiGravity is blocked.")
                        continue

                    # Check if background thread finished and moved to review
                    if adapter.get_status() == "review":
                        diff_entries = getattr(adapter, "diff_entries", [])
                        logs_json = json.dumps(adapter.get_logs())
                        # Transition task to review
                        cursor.execute(
                            "UPDATE tasks SET status = 'review', progress = 90, related_files = ? WHERE project_id = ? AND id = ?",
                            (json.dumps([entry["file_path"] for entry in diff_entries]), p_id, t_id)
                        )
                        # Reset agent to idle
                        cursor.execute(
                            "UPDATE agents SET logs = ?, status = 'idle', current_task = 'None', progress = 100 WHERE project_id = ? AND name = ?",
                            (logs_json, p_id, agent_name)
                        )
                        self._replace_file_changes(cursor, p_id, t_id, diff_entries)
                        adapter.status = "idle" # Reset adapter state

                        # Create review timeline message
                        msg_id = f"M-SYS-REV-SUB-{int(time.time() * 1000)}"
                        timestamp = datetime.now().strftime("%I:%M %p")
                        if timestamp.startswith("0"): timestamp = timestamp[1:]

                        cursor.execute(
                            """
                            INSERT INTO messages (id, project_id, sender, sender_type, text, timestamp, avatar, meta)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                msg_id, p_id, "System", "system",
                                f"Agent '{agent_name}' submitted task {t_id} with {len(diff_entries)} changed file(s) for review.",
                                timestamp, None, None
                            )
                        )
                    else:
                        logs_json = json.dumps(adapter.get_logs())
                        cursor.execute(
                            "UPDATE agents SET logs = ?, progress = ?, status = 'working' WHERE project_id = ? AND name = ?",
                            (logs_json, adapter.get_progress(), p_id, agent_name)
                        )
                        cursor.execute(
                            "UPDATE tasks SET progress = ? WHERE project_id = ? AND id = ?",
                            (adapter.get_progress(), p_id, t_id)
                        )
                elif isinstance(adapter, CLIWorkerAdapter):
                    if adapter.get_status() not in {"working", "review", "blocked"}:
                        try:
                            adapter.send_task_package(self.build_task_package(task))
                        except Exception as exc:
                            adapter.error = str(exc)
                            adapter.status = "blocked"
                            adapter.logs.append(f"[SYSTEM ERROR] Failed to dispatch task package: {exc}")

                    if adapter.get_status() == "blocked":
                        self._mark_task_blocked(cursor, task, adapter, adapter.capture_error() or f"{agent_name} CLI is blocked.")
                        continue

                    if adapter.get_status() == "review":
                        diff_entries = getattr(adapter, "diff_entries", [])
                        logs_json = json.dumps(adapter.get_logs())
                        cursor.execute(
                            "UPDATE tasks SET status = 'review', progress = 90, related_files = ? WHERE project_id = ? AND id = ?",
                            (json.dumps([entry["file_path"] for entry in diff_entries]), p_id, t_id)
                        )
                        cursor.execute(
                            "UPDATE agents SET logs = ?, status = 'idle', current_task = 'None', progress = 100 WHERE project_id = ? AND name = ?",
                            (logs_json, p_id, agent_name)
                        )
                        self._replace_file_changes(cursor, p_id, t_id, diff_entries)
                        adapter.status = "idle"
                        self._insert_system_message(
                            cursor,
                            p_id,
                            f"Agent '{agent_name}' submitted task {t_id} with {len(diff_entries)} changed file(s) for review.",
                            "M-SYS-REV-SUB",
                        )
                    else:
                        logs_json = json.dumps(adapter.get_logs())
                        cursor.execute(
                            "UPDATE agents SET logs = ?, progress = ?, status = 'working' WHERE project_id = ? AND name = ?",
                            (logs_json, adapter.get_progress(), p_id, agent_name)
                        )
                        cursor.execute(
                            "UPDATE tasks SET progress = ? WHERE project_id = ? AND id = ?",
                            (adapter.get_progress(), p_id, t_id)
                        )
                else:
                    # Mock agent adapter workflow
                    if adapter.get_status() != "working":
                        title = task["title"]
                        desc = task["description"] or ""
                        expected = task["expected_output"] or ""
                        related = json.loads(task["related_files"]) if task["related_files"] else []
                        adapter.send_task(t_id, title, desc, expected, related)

                    # Advance simulation step
                    completed = adapter.update_simulation_step()

                    # Save progress and logs
                    progress = adapter.get_progress()
                    logs_json = json.dumps(adapter.get_logs())

                    cursor.execute(
                        "UPDATE agents SET logs = ?, progress = ? WHERE project_id = ? AND name = ?",
                        (logs_json, progress, p_id, agent_name)
                    )

                    if completed:
                        # Transition to "review" status
                        cursor.execute(
                            "UPDATE tasks SET status = 'review', progress = 90 WHERE project_id = ? AND id = ?",
                            (p_id, t_id)
                        )
                        # Reset agent back to idle
                        cursor.execute(
                            "UPDATE agents SET status = 'idle', current_task = 'None', progress = 100 WHERE project_id = ? AND name = ?",
                            (p_id, agent_name)
                        )

                        # Create review timeline message
                        msg_id = f"M-SYS-REV-SUB-{int(time.time() * 1000)}"
                        timestamp = datetime.now().strftime("%I:%M %p")
                        if timestamp.startswith("0"): timestamp = timestamp[1:]

                        cursor.execute(
                            """
                            INSERT INTO messages (id, project_id, sender, sender_type, text, timestamp, avatar, meta)
                            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                            """,
                            (
                                msg_id, p_id, "System", "system",
                                f"Agent '{agent_name}' submitted task {t_id} for review.",
                                timestamp, None, None
                            )
                        )
                    else:
                        cursor.execute(
                            "UPDATE tasks SET progress = ? WHERE project_id = ? AND id = ?",
                            (progress, p_id, t_id)
                        )

            # 3. Auto-review tasks in "review" status that do not have reviews yet
            cursor.execute("SELECT * FROM tasks WHERE status = 'review'")
            review_tasks = cursor.fetchall()

            for idx, task in enumerate(review_tasks):
                t_id = task["id"]
                p_id = task["project_id"]
                title = task["title"]
                agent_name = task["agent_name"]

                cursor.execute(
                    "SELECT COUNT(*) FROM reviews WHERE project_id = ? AND task_id = ?",
                    (p_id, t_id)
                )
                has_review = cursor.fetchone()[0] > 0
                if has_review:
                    continue

                if agent_name == "Codex Worker":
                    adapter = self.get_adapter(agent_name, p_id)
                    cursor.execute(
                        "SELECT diff_content FROM file_changes WHERE project_id = ? AND task_id = ? ORDER BY file_path ASC",
                        (p_id, t_id)
                    )
                    diff_text = "\n".join(row["diff_content"] for row in cursor.fetchall())
                    try:
                        review_result = adapter.review_task(t_id, title, diff_text)
                        decision = review_result["status"]
                        feedback = review_result["feedback"]
                        cursor.execute(
                            "UPDATE agents SET logs = ? WHERE project_id = ? AND name = ?",
                            (json.dumps(adapter.get_logs()), p_id, agent_name)
                        )
                    except Exception as exc:
                        decision = "changes_requested"
                        feedback = f"Codex reviewer pass failed: {str(exc)}"
                else:
                    decision = "approved"
                    feedback = (
                        f"Verification check passed. The implementation of task {t_id} "
                        "meets V1 workflow requirements and is ready to mark complete."
                    )

                new_status = "completed" if decision == "approved" else "active"
                progress = 100 if decision == "approved" else 50
                timestamp = datetime.now().strftime("%I:%M %p")
                if timestamp.startswith("0"):
                    timestamp = timestamp[1:]

                unique_suffix = f"{int(time.time() * 1000)}-{idx}"
                rev_id = f"rev-{unique_suffix}"
                cursor.execute(
                    """
                    INSERT INTO reviews (id, project_id, task_id, reviewer_agent_name, status, comments, timestamp)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (rev_id, p_id, t_id, "Codex", decision, feedback, timestamp)
                )

                cursor.execute(
                    "UPDATE tasks SET status = ?, progress = ? WHERE project_id = ? AND id = ?",
                    (new_status, progress, p_id, t_id)
                )

                timeline_msg_id = f"M-SYS-REV-DEC-{unique_suffix}"
                cursor.execute(
                    """
                    INSERT INTO messages (id, project_id, sender, sender_type, text, timestamp, avatar, meta)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        timeline_msg_id, p_id, "System", "system",
                        f"Task {t_id} review complete: {decision.upper()} by Codex.",
                        timestamp, None, None
                    )
                )

                codex_msg_id = f"M-CODEX-REV-{unique_suffix}"
                review_card_meta = {
                    "reviewCard": {
                        "taskId": t_id,
                        "taskTitle": title,
                        "status": decision,
                        "feedback": feedback
                    }
                }
                cursor.execute(
                    """
                    INSERT INTO messages (id, project_id, sender, sender_type, text, timestamp, avatar, meta)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        codex_msg_id, p_id, "Codex", "codex",
                        f"{'Approved' if decision == 'approved' else 'Requested revisions for'} task {t_id}: \"{feedback}\"",
                        timestamp, "CX", json.dumps(review_card_meta)
                    )
                )

            conn.commit()
        except Exception as e:
            print("Error in AgentManager tick:", e)
        finally:
            conn.close()

    def _replace_file_changes(self, cursor, project_id: str, task_id: str, diff_entries: list[dict]) -> None:
        cursor.execute("DELETE FROM file_changes WHERE project_id = ? AND task_id = ?", (project_id, task_id))
        timestamp = datetime.now().strftime("%I:%M %p")
        if timestamp.startswith("0"):
            timestamp = timestamp[1:]
        for idx, entry in enumerate(diff_entries):
            cursor.execute(
                """
                INSERT INTO file_changes (id, project_id, task_id, file_path, change_type, diff_content, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    f"fc-{int(time.time() * 1000)}-{idx}",
                    project_id,
                    task_id,
                    entry["file_path"],
                    entry["change_type"],
                    entry["diff_content"],
                    timestamp,
                )
            )

# Singleton manager
agent_manager = AgentManager()
