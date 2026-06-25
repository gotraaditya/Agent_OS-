
## 1. Purpose

This document defines the step-by-step roadmap for building Version 1 of AI Team Manager.

V1 should prove the core concept:

> A Windows desktop app where Codex acts as the lead engineer, manages the project, delegates suitable tasks to worker agents, tracks progress, and reviews all completed work.

---

## 2. V1 Goal

The goal of V1 is not to build a fully autonomous AI company.

The goal is to build a working local command center where:

- The user can open a project.
    
- The user can message Codex.
    
- Codex can create and assign tasks.
    
- Worker agents can receive assigned tasks.
    
- Agent activity appears in a shared feed.
    
- Project files can be browsed and opened.
    
- Task results can be reviewed by Codex.
    
- Everything is logged clearly.
    

---

## 3. V1 Core Features

V1 must include:

- Windows desktop app.
    
- Project workspace system.
    
- Left project navigator.
    
- Center activity feed.
    
- Right agent status panel.
    
- Bottom inspector panel.
    
- File explorer.
    
- Read-only code viewer.
    
- Task creation and tracking.
    
- Agent registration.
    
- Agent status monitoring.
    
- Codex-only user input.
    
- Basic agent adapter system.
    
- Task assignment workflow.
    
- Task submission workflow.
    
- Codex review workflow.
    
- Activity/event logging.
    

---

## 4. V1 Non-Goals

V1 does not include:

- Full code editing.
    
- Automatic Git merging.
    
- Advanced performance analytics.
    
- Vector memory.
    
- Voice control.
    
- Cloud sync.
    
- Multi-user collaboration.
    
- Direct user messaging to worker agents.
    
- Worker self-assignment.
    
- Fully autonomous project planning.
    
- Complex task dependency graph visualization.
    
- Plugin marketplace.
    
- Mobile support.
    

---

## 5. Build Phases

---

# Phase 1: Project Foundation

## Goal

Set up the basic application structure.

## Tasks

- Create project repository.
    
- Set up Windows desktop app shell.
    
- Set up frontend structure.
    
- Set up backend structure.
    
- Set up local database.
    
- Create basic app layout.
    
- Add placeholder data.
    

## Completion Criteria

- App launches locally.
    
- Main window opens.
    
- Basic layout is visible.
    
- Placeholder panels render correctly.
    

---

# Phase 2: Static UI Prototype

## Goal

Build the V1 interface before connecting real agent logic.

## Tasks

- Build top header.
    
- Build left project navigator.
    
- Build center activity feed.
    
- Build right agent status panel.
    
- Build bottom inspector.
    
- Apply black background visual style.
    
- Add fake files, fake tasks, fake messages, and fake agents.
    

## Completion Criteria

- UI visually matches the intended command center direction.
    
- Layout feels close to final V1 design.
    
- User can switch between Files, Tasks, and Knowledge tabs.
    
- User can click fake files, tasks, and agents.
    

---

# Phase 3: Project Workspace System

## Goal

Allow the app to open and understand a local project folder.

## Tasks

- Add project open/select flow.
    
- Store project metadata.
    
- Scan project folder.
    
- Display real file tree.
    
- Detect folders and files.
    
- Ignore unnecessary folders like `node_modules`, `.git`, `dist`, and build outputs.
    
- Save recent projects.
    

## Completion Criteria

- User can open a local project.
    
- Left panel displays real project files.
    
- Project name appears in the header.
    
- Recently opened projects are saved.
    

---

# Phase 4: File Viewer

## Goal

Allow users to inspect project files inside the app.

## Tasks

- Open selected files from file tree.
    
- Display file content in bottom inspector or main viewer.
    
- Add syntax highlighting.
    
- Add line numbers.
    
- Add file tabs.
    
- Add basic file search.
    
- Support common code and markdown files.
    

## Completion Criteria

- User can click a file and view its code.
    
- File viewer is read-only.
    
- Large or unsupported files are handled safely.
    

---

# Phase 5: Local Database

## Goal

Persist projects, tasks, agents, messages, and events.

## Tasks

Create database tables for:

- Projects
    
- Agents
    
- Tasks
    
- Messages
    
- Activity events
    
- Reviews
    
- File changes
    

## Completion Criteria

- App data persists after restart.
    
- Tasks, messages, and agents are loaded from local storage.
    
- Activity feed is generated from stored events.
    

---

# Phase 6: Task System

## Goal

Implement the V1 task workflow.

## Tasks

- Create task model.
    
- Add task statuses.
    
- Add assigned agent field.
    
- Add priority and difficulty fields.
    
- Add related files.
    
- Add expected output.
    
- Show tasks in left panel.
    
- Show task details in bottom inspector.
    
- Add task events to activity feed.
    

## Completion Criteria

- Tasks can be created.
    
- Tasks can be assigned.
    
- Tasks can move through V1 statuses.
    
- Task changes appear in the activity feed.
    

---

# Phase 7: Agent Registry

## Goal

Allow the app to know which agents exist and what they are good at.

## Tasks

Add agent profiles for:

- Codex
    
- AntiGravity
    
- OpenCode
    
- Blackbox
    
- Kilocode
    
- Mimo Code
    

Each profile should include:

- Name
    
- Role
    
- Capabilities
    
- Intelligence ranking
    
- Status
    
- Current task
    
- Adapter type
    

## Completion Criteria

- Agents appear in the right panel.
    
- Agent cards show status and current task.
    
- Agent details open in the bottom inspector.
    

---

# Phase 8: Codex Command Input

## Goal

Allow the user to communicate with Codex from inside the app.

## Tasks

- Add input box at bottom of center panel.
    
- Route all user messages to Codex.
    
- Store user messages.
    
- Store Codex responses.
    
- Display both in activity feed.
    
- Prevent direct user commands to worker agents in V1.
    

## Completion Criteria

- User can type a message to Codex.
    
- Message appears in activity feed.
    
- Codex response appears in activity feed.
    
- Worker agents are not directly messaged by the user.
    

---

# Phase 9: Agent Adapter Foundation

## Goal

Create the abstraction that will later connect real CLI agents.

## Tasks

Define a common agent adapter interface:

- Start agent.
    
- Stop agent.
    
- Send task.
    
- Get status.
    
- Capture output.
    
- Handle errors.
    
- Submit result.
    

Create mock adapters first.

## Completion Criteria

- System can simulate sending tasks to agents.
    
- Agents can return fake results.
    
- Agent status updates appear in the UI.
    
- The app does not depend on any specific agent implementation yet.
    

---

# Phase 10: Task Assignment Simulation

## Goal

Test the full workflow without real agent execution.

## Tasks

- Codex creates fake tasks from user input.
    
- Codex assigns tasks based on agent capabilities.
    
- Agents show as working.
    
- Agents submit simulated results.
    
- Codex reviews simulated work.
    
- Tasks become completed or revision requested.
    

## Completion Criteria

- Full workflow works end-to-end with mock agents.
    
- Activity feed clearly shows every step.
    
- Task statuses update correctly.
    
- Agent statuses update correctly.
    

---

# Phase 11: Real Agent Connection - Codex First

## Goal

Connect the first real agent: Codex.

## Tasks

- Create Codex adapter.
    
- Launch Codex through supported local/CLI method.
    
- Send user instruction to Codex.
    
- Capture Codex response.
    
- Store response in activity feed.
    
- Handle failures and timeouts.
    

## Completion Criteria

- User can message real Codex from the app.
    
- Codex responds inside the app.
    
- No app switching is required.
    

---

# Phase 12: Worker Agent Connection

## Goal

Connect one worker agent after Codex works reliably.

## Suggested first worker

AntiGravity.

## Tasks

- Create AntiGravity adapter.
    
- Send assigned task package to AntiGravity.
    
- Launch AntiGravity inside the selected project workspace.
    
- Capture output.
    
- Store progress updates.
    
- Submit result back to Codex for review.
    

## Completion Criteria

- Codex can assign a task to AntiGravity.
    
- AntiGravity receives project-specific context.
    
- AntiGravity works inside the correct project folder.
    
- Result appears in the activity feed.
    

---

# Phase 13: Review Workflow

## Goal

Make Codex the required reviewer for all worker output.

## Tasks

- Worker submits task result.
    
- Task status changes to Review.
    
- Codex reviews result.
    
- Codex approves or requests revision.
    
- Review appears in bottom inspector.
    
- Changed files are logged.
    

## Completion Criteria

- Worker agents cannot mark tasks complete.
    
- Codex approval is required.
    
- Review decisions are visible and stored.
    

---

# Phase 14: V1 Stabilization

## Goal

Make the app usable and reliable enough for real project testing.

## Tasks

- Improve error handling.
    
- Improve empty states.
    
- Add loading states.
    
- Add agent failure states.
    
- Add app settings.
    
- Add logging.
    
- Test with multiple projects.
    
- Test with long activity feeds.
    
- Polish UI spacing and responsiveness.
    

## Completion Criteria

- App can be used on a real project.
    
- User can open project, message Codex, view files, track tasks, and monitor agents.
    
- Core workflow is stable.
    

---

## 6. Recommended Build Order

The recommended order is:

```text
1. Static UI
2. Project workspace
3. File tree
4. File viewer
5. Database
6. Task system
7. Agent registry
8. Activity feed
9. Mock agents
10. Codex adapter
11. AntiGravity adapter
12. Review workflow
13. Polish
```

---

## 7. V1 Success Criteria

V1 is successful when:

- The app runs as a Windows desktop app.
    
- A user can open a project folder.
    
- The app displays project files.
    
- The user can open and inspect code.
    
- The user can message Codex inside the app.
    
- Codex can create tasks.
    
- Codex can assign suitable tasks to worker agents.
    
- Worker agents can report progress.
    
- Codex can review completed work.
    
- The user can see all activity in one place.
    
- No manual app switching is required for the core workflow.
    

---

## 8. Final V1 Definition

V1 should feel like:

> A local AI software development command center where Codex leads the project, other agents execute assigned work, and the developer can watch, guide, and review everything from one Windows app.