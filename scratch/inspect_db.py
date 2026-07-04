import sqlite3
import json
import os
from pathlib import Path

db_path = Path("backend/database/ai_team_manager.db")
if not db_path.exists():
    print("Database file does not exist.")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("--- PROJECTS ---")
cursor.execute("SELECT * FROM projects")
for r in cursor.fetchall():
    print(dict(r))

print("\n--- RECENT MESSAGES ---")
cursor.execute("SELECT * FROM messages ORDER BY ROWID DESC LIMIT 10")
for r in cursor.fetchall():
    print(dict(r))

print("\n--- TASKS ---")
cursor.execute("SELECT * FROM tasks")
for r in cursor.fetchall():
    print(dict(r))

conn.close()
