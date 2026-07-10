# Agent Adapters

Generated: 2026-07-08

## Overview

AI Team Manager uses adapters to run worker agents from the orchestrator. The user talks to Codex in the activity feed; Codex creates tasks; the orchestrator dispatches a structured task package to the assigned worker; the worker leaves changes as an uncommitted diff; Codex review is required before completion.

## Adapter Contract

Every adapter should implement the contract in `backend/app/agents/base.py`:

- lifecycle: `start()`, `stop()`, `get_status()`
- task dispatch: `send_task_package(AgentTaskPackage)`
- output/result capture: `stream_output()`, `capture_result()`, `capture_error()`, `submit_result()`
- diagnostics: `health_check()`
- capability flags: workspace execution, file modification, streaming, task resume

`AgentTaskPackage` includes task ID, title, description, assigned agent, active project path, related files, constraints, expected output, branch, and reporting instructions.

`AgentRunResult` includes agent ID, task ID, status, summary, changed files, tests run, errors, and optional raw output path.

## Built-In Adapters

- `RealCodexAdapter`: runs Codex Worker using the optional Python SDK or `codex exec`.
- `AntiGravityAdapter`: runs AntiGravity with either `agy --print` or the local `python -m agents.antigravity` harness.
- `CLIWorkerAdapter`: runs OpenCode, Blackbox, Kilocode, and Mimo Code through allowlisted non-interactive CLI commands.
- `MockAgentAdapter`: explicit demo mode only. Enable with `AI_TEAM_ENABLE_MOCK_ADAPTERS=true`.
- `UnavailableAgentAdapter`: blocks disabled, missing, unsupported, or misconfigured agents visibly.

## CLI Commands

Default worker commands:

- OpenCode: `opencode run <prompt>`
- Blackbox: `blackbox --prompt <prompt> --yolo --skip-update`
- Kilocode: `kilocode run <prompt>`
- Mimo Code: `mimo run <prompt> --trust --never-ask`
- AntiGravity: `python -m agents.antigravity` by default, or configure `agy --print`
- Codex Worker: `codex -a never exec --json --color never --sandbox danger-full-access -`

All commands are built as argument arrays with `shell=False`. Launch commands are allowlisted by executable name and run with `cwd` set to the selected project workspace.

## Error Handling

Adapters report visible blocked states for:

- missing project paths
- missing or unsupported launch commands
- disabled agents
- missing CLIs
- non-zero process exits
- timeouts
- malformed/no output where required

The orchestrator records blocked task state, agent logs, and system activity feed messages.

## Adding A New Agent

1. Add the agent profile in the registry with a clear `adapterType`.
2. Add an adapter class or extend `CLIWorkerAdapter` with a safe non-interactive command builder.
3. Allowlist the executable.
4. Validate the selected workspace before launch.
5. Capture stdout, stderr, exit code, timeout, and git diff.
6. Return an `AgentRunResult`.
7. Add tests for health check, task package dispatch, error handling, and diff capture.

## Known Limitations

- Live provider/auth verification is still required for OpenCode, Blackbox, Kilocode, and Mimo Code.
- Lead Codex orchestration is still deterministic backend routing rather than a full live Codex lead conversation.
- The frontend still contains fallback mock diffs for historical seeded tasks.
