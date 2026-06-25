import sqlite3

from backend.app.config import DATABASE_DIRECTORY, DATABASE_PATH


def initialize_database() -> None:
    """Create the local database and a minimal schema marker."""
    DATABASE_DIRECTORY.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DATABASE_PATH) as connection:
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
        connection.commit()

    # TODO(Phase 5): Add persistent project, task, agent, message, event,
    # review, and file-change tables with migrations.


def database_is_ready() -> bool:
    return DATABASE_PATH.is_file()

