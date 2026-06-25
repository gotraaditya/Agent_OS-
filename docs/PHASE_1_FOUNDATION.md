# Phase 1 Foundation Handoff

## What exists now

- A root npm workspace coordinates the application.
- Electron provides the secure Windows desktop shell.
- Next.js and TypeScript provide the renderer frontend.
- FastAPI provides the local Python API.
- SQLite is initialized through Python's standard library.
- A small shared TypeScript package is ready for future data contracts.
- PowerShell scripts make setup and backend startup repeatable on Windows.

## Architecture boundary

The Electron main process opens the local Next.js development server. The Next.js screen calls the FastAPI health endpoint. FastAPI initializes the local SQLite database during startup.

No real project, task, agent, message, review, or file data is implemented yet.

## Phase 2 handoff for AntiGravity

AntiGravity can safely work mainly inside:

- `apps/web/app/page.tsx`
- `apps/web/app/globals.css`
- new component folders under `apps/web/components`

The placeholder screen already reserves the intended header, left navigator, central feed, right agent panel, and bottom inspector areas.

The following should remain mocked during the static UI phase:

- project files
- tasks
- feed messages
- agent statuses
- inspector content

Real backend models and routes belong to later roadmap phases.

## Future TODO locations

Search the repository for `TODO(` to find explicit continuation points for packaging, database tables, API routes, and shared models.

