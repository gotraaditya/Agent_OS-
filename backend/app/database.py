import json
import shutil
import sqlite3
from backend.app.config import DATABASE_DIRECTORY, DATABASE_PATH
from backend.app.agents.codex_adapter import DEFAULT_CODEX_LAUNCH_COMMAND
from backend.app.agents.cli_worker_adapter import CLI_AGENT_DEFAULT_COMMANDS
from backend.app.mock_seed import seed_database


CODEX_WORKER_AGENT = {
    "name": "Codex Worker",
    "role": "Implementation Worker",
    "status": "idle",
    "current_task": "None",
    "progress": 0,
    "last_active": "Just now",
    "avatar": "CW",
    "logs": ["[SYSTEM] Codex SDK worker ready for real implementation tasks."],
    "description": "Real Codex-powered worker that edits the selected workspace and submits diffs for review.",
    "capabilities": ["backend", "frontend", "testing", "refactoring", "documentation"],
    "intelligence_level": "Critical",
    "adapter_type": "CodexSDK",
    "launch_command": "",
    "enabled": 1,
}


UNVERIFIED_WORKER_AGENTS = tuple(CLI_AGENT_DEFAULT_COMMANDS.keys())


def ensure_codex_worker_agents(connection: sqlite3.Connection) -> None:
    cursor = connection.cursor()
    cursor.execute("SELECT id FROM projects")
    for row in cursor.fetchall():
        project_id = row[0]
        cursor.execute(
            "SELECT COUNT(*) FROM agents WHERE project_id = ? AND name = ?",
            (project_id, CODEX_WORKER_AGENT["name"]),
        )
        if cursor.fetchone()[0] > 0:
            continue

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
                project_id,
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
            ),
        )


def initialize_database() -> None:
    """Create the local database, schema tables, and seed initial mock data."""
    DATABASE_DIRECTORY.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DATABASE_PATH, timeout=30.0) as connection:
        connection.execute("PRAGMA foreign_keys = ON;")

        # Schema metadata
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_metadata (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            INSERT OR IGNORE INTO schema_metadata (key, value)
            VALUES ('schema_version', '1')
            """
        )

        # Projects Table
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                local_path TEXT NOT NULL,
                last_opened TEXT NOT NULL,
                status TEXT NOT NULL,
                branch TEXT NOT NULL DEFAULT 'main',
                mock_files TEXT NOT NULL
            )
            """
        )

        # Agents Table
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS agents (
                project_id TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT NOT NULL,
                status TEXT NOT NULL,
                current_task TEXT,
                progress INTEGER NOT NULL DEFAULT 0,
                last_active TEXT NOT NULL,
                avatar TEXT NOT NULL,
                logs TEXT NOT NULL,
                description TEXT,
                capabilities TEXT,
                intelligence_level TEXT,
                adapter_type TEXT,
                launch_command TEXT,
                enabled INTEGER NOT NULL DEFAULT 1,
                PRIMARY KEY (project_id, name),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
            """
        )

        # Tasks Table
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT NOT NULL,
                project_id TEXT NOT NULL,
                title TEXT NOT NULL,
                agent_name TEXT NOT NULL,
                status TEXT NOT NULL,
                priority TEXT NOT NULL,
                progress INTEGER NOT NULL DEFAULT 0,
                description TEXT,
                related_files TEXT,
                expected_output TEXT,
                PRIMARY KEY (project_id, id),
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
            """
        )

        # Messages Table
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                sender TEXT NOT NULL,
                sender_type TEXT NOT NULL,
                text TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                avatar TEXT,
                meta TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
            """
        )

        # Reviews Table
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS reviews (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                task_id TEXT NOT NULL,
                reviewer_agent_name TEXT NOT NULL,
                status TEXT NOT NULL,
                comments TEXT,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
                FOREIGN KEY (project_id, task_id) REFERENCES tasks(project_id, id) ON DELETE CASCADE
            )
            """
        )

        # File changes Table
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS file_changes (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                task_id TEXT,
                file_path TEXT NOT NULL,
                change_type TEXT NOT NULL,
                diff_content TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
            """
        )

        connection.commit()

        # Seed the database
        seed_database(connection)
        connection.execute(
            """
            UPDATE agents
            SET launch_command = ?
            WHERE name = 'Codex' AND launch_command = 'node build/codex.js'
            """,
            (DEFAULT_CODEX_LAUNCH_COMMAND,)
        )
        connection.execute(
            """
            UPDATE agents
            SET adapter_type = 'CLI'
            WHERE name = 'AntiGravity'
              AND launch_command = 'python -m agents.antigravity'
              AND adapter_type = 'Mock'
            """
        )
        ensure_codex_worker_agents(connection)
        for agent_name, command in CLI_AGENT_DEFAULT_COMMANDS.items():
            if shutil.which(command):
                connection.execute(
                    """
                    UPDATE agents
                    SET adapter_type = 'CLI',
                        launch_command = ?,
                        status = CASE WHEN status = 'working' THEN 'idle' ELSE status END,
                        current_task = CASE WHEN current_task LIKE 'T-%:%' THEN 'None' ELSE current_task END,
                        progress = CASE WHEN status = 'working' THEN 0 ELSE progress END,
                        logs = ?
                    WHERE name = ?
                    """,
                    (
                        command,
                        json.dumps([
                            f"[SYSTEM] {agent_name} CLI detected on PATH.",
                            "[SYSTEM] Real CLI adapter available; tasks will run in the selected workspace.",
                        ]),
                        agent_name,
                    ),
                )
            else:
                connection.execute(
                    """
                    UPDATE agents
                    SET adapter_type = 'Unavailable',
                        status = 'blocked',
                        current_task = 'Unavailable until a real CLI/API is installed',
                        progress = 0,
                        logs = ?
                    WHERE name = ?
                    """,
                    (
                        json.dumps([
                            f"[UNAVAILABLE] {command} was not found on PATH.",
                            "[UNAVAILABLE] Install/configure the CLI before assigning tasks to this agent.",
                        ]),
                        agent_name,
                    ),
                )
        connection.commit()


def database_is_ready() -> bool:
    return DATABASE_PATH.is_file()


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

