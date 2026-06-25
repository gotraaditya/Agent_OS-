from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
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

# TODO(Phase 3+): Add project workspace, file, task, agent, and activity routes.
