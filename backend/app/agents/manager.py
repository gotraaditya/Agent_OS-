import json
import time
from datetime import datetime
from backend.app.database import get_db_connection
from backend.app.agents.mock import MockAgentAdapter
from backend.app.agents.antigravity_adapter import AntiGravityAdapter, DEFAULT_ANTIGRAVITY_LAUNCH_COMMAND
from backend.app.agents.real_codex_adapter import RealCodexAdapter

class AgentManager:
    def __init__(self):
        self.adapters = {} # (project_id, agent_name) -> adapter

    def get_adapter(self, agent_name: str, project_id: str = "p1") -> MockAgentAdapter:
        adapter_key = (project_id, agent_name)
        if adapter_key not in self.adapters:
            # Query launch command from SQLite database for this agent
            launch_command = DEFAULT_ANTIGRAVITY_LAUNCH_COMMAND if agent_name == "AntiGravity" else None
            adapter_type = "Mock"
            project_path = None
            conn = get_db_connection()
            try:
                cursor = conn.cursor()
                cursor.execute(
                    """
                    SELECT agents.launch_command, agents.adapter_type, projects.local_path
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
            except Exception as e:
                print("Error fetching launch command:", e)
            finally:
                conn.close()

            if adapter_type == "CodexSDK" or agent_name == "Codex Worker":
                adapter = RealCodexAdapter(project_path)
            elif agent_name == "AntiGravity":
                adapter = AntiGravityAdapter(launch_command, project_path)
            else:
                adapter = MockAgentAdapter(agent_name)

            adapter.start()
            self.adapters[adapter_key] = adapter

        return self.adapters[adapter_key]

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
                expected = task["expected_output"] or ""
                related = json.loads(task["related_files"]) if task["related_files"] else []

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
                adapter.send_task(t_id, title, desc, expected, related)

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

                if isinstance(adapter, RealCodexAdapter):
                    if adapter.get_status() not in {"working", "review", "blocked"}:
                        title = task["title"]
                        desc = task["description"] or ""
                        expected = task["expected_output"] or ""
                        related = json.loads(task["related_files"]) if task["related_files"] else []
                        adapter.send_task(t_id, title, desc, expected, related)

                    if adapter.get_status() == "blocked":
                        logs_json = json.dumps(adapter.get_logs())
                        cursor.execute(
                            "UPDATE agents SET logs = ?, status = 'blocked', current_task = ?, progress = ? WHERE project_id = ? AND name = ?",
                            (logs_json, task["title"], adapter.get_progress(), p_id, agent_name)
                        )
                        cursor.execute(
                            "UPDATE tasks SET status = 'blocked', progress = ? WHERE project_id = ? AND id = ?",
                            (adapter.get_progress(), p_id, t_id)
                        )
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
                    if adapter.get_status() != "working" and adapter.get_status() != "review":
                        title = task["title"]
                        desc = task["description"] or ""
                        expected = task["expected_output"] or ""
                        related = json.loads(task["related_files"]) if task["related_files"] else []
                        adapter.send_task(t_id, title, desc, expected, related)

                    # Check if background thread finished and moved to review
                    if adapter.get_status() == "review":
                        # Transition task to review
                        cursor.execute(
                            "UPDATE tasks SET status = 'review', progress = 90 WHERE project_id = ? AND id = ?",
                            (p_id, t_id)
                        )
                        # Reset agent to idle
                        cursor.execute(
                            "UPDATE agents SET status = 'idle', current_task = 'None', progress = 100 WHERE project_id = ? AND name = ?",
                            (p_id, agent_name)
                        )
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
                                f"Agent '{agent_name}' submitted task {t_id} for review.",
                                timestamp, None, None
                            )
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
