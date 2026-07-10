from contextlib import asynccontextmanager
import os
import json
import time
from datetime import datetime
from typing import AsyncIterator, Optional
import asyncio

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.app.database import CODEX_WORKER_AGENT, database_is_ready, initialize_database, get_db_connection
from backend.app.agents.manager import agent_manager
from backend.app.agents.codex_adapter import DEFAULT_CODEX_LAUNCH_COMMAND
from backend.app.agents.real_codex_adapter import AutoCodexClient


codex_chat_client = AutoCodexClient()


async def run_agent_simulation_loop():
    while True:
        try:
            agent_manager.tick()
        except Exception as e:
            print("Error in simulation loop:", e)
        await asyncio.sleep(2)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    initialize_database()
    task = asyncio.create_task(run_agent_simulation_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="AI Team Manager API",
    version="0.1.0",
    description="Local backend foundation for AI Team Manager.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ignored directory names during scan
IGNORED_FOLDERS = {
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "__pycache__",
    "vendor",
    ".venv",
    "env",
    "venv",
    ".idea",
    ".vscode",
}


MAX_FILE_READ_BYTES = 1_000_000
TASK_ACTION_WORDS = {"build", "create", "implement", "fix", "add", "write", "optimize", "setup", "make", "update", "change", "generate", "assign"}
TASK_ARTIFACT_WORDS = {
    "file", "report", "markdown", ".md", "doc", "docs", "documentation", "script", "test",
    "page", "component", "endpoint", "api", "bug", "issue", "feature", "ui", "frontend",
    "backend", "database", "readme", "folder", "project", "code"
}
TASK_REQUEST_PHRASES = {
    "can you", "could you", "i need", "i want", "we need", "let's", "lets",
    "make me", "help me", "it should", "put it", "turn this", "generate a"
}
STATUS_QUERY_WORDS = {"status", "progress", "agents"}
HELP_QUERY_WORDS = {"help", "commands", "how"}
ANTIGRAVITY_TEST_PHRASES = {
    "test antigravity",
    "test anti gravity",
    "testing antigravity",
    "testing anti gravity",
    "antigravity test",
    "anti gravity test",
    "check antigravity",
    "check anti gravity",
    "antigravity working",
    "anti gravity working",
}


def is_task_intent(text: str) -> bool:
    lower_text = text.lower()
    normalized_words = {word.strip(".,!?;:\"'()[]{}") for word in lower_text.split()}
    if TASK_ACTION_WORDS.intersection(normalized_words):
        return True
    if any(word in lower_text for word in STATUS_QUERY_WORDS):
        return False
    if lower_text.strip() in HELP_QUERY_WORDS:
        return False
    has_request_phrase = any(phrase in lower_text for phrase in TASK_REQUEST_PHRASES)
    has_artifact_target = any(word in lower_text for word in TASK_ARTIFACT_WORDS)
    return has_request_phrase and has_artifact_target


def is_antigravity_task_request(text: str) -> bool:
    lower_text = text.lower()
    compact_text = lower_text.replace("anti gravity", "antigravity")
    if any(phrase in lower_text for phrase in ANTIGRAVITY_TEST_PHRASES):
        return True
    return "antigravity" in compact_text and any(
        word in compact_text
        for word in ["test", "testing", "check", "verify", "working"]
    )


def build_task_title_from_prompt(text: str) -> str:
    words = text.split()
    title = text.strip()

    for i, word in enumerate(words):
        normalized = word.lower().strip(".,!?;:\"'")
        if normalized in TASK_ACTION_WORDS:
            title = " ".join(words[i:]).strip()
            break
    else:
        lowered = title.lower()
        prefixes = [
            "can you please ", "could you please ", "can you ", "could you ", "please ",
            "i need you to ", "i want you to ", "i need ", "i want ", "we need to ",
            "we need ", "help me ", "make me "
        ]
        for prefix in prefixes:
            if lowered.startswith(prefix):
                title = title[len(prefix):].strip()
                break

    title = title or "Implement requested updates"
    if len(title) > 60:
        title = title[:57] + "..."
    return title[0].upper() + title[1:] if title else "Implement requested updates"


def generate_unique_message_id(cursor, prefix: str) -> str:
    for idx in range(100):
        candidate = f"{prefix}-{time.time_ns()}-{idx}"
        cursor.execute("SELECT 1 FROM messages WHERE id = ?", (candidate,))
        if cursor.fetchone() is None:
            return candidate
    raise RuntimeError(f"Unable to generate unique message id for {prefix}.")


def resolve_existing_path(path: str) -> str:
    """Resolve a user-provided local path without following unknown frontend assumptions."""
    normalized_path = os.path.normcase(os.path.realpath(os.path.abspath(os.path.expanduser(path))))
    if not os.path.exists(normalized_path):
        raise ValueError(f"Path does not exist: {path}")
    return normalized_path



def ensure_path_inside_root(path: str, root: str) -> str:
    """Make sure a file request stays inside the selected workspace root."""
    resolved_path = resolve_existing_path(path)
    resolved_root = resolve_existing_path(root)

    if not os.path.isdir(resolved_root):
        raise ValueError(f"Workspace root is not a directory: {root}")

    try:
        common_path = os.path.commonpath([resolved_path, resolved_root])
    except ValueError as exc:
        raise ValueError("File path must be inside the selected workspace.") from exc

    if common_path != resolved_root:
        raise ValueError("File path must be inside the selected workspace.")

    return resolved_path


def detect_language(file_name: str) -> str:
    _, ext = os.path.splitext(file_name)
    ext_lower = ext.lower()

    if ext_lower == ".py":
        return "python"
    if ext_lower in (".js", ".jsx"):
        return "javascript"
    if ext_lower in (".ts", ".tsx"):
        return "typescript"
    if ext_lower == ".json":
        return "json"
    if ext_lower == ".md":
        return "markdown"
    if ext_lower == ".css":
        return "css"
    if ext_lower == ".html":
        return "html"
    return "text"


def scan_directory(path: str) -> dict:
    resolved_path = resolve_existing_path(path)
    if not os.path.isdir(resolved_path):
        raise ValueError(f"Path is not a directory: {path}")

    # Standardize path separator to forward slashes for cross-platform frontend consistency
    normalized_path = resolved_path.replace(os.sep, "/")
    name = os.path.basename(normalized_path) or normalized_path

    node = {
        "name": name,
        "path": normalized_path,
        "isDir": True,
        "children": []
    }

    try:
        entries = os.listdir(resolved_path)
    except OSError:
        return node

    for entry in sorted(entries):
        if entry in IGNORED_FOLDERS:
            continue
        entry_path = os.path.join(resolved_path, entry)
        if os.path.isdir(entry_path):
            try:
                node["children"].append(scan_directory(entry_path))
            except ValueError:
                continue
        else:
            node["children"].append({
                "name": entry,
                "path": os.path.abspath(entry_path).replace(os.sep, "/"),
                "isDir": False,
                "language": detect_language(entry),
            })

    return node

@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "AI Team Manager backend is running."}


@app.api_route("/api/health", methods=["GET", "HEAD"])
async def health() -> dict[str, str | bool]:
    return {
        "status": "ok",
        "service": "ai-team-manager-backend",
        "version": app.version,
        "database_ready": database_is_ready(),
    }


@app.get("/api/workspace/scan")
async def scan(path: str = Query(..., description="Absolute path of the directory to scan")):
    try:
        tree = scan_directory(path)
        return tree
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to scan directory: {str(e)}")


@app.get("/api/workspace/file")
async def read_file(
    path: str = Query(..., description="Absolute path of the file to read"),
    root: str = Query(..., description="Absolute path of the active workspace root"),
):
    try:
        resolved_path = ensure_path_inside_root(path, root)
        if not os.path.isfile(resolved_path):
            raise HTTPException(status_code=400, detail="Path is not a file")

        file_size = os.path.getsize(resolved_path)
        if file_size > MAX_FILE_READ_BYTES:
            raise HTTPException(status_code=413, detail="File is too large to preview.")

        with open(resolved_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        return {"content": content, "language": detect_language(resolved_path)}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Pydantic Request Models
class ProjectCreate(BaseModel):
    name: str
    localPath: str
    branch: str = "main"

class TaskCreate(BaseModel):
    id: str
    title: str
    agentName: str
    status: str
    priority: str
    progress: int = 0
    description: str = ""
    relatedFiles: list[str] = []
    expectedOutput: str = ""

class TaskUpdate(BaseModel):
    status: Optional[str] = None
    progress: Optional[int] = None
    agentName: Optional[str] = None

class AgentCreate(BaseModel):
    name: str
    role: str
    status: str = "online"
    currentTask: str = "None"
    progress: int = 0
    lastActive: str = "Just now"
    avatar: str = ""
    logs: list[str] = []
    description: str = ""
    capabilities: list[str] = []
    intelligenceLevel: str = "Low"
    adapterType: str = "Mock"
    launchCommand: str = ""
    isEnabled: bool = True

class AgentUpdate(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None
    currentTask: Optional[str] = None
    progress: Optional[int] = None
    lastActive: Optional[str] = None
    avatar: Optional[str] = None
    logs: Optional[list[str]] = None
    description: Optional[str] = None
    capabilities: Optional[list[str]] = None
    intelligenceLevel: Optional[str] = None
    adapterType: Optional[str] = None
    launchCommand: Optional[str] = None
    isEnabled: Optional[bool] = None

class MessageCreate(BaseModel):
    id: str
    sender: str
    senderType: str
    text: str
    timestamp: str
    avatar: Optional[str] = None
    meta: Optional[dict] = None

class ReviewCreate(BaseModel):
    taskId: str
    reviewer: str
    status: str  # "approved" or "changes_requested"
    feedback: str
    timestamp: str


class SettingsReseedRequest(BaseModel):
    confirm: str

class BranchUpdate(BaseModel):
    branch: str


def file_change_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "taskId": row["task_id"],
        "path": row["file_path"],
        "changeType": row["change_type"],
        "diffContent": row["diff_content"],
        "timestamp": row["timestamp"],
    }


# SQLite Row Serializer Helpers
def project_to_dict(proj_row, conn) -> dict:
    p_id = proj_row["id"]
    cursor = conn.cursor()

    # Load tasks
    cursor.execute("SELECT * FROM tasks WHERE project_id = ?", (p_id,))
    tasks = []
    for r in cursor.fetchall():
        # Fetch review history for this task
        cursor.execute(
            "SELECT * FROM reviews WHERE project_id = ? AND task_id = ? ORDER BY timestamp ASC",
            (p_id, r["id"])
        )
        reviews = []
        for rev in cursor.fetchall():
            reviews.append({
                "reviewer": rev["reviewer_agent_name"],
                "status": rev["status"],
                "feedback": rev["comments"],
                "timestamp": rev["timestamp"]
            })
        tasks.append({
            "id": r["id"],
            "title": r["title"],
            "agentName": r["agent_name"],
            "status": r["status"],
            "priority": r["priority"],
            "progress": r["progress"],
            "description": r["description"],
            "relatedFiles": json.loads(r["related_files"]) if r["related_files"] else [],
            "expectedOutput": r["expected_output"],
            "reviewHistory": reviews
        })

    # Load agents
    cursor.execute("SELECT * FROM agents WHERE project_id = ?", (p_id,))
    agents = []
    for r in cursor.fetchall():
        agents.append({
            "name": r["name"],
            "role": r["role"],
            "status": r["status"],
            "currentTask": r["current_task"],
            "progress": r["progress"],
            "lastActive": r["last_active"],
            "avatar": r["avatar"],
            "logs": json.loads(r["logs"]) if r["logs"] else [],
            "description": r["description"],
            "capabilities": json.loads(r["capabilities"]) if r["capabilities"] else [],
            "intelligenceLevel": r["intelligence_level"],
            "adapterType": r["adapter_type"],
            "launchCommand": r["launch_command"],
            "isEnabled": bool(r["enabled"])
        })

    # Load messages
    cursor.execute("SELECT * FROM messages WHERE project_id = ?", (p_id,))
    messages = []
    for r in cursor.fetchall():
        messages.append({
            "id": r["id"],
            "sender": r["sender"],
            "senderType": r["sender_type"],
            "text": r["text"],
            "timestamp": r["timestamp"],
            "avatar": r["avatar"],
            "meta": json.loads(r["meta"]) if r["meta"] else None
        })

    cursor.execute("SELECT * FROM file_changes WHERE project_id = ? ORDER BY timestamp ASC, file_path ASC", (p_id,))
    file_changes = [file_change_to_dict(row) for row in cursor.fetchall()]

    return {
        "id": proj_row["id"],
        "name": proj_row["name"],
        "localPath": proj_row["local_path"],
        "lastOpened": proj_row["last_opened"],
        "status": proj_row["status"],
        "branch": proj_row["branch"],
        "taskCount": len(tasks),
        "agentCount": len(agents),
        "files": json.loads(proj_row["mock_files"]) if proj_row["mock_files"] else None,
        "tasks": tasks,
        "agents": agents,
        "messages": messages,
        "fileChanges": file_changes
    }


# DB Entity CRUD REST Endpoints
@app.get("/api/projects")
async def get_projects():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects")
        proj_rows = cursor.fetchall()
        return [project_to_dict(row, conn) for row in proj_rows]
    finally:
        conn.close()


@app.post("/api/projects")
async def create_project(body: ProjectCreate):
    conn = get_db_connection()
    try:
        p_id = f"p-{int(time.time() * 1000)}"
        name = body.name
        path = body.localPath
        branch = body.branch or "main"

        # Generate simple default files tree for fallback
        default_files = {
            "name": f"{name.lower().replace(' ', '-')}-root",
            "path": "/",
            "isDir": True,
            "children": [
                {
                    "name": "src",
                    "path": "/src",
                    "isDir": True,
                    "children": [
                        {
                            "name": "app.py",
                            "path": "/src/app.py",
                            "isDir": False,
                            "language": "python",
                            "content": f'# {name} main script\nprint("Hello from {name}!")\n'
                        }
                    ]
                },
                {
                    "name": "README.md",
                    "path": "/README.md",
                    "isDir": False,
                    "language": "markdown",
                    "content": f"# {name}\nInitialized by AI Team Manager.\n"
                }
            ]
        }

        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO projects (id, name, local_path, last_opened, status, branch, mock_files)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (p_id, name, path, "Just now", "development", branch, json.dumps(default_files))
        )

        # Add default agents: Codex, AntiGravity, and real Codex Worker
        cursor.execute(
            """
            INSERT INTO agents (
                project_id, name, role, status, current_task, progress, last_active,
                avatar, logs, description, capabilities, intelligence_level,
                adapter_type, launch_command, enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                p_id, "Codex", "Lead Coordinator", "online", "Setting up project directory",
                10, "Just now", "CX", json.dumps([
                    f"[SYSTEM] Project '{name}' created at path '{path}'.",
                    f"[SYSTEM] Active branch set to '{branch}'."
                ]),
                "Central AI Orchestration agent coordinating developer team members.",
                json.dumps(["architecture", "debugging", "documentation", "testing", "refactoring"]),
                "Critical", "API", DEFAULT_CODEX_LAUNCH_COMMAND, 1
            )
        )
        cursor.execute(
            """
            INSERT INTO agents (
                project_id, name, role, status, current_task, progress, last_active,
                avatar, logs, description, capabilities, intelligence_level,
                adapter_type, launch_command, enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                p_id,
                CODEX_WORKER_AGENT["name"],
                CODEX_WORKER_AGENT["role"],
                CODEX_WORKER_AGENT["status"],
                CODEX_WORKER_AGENT["current_task"],
                CODEX_WORKER_AGENT["progress"],
                CODEX_WORKER_AGENT["last_active"],
                CODEX_WORKER_AGENT["avatar"],
                json.dumps(CODEX_WORKER_AGENT["logs"]),
                CODEX_WORKER_AGENT["description"],
                json.dumps(CODEX_WORKER_AGENT["capabilities"]),
                CODEX_WORKER_AGENT["intelligence_level"],
                CODEX_WORKER_AGENT["adapter_type"],
                CODEX_WORKER_AGENT["launch_command"],
                CODEX_WORKER_AGENT["enabled"],
            )
        )
        cursor.execute(
            """
            INSERT INTO agents (
                project_id, name, role, status, current_task, progress, last_active,
                avatar, logs, description, capabilities, intelligence_level,
                adapter_type, launch_command, enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                p_id, "AntiGravity", "Backend Architect", "idle", "None",
                0, "Just now", "AG", json.dumps(["[SYSTEM] Adapter online."]),
                "Specialized in Python FastAPI, SQLite databases, and server architecture.",
                json.dumps(["backend", "database", "debugging", "testing"]),
                "High", "CLI", "python -m agents.antigravity", 1
            )
        )

        # Add initialization message
        m_id = f"m-init-{int(time.time() * 1000)}"
        cursor.execute(
            """
            INSERT INTO messages (id, project_id, sender, sender_type, text, timestamp, avatar, meta)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                m_id, p_id, "System", "system",
                f"Project '{name}' initialized at {path}. Active branch: {branch}.",
                datetime.now().strftime("%I:%M %p"), None, None
            )
        )

        conn.commit()

        # Fetch full details
        cursor.execute("SELECT * FROM projects WHERE id = ?", (p_id,))
        proj_row = cursor.fetchone()
        return project_to_dict(proj_row, conn)
    finally:
        conn.close()


@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM projects WHERE id = ?", (project_id,))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()


@app.post("/api/projects/{project_id}/tasks")
async def create_task(project_id: str, body: TaskCreate):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO tasks (
                id, project_id, title, agent_name, status, priority, progress,
                description, related_files, expected_output
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                body.id, project_id, body.title, body.agentName, body.status,
                body.priority, body.progress, body.description,
                json.dumps(body.relatedFiles), body.expectedOutput
            )
        )
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()


@app.put("/api/projects/{project_id}/tasks/{task_id}")
async def update_task(project_id: str, task_id: str, body: TaskUpdate):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        if body.status is not None and body.status == "completed":
            # Check if there is an approved review for this task in the reviews table.
            cursor.execute(
                "SELECT COUNT(*) FROM reviews WHERE project_id = ? AND task_id = ? AND status = 'approved'",
                (project_id, task_id)
            )
            approved_count = cursor.fetchone()[0]
            if approved_count == 0:
                raise HTTPException(
                    status_code=400,
                    detail="Tasks cannot bypass Codex review. Mark status as 'review' to request approval from the Lead Engineer."
                )

        fields = []
        params = []
        if body.status is not None:
            fields.append("status = ?")
            params.append(body.status)
        if body.progress is not None:
            fields.append("progress = ?")
            params.append(body.progress)
        if body.agentName is not None:
            fields.append("agent_name = ?")
            params.append(body.agentName)

        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.extend([project_id, task_id])
        query = f"UPDATE tasks SET {', '.join(fields)} WHERE project_id = ? AND id = ?"
        cursor.execute(query, tuple(params))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()


@app.post("/api/projects/{project_id}/agents")
async def create_agent(project_id: str, body: AgentCreate):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO agents (
                project_id, name, role, status, current_task, progress, last_active,
                avatar, logs, description, capabilities, intelligence_level,
                adapter_type, launch_command, enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                project_id, body.name, body.role, body.status, body.currentTask,
                body.progress, body.lastActive, body.avatar, json.dumps(body.logs),
                body.description, json.dumps(body.capabilities), body.intelligenceLevel,
                body.adapterType, body.launchCommand, 1 if body.isEnabled else 0
            )
        )
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()


@app.put("/api/projects/{project_id}/agents/{agent_name}")
async def update_agent(project_id: str, agent_name: str, body: AgentUpdate):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        fields = []
        params = []
        if body.role is not None:
            fields.append("role = ?")
            params.append(body.role)
        if body.status is not None:
            fields.append("status = ?")
            params.append(body.status)
        if body.currentTask is not None:
            fields.append("current_task = ?")
            params.append(body.currentTask)
        if body.progress is not None:
            fields.append("progress = ?")
            params.append(body.progress)
        if body.lastActive is not None:
            fields.append("last_active = ?")
            params.append(body.lastActive)
        if body.avatar is not None:
            fields.append("avatar = ?")
            params.append(body.avatar)
        if body.logs is not None:
            fields.append("logs = ?")
            params.append(json.dumps(body.logs))
        if body.description is not None:
            fields.append("description = ?")
            params.append(body.description)
        if body.capabilities is not None:
            fields.append("capabilities = ?")
            params.append(json.dumps(body.capabilities))
        if body.intelligenceLevel is not None:
            fields.append("intelligence_level = ?")
            params.append(body.intelligenceLevel)
        if body.adapterType is not None:
            fields.append("adapter_type = ?")
            params.append(body.adapterType)
        if body.launchCommand is not None:
            fields.append("launch_command = ?")
            params.append(body.launchCommand)
        if body.isEnabled is not None:
            fields.append("enabled = ?")
            params.append(1 if body.isEnabled else 0)

        if not fields:
            raise HTTPException(status_code=400, detail="No fields to update")

        params.extend([project_id, agent_name])
        query = f"UPDATE agents SET {', '.join(fields)} WHERE project_id = ? AND name = ?"
        cursor.execute(query, tuple(params))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()


def build_codex_chat_prompt(project_id: str, text: str, conn) -> tuple[str, str]:
    cursor = conn.cursor()
    cursor.execute("SELECT name, local_path, branch, status FROM projects WHERE id = ?", (project_id,))
    project = cursor.fetchone()
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    workspace_path = resolve_existing_path(project["local_path"])
    if not os.path.isdir(workspace_path):
        raise RuntimeError(f"Project workspace is not a directory: {workspace_path}")

    cursor.execute(
        """
        SELECT name, role, status, current_task, progress
        FROM agents
        WHERE project_id = ?
        ORDER BY name
        """,
        (project_id,),
    )
    agents = [dict(row) for row in cursor.fetchall()]

    cursor.execute(
        """
        SELECT id, title, agent_name, status, priority, progress, description
        FROM tasks
        WHERE project_id = ?
        ORDER BY rowid DESC
        LIMIT 20
        """,
        (project_id,),
    )
    tasks = [dict(row) for row in cursor.fetchall()]

    cursor.execute(
        """
        SELECT sender, sender_type, text, timestamp
        FROM messages
        WHERE project_id = ?
        ORDER BY rowid DESC
        LIMIT 21
        """,
        (project_id,),
    )
    recent_messages = [dict(row) for row in reversed(cursor.fetchall())]
    if (
        recent_messages
        and recent_messages[-1]["sender_type"] == "user"
        and recent_messages[-1]["text"] == text
    ):
        recent_messages.pop()
    recent_messages = recent_messages[-20:]

    context = {
        "project": dict(project),
        "agents": agents,
        "recent_tasks": tasks,
        "recent_messages": recent_messages,
    }
    prompt = (
        "You are Codex, the lead coordinator inside AI Team Manager. Reply directly to the user's "
        "message as a capable coding assistant. This is a conversational, read-only turn: you may "
        "inspect the selected workspace when useful, but you must not edit files, run destructive "
        "commands, or claim that a task or change was created. Use the supplied live project state "
        "when the user asks about this project, its tasks, or its agents. Be concise and natural.\n\n"
        f"Live AI Team Manager context:\n{json.dumps(context, indent=2)}\n\n"
        f"User message:\n{text}"
    )
    return prompt, workspace_path


async def generate_codex_response(project_id: str, text: str, conn) -> dict:
    cursor = conn.cursor()

    # Check if user wants to create/assign a task
    if is_task_intent(text):
        assigned_agent = (
            "AntiGravity"
            if is_antigravity_task_request(text)
            else "Codex Worker"
        )

        title = build_task_title_from_prompt(text)

        # Fetch current max task ID to increment
        cursor.execute("SELECT id FROM tasks WHERE project_id = ?", (project_id,))
        task_rows = cursor.fetchall()
        max_num = 0
        for r in task_rows:
            id_str = r["id"]
            if id_str.startswith("T-"):
                try:
                    num = int(id_str[2:])
                    if num > max_num:
                        max_num = num
                except ValueError:
                    pass

        new_task_num = max_num + 1
        new_task_id = f"T-{new_task_num}"

        # Insert task into database as "assigned"
        cursor.execute(
            """
            INSERT INTO tasks (id, project_id, title, agent_name, status, priority, progress, description, related_files, expected_output)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                new_task_id, project_id, title, assigned_agent, "assigned", "medium", 0,
                f"Auto-generated from user prompt: '{text}'",
                json.dumps([]),
                (
                    "AntiGravity worker test task with uncommitted git diff."
                    if assigned_agent == "AntiGravity"
                    else "Real Codex implementation with uncommitted git diff."
                )
            )
        )

        # Insert timeline system notification for task creation
        timeline_msg_id = generate_unique_message_id(cursor, "M-SYS-TASK-ADD")
        timestamp = datetime.now().strftime("%I:%M %p")
        if timestamp.startswith("0"): timestamp = timestamp[1:]

        cursor.execute(
            """
            INSERT INTO messages (id, project_id, sender, sender_type, text, timestamp, avatar, meta)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                timeline_msg_id, project_id, "System", "system",
                f"Task {new_task_id} ('{title}') was created and assigned to @{assigned_agent}.",
                timestamp, None, None
            )
        )

        codex_reply = (
            f"I created task {new_task_id}: '{title}' and assigned it to @{assigned_agent}. "
            + (
                "AntiGravity will run through its CLI adapter, stream progress logs, and send the result through Codex review."
                if assigned_agent == "AntiGravity"
                else "The worker will run Codex against the selected workspace, leave changes as an uncommitted git diff, and send the result through a Codex review pass before completion."
            )
        )

    else:
        try:
            prompt, workspace_path = build_codex_chat_prompt(project_id, text, conn)
            result = await asyncio.to_thread(
                codex_chat_client.run,
                prompt,
                workspace_path,
                "read-only",
            )
            codex_reply = result.final_response.strip()
            if not codex_reply:
                raise RuntimeError("Codex returned an empty response.")
        except HTTPException:
            raise
        except (OSError, RuntimeError, ValueError) as exc:
            raise HTTPException(status_code=503, detail=f"Codex chat is unavailable: {exc}") from exc

    timestamp = datetime.now().strftime("%I:%M %p")
    if timestamp.startswith("0"):
        timestamp = timestamp[1:]

    return {
        "id": generate_unique_message_id(cursor, "M-CODEX"),
        "sender": "Codex",
        "senderType": "codex",
        "text": codex_reply,
        "timestamp": timestamp,
        "avatar": "CX",
        "meta": None
    }


@app.delete("/api/projects/{project_id}/agents/{agent_name}")
async def delete_agent(project_id: str, agent_name: str):
    if agent_name == "Codex":
        raise HTTPException(status_code=400, detail="Codex cannot be deleted")
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM agents WHERE project_id = ? AND name = ?", (project_id, agent_name))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()


@app.post("/api/projects/{project_id}/messages")
async def create_message(project_id: str, body: MessageCreate):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # Insert incoming message
        cursor.execute(
            """
            INSERT INTO messages (id, project_id, sender, sender_type, text, timestamp, avatar, meta)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                body.id, project_id, body.sender, body.senderType, body.text,
                body.timestamp, body.avatar, json.dumps(body.meta) if body.meta is not None else None
            )
        )

        user_message_dict = {
            "id": body.id,
            "sender": body.sender,
            "senderType": body.senderType,
            "text": body.text,
            "timestamp": body.timestamp,
            "avatar": body.avatar,
            "meta": body.meta
        }

        codex_message_dict = None

        # Persist the user's message before invoking Codex so a long chat turn does not
        # hold a SQLite write lock and block worker progress updates.
        conn.commit()

        # If it's a user message, generate and save the Codex response.
        if body.senderType == "user":
            codex_message_dict = await generate_codex_response(project_id, body.text, conn)
            cursor.execute(
                """
                INSERT INTO messages (id, project_id, sender, sender_type, text, timestamp, avatar, meta)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    codex_message_dict["id"], project_id, codex_message_dict["sender"],
                    codex_message_dict["senderType"], codex_message_dict["text"],
                    codex_message_dict["timestamp"], codex_message_dict["avatar"],
                    json.dumps(codex_message_dict["meta"]) if codex_message_dict["meta"] is not None else None
                )
            )

        conn.commit()
        return {
            "status": "success",
            "userMessage": user_message_dict,
            "codexMessage": codex_message_dict
        }
    finally:
        conn.close()


@app.post("/api/projects/{project_id}/reviews")
async def create_review(project_id: str, body: ReviewCreate):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()

        # Insert review record
        rev_id = f"rev-{int(time.time() * 1000)}"
        cursor.execute(
            """
            INSERT INTO reviews (id, project_id, task_id, reviewer_agent_name, status, comments, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                rev_id, project_id, body.taskId, body.reviewer,
                body.status, body.feedback, body.timestamp
            )
        )

        # Update task status & progress
        if body.status == "approved":
            cursor.execute(
                "UPDATE tasks SET status = ?, progress = ? WHERE project_id = ? AND id = ?",
                ("completed", 100, project_id, body.taskId)
            )
        else:
            # For changes requested, set status back to active, but we can keep or reset progress
            cursor.execute(
                "UPDATE tasks SET status = ? WHERE project_id = ? AND id = ?",
                ("active", project_id, body.taskId)
            )

        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()


@app.post("/api/projects/{project_id}/branch")
async def update_project_branch(project_id: str, body: BranchUpdate):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("UPDATE projects SET branch = ? WHERE id = ?", (body.branch, project_id))
        conn.commit()
        return {"status": "success"}
    finally:
        conn.close()


@app.post("/api/settings/reseed")
async def reseed_settings_db(body: SettingsReseedRequest):
    if body.confirm != "RESET_DATABASE":
        raise HTTPException(status_code=400, detail="Database reset confirmation is required.")

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM reviews")
        cursor.execute("DELETE FROM file_changes")
        cursor.execute("DELETE FROM messages")
        cursor.execute("DELETE FROM tasks")
        cursor.execute("DELETE FROM agents")
        cursor.execute("DELETE FROM projects")
        cursor.execute("DELETE FROM schema_metadata")

        cursor.execute(
            "INSERT OR IGNORE INTO schema_metadata (key, value) VALUES ('schema_version', '1')"
        )
        conn.commit()

        from backend.app.mock_seed import seed_database
        seed_database(conn)
        conn.commit()
        return {"status": "success", "message": "Database successfully re-seeded."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to re-seed database: {str(e)}")
    finally:
        conn.close()
