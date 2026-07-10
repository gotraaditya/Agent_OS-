# AI Team Manager

AI Team Manager is a professional Windows desktop command center for coordinating multiple specialized AI coding agents. The project implements a complete local coordination workflow where Codex acts as the Lead Coordinator directing other worker agents (such as AntiGravity) to perform subtasks, all stored in a local SQLite database and rendered inside a custom Electron desktop shell.

## Key Features

- **Multi-Project Workspace Navigator:** Add, select, switch, reload, and remove projects from the SQLite database. Automatically loads the real project directory structure.
- **Robust File System Tree:** Displays project directories while ignoring build/dependency folders (e.g., `node_modules`, `.git`, `.next`, `dist`, `__pycache__`).
- **Interactive File Viewer:** View source files with automatic syntax tokenizing, large file performance optimization, search (Ctrl+F) with scroll-into-view, and binary file preview prevention.
- **Task Workflow Coordinator:** Create tasks and assign them to specialized agents. Group tasks by status (active, review, completed, blocked). Task statuses are coupled to reviews to prevent bypassing Codex review.
- **Centralized Codex Input:** Route all user prompts directly to Codex. It blocks direct commands to worker agents (like `@antigravity`) to enforce central coordination, and automatically creates task cards using capability matches.
- **Agent Registry & Subprocess Monitoring:** View registered agents, modify their roles, capabilities, adapter types, availability states, and subprocess execution logs in the Bottom Inspector.
- **Bottom Inspector Panel:** Inspect file changes, live agent logs, review history details, and system events.

## Agent Adapter Status

The app now distinguishes real, mock, unavailable, and misconfigured adapters. Unsupported agents are blocked visibly instead of simulated as successful.

| Agent | Current adapter status |
| --- | --- |
| Codex Worker | Real adapter through `openai_codex` when installed, otherwise `codex exec`. |
| AntiGravity | Real CLI adapter through `agy --print` when configured, with a local Python harness for adapter mechanics. |
| OpenCode | Generic CLI adapter using `opencode run`; live auth/workspace verification still required. |
| Blackbox | Generic CLI adapter using `blackbox --prompt`; live auth/workspace verification still required. |
| Kilocode | Generic CLI adapter using `kilocode run`; live auth/workspace verification still required. |
| Mimo Code | Generic CLI adapter using `mimo run`; live auth/workspace verification still required. |
| Mock adapters | Disabled unless `AI_TEAM_ENABLE_MOCK_ADAPTERS=true`. |

See `AGENT_ADAPTER_AUDIT.md`, `AGENT_ADAPTERS.md`, and `MULTI_AGENT_VERIFICATION_REPORT.md` for the current verification record.

## Tech Stack

- **Desktop Shell:** Electron (context-isolated preload bridge)
- **Frontend Web App:** Next.js, React, TypeScript, Vanilla CSS
- **Backend Server:** FastAPI (Python), SQLite3 database
- **Testing:** pytest (backend) & Vitest + JSDOM (frontend)

## Getting Started

### Prerequisites
- Node.js 22 or newer
- npm 10 or newer
- Python 3.11 or newer
- Windows PowerShell

### First-Time Setup
In the root directory, open PowerShell and run:
```powershell
npm run setup
```
This script installs the client dependencies, builds the node workspaces, initializes the Python virtual environment (`.venv`), and installs FastAPI/uvicorn dependencies.

### Running the Application
To run the backend FastAPI, frontend Next.js, and desktop Electron shell concurrently, run:
```powershell
npm run dev
```

### Running Tests
To run all automated test suites (backend pytest and frontend Vitest):
```powershell
npm run test
```
Or run them individually:
```powershell
# Backend tests only
npm run test:backend

# Frontend tests only
npm run test:web
```

### Static Build & Verification
To run TypeScript check and build static production bundles:
```powershell
npm run typecheck
npm run build
```
