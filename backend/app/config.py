from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATABASE_DIRECTORY = PROJECT_ROOT / "backend" / "database"
DATABASE_PATH = DATABASE_DIRECTORY / "ai_team_manager.db"

