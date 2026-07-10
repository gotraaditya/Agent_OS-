# Agent Adapter Audit

Generated: 2026-07-08

## Current Architecture

AI Team Manager stores projects, agents, tasks, messages, reviews, and file changes in SQLite. `AgentManager.tick()` is the orchestrator loop: it finds assigned/working/review tasks, dispatches work to the selected adapter, records logs/progress, captures diffs, creates review records, and writes activity feed messages.

The adapter contract now lives in `backend/app/agents/base.py` and includes:

- `start()`, `stop()`, `get_status()`, `send_task()`, `send_task_package()`
- `stream_output()`, `capture_result()`, `capture_error()`, `submit_result()`, `health_check()`
- capability flags for workspace execution, file modification, streaming, and task resume
- structured `AgentTaskPackage` and `AgentRunResult`

## Adapter Status

| Agent | Adapter | Status | Notes |
| --- | --- | --- | --- |
| Codex | API / CLI lead coordinator | Partially real | User messages route to Codex orchestration logic. The old `codex_cli_stub.js` still exists only as legacy/default lead CLI config and should not be used as proof of real Codex lead behavior. |
| Codex Worker | `RealCodexAdapter` | Real adapter implemented | Uses optional `openai_codex`; falls back to `codex exec`. On this machine `codex` is installed and `openai_codex` is not installed. |
| AntiGravity | `AntiGravityAdapter` | Real adapter implemented | Supports `agy --print` when configured and the local `python -m agents.antigravity` harness for adapter mechanics. `agy.exe` is installed. |
| OpenCode | `CLIWorkerAdapter` | Adapter implemented; live probe no-op | `opencode` is installed and supports `opencode run`, but the bounded file-creation probe returned a generic response and changed 0 files. |
| Blackbox | `CLIWorkerAdapter` | Adapter implemented; live probe no-op | `blackbox` is installed and supports `--prompt`, but the bounded file-creation probe returned a generic response and changed 0 files. |
| Kilocode | `CLIWorkerAdapter` | Real CLI adapter implemented, needs live auth verification | `kilocode` is installed and supports `run`. |
| Mimo Code | `CLIWorkerAdapter` | Real CLI adapter implemented, needs live auth verification | `mimo` is installed and supports `run`, `--trust`, and `--never-ask`. |
| Other custom agents | `UnavailableAgentAdapter` or `MockAgentAdapter` | Honest fallback | Mock adapters run only when `AI_TEAM_ENABLE_MOCK_ADAPTERS=true`; otherwise unsupported/misconfigured agents are blocked visibly. |

## Stubs, Mocks, And Demo Data

- `backend/app/agents/codex_cli_stub.js` remains in the repo as a legacy stub. It is no longer used for implementation tasks and should be retired once the lead Codex chat path is fully connected to real Codex.
- `MockAgentAdapter` remains for explicit demo/development mode only.
- Seed messages/tasks still include historical demo-style worker activity. Initialization now updates registered worker adapter configuration to real CLI commands when found on PATH, or unavailable when missing.
- `BottomInspector.tsx` still includes fallback `MOCK_DIFFS` for old seeded tasks without persisted `file_changes`. Real task diffs are preferred when present.

## CLI Availability On This Machine

- `codex`: `C:\Users\Lenovo\.local\bin\codex.cmd`
- `agy`: `C:\Users\Lenovo\AppData\Local\agy\bin\agy.exe`
- `opencode`: `C:\Users\Lenovo\AppData\Roaming\npm\opencode.ps1`
- `blackbox`: `C:\Users\Lenovo\.local\bin\blackbox.cmd`
- `kilocode`: `C:\Users\Lenovo\AppData\Roaming\npm\kilocode.ps1`
- `mimo`: `C:\Users\Lenovo\AppData\Roaming\npm\mimo.ps1`
- `openai_codex` Python SDK: unavailable

## Risks Found

- Live auth/provider/task effectiveness for OpenCode, Blackbox, Kilocode, and Mimo Code has not yet been validated through a successful real edit task.
- Generic CLI adapters can launch real tools and need live tests with disposable workspaces before they should be considered production-stable.
- Existing seed data can still look like historical successful work. Real new work is now routed through real/unavailable/mock-explicit adapter states.
- Lead Codex chat currently uses deterministic backend routing for task creation, not a full live Codex lead conversation.
- Frontend fallback mock diffs should eventually be removed once all seeded demo tasks have persisted file changes.
