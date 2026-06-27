import json
import time
from datetime import datetime
from backend.app.database import get_db_connection
from backend.app.agents.mock import MockAgentAdapter

class AgentManager:
    def __init__(self):
        self.adapters = {} # agent_name -> adapter

    def get_adapter(self, agent_name: str) -> MockAgentAdapter:
        if agent_name not in self.adapters:
            adapter = MockAgentAdapter(agent_name)
            adapter.start()
            self.adapters[agent_name] = adapter
        return self.adapters[agent_name]

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
                
                # Trigger adapter
                adapter = self.get_adapter(agent_name)
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
                
                adapter = self.get_adapter(agent_name)
                # If adapter is not working, initialize it
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
                    # Update progress in task table
                    cursor.execute(
                        "UPDATE tasks SET progress = ? WHERE project_id = ? AND id = ?",
                        (progress, p_id, t_id)
                    )
            
            conn.commit()
        except Exception as e:
            print("Error in AgentManager tick:", e)
        finally:
            conn.close()

# Singleton manager
agent_manager = AgentManager()
