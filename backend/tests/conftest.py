import pytest
import os
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient

# Override backend database path with a temporary file prior to importing modules
import backend.app.config

db_fd, temp_db_path = tempfile.mkstemp(suffix=".db")
backend.app.config.DATABASE_PATH = Path(temp_db_path)

from backend.app.main import app
from backend.app.database import initialize_database

@pytest.fixture(scope="session", autouse=True)
def test_db():
    initialize_database()
    yield
    os.close(db_fd)
    try:
        os.unlink(temp_db_path)
    except OSError:
        pass

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
