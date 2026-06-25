# AI Team Manager

AI Team Manager is a Windows desktop command center for coordinating AI coding agents. This repository currently contains **Phase 1: Project Foundation** only.

The current version proves that the basic pieces can run together:

- Electron opens the Windows desktop window.
- Next.js renders a simple structural placeholder.
- FastAPI provides a local backend health endpoint.
- SQLite creates a local database file and records its schema version.

Real agents, project browsing, task workflows, and the polished command-center interface are intentionally left for later phases.

## Prerequisites

Install these tools before starting:

- Node.js 22 or newer
- npm 10 or newer
- Python 3.11 or newer
- Windows PowerShell

## First-time setup

Open PowerShell in this project folder and run:

```powershell
npm run setup
```

This installs the JavaScript packages, creates a local Python environment in `.venv`, and installs the backend packages.

## Start the full desktop app

```powershell
npm run dev
```

That one command starts:

1. FastAPI at `http://127.0.0.1:8000`
2. Next.js at `http://127.0.0.1:3000`
3. Electron after both local servers are ready

Close the Electron window and press `Ctrl+C` in PowerShell to stop the development processes.

## Start pieces separately

Backend only:

```powershell
npm run dev:backend
```

Web frontend only:

```powershell
npm run dev:web
```

Desktop shell only (requires the web frontend and backend to already be running):

```powershell
npm run dev:desktop
```

## Useful checks

```powershell
npm run typecheck
npm run build
npm run check:backend
```

## Project structure

```text
apps/
  desktop/       Electron main process and secure preload bridge
  web/           Next.js and TypeScript frontend
backend/
  app/           FastAPI application code
  database/      Local SQLite data directory
shared/
  types/         Shared TypeScript contracts for later phases
docs/            Phase notes and handoff documentation
scripts/         Windows setup and backend helper scripts
```

## Phase boundaries

Phase 1 includes only the launchable foundation. The next UI-focused phase can replace the placeholder content inside `apps/web/app` without changing the basic Electron/backend startup architecture.

