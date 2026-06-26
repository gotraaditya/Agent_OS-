from contextlib import asynccontextmanager
import os
from typing import AsyncIterator

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.app.database import database_is_ready, initialize_database


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    initialize_database()
    yield


app = FastAPI(
    title="AI Team Manager API",
    version="0.1.0",
    description="Local backend foundation for AI Team Manager.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:3000", "http://localhost:3000"],
    allow_credentials=False,
    allow_methods=["GET"],
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


def resolve_existing_path(path: str) -> str:
    """Resolve a user-provided local path without following unknown frontend assumptions."""
    normalized_path = os.path.abspath(os.path.expanduser(path))
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


# TODO(Phase 3+): Add project workspace, file, task, agent, and activity routes.
