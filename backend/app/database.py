import sqlite3
from backend.app.config import DATABASE_DIRECTORY, DATABASE_PATH
from backend.app.mock_seed import seed_database


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


def database_is_ready() -> bool:
    return DATABASE_PATH.is_file()


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DATABASE_PATH, timeout=30.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

