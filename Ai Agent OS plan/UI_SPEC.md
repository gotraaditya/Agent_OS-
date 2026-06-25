
## 1. UI Vision

The app should feel like a professional AI development command center.

It should combine the feeling of:

- A code editor
    
- A team chat
    
- A task tracker
    
- An AI agent monitor
    

The interface should feel serious, technical, fast, and focused.

---

## 2. Visual Style

### Theme

- Black background.
    
- Dark panels.
    
- Thin borders.
    
- Subtle shadows.
    
- Minimal gradients.
    
- High contrast text.
    
- Soft neon-style accents.
    

### Mood

The UI should feel:

- Professional.
    
- Developer-focused.
    
- Futuristic but usable.
    
- Clean, not flashy.
    
- Dense but readable.
    

### Accent Colors

Use accent colors to separate meaning:

- Purple: Codex / primary actions.
    
- Green: completed / online / approved.
    
- Orange: active worker task.
    
- Blue: system events / information.
    
- Red: errors / rejected / failed.
    
- Yellow: warnings / blocked / waiting.
    

---

## 3. Main Layout

The V1 main layout uses four major areas:

```text
┌──────────────────────────────────────────────┐
│ Top Header                                   │
├──────────────┬───────────────────┬───────────┤
│ Left Panel   │ Center Panel      │ Right     │
│ Navigator    │ Activity Feed     │ Agents    │
├──────────────┴───────────────────┴───────────┤
│ Bottom Inspector                             │
└──────────────────────────────────────────────┘
```

---

## 4. Top Header

The header should always remain visible.

### Header Content

- App logo.
    
- Current project name.
    
- Current Git branch.
    
- Project status.
    
- New Task button.
    
- Ask Codex button.
    
- Search bar.
    
- Notifications icon.
    
- User profile/avatar.
    

### Header Behavior

- Project name opens project switcher.
    
- Branch opens branch selector.
    
- New Task opens task creation modal.
    
- Ask Codex focuses the main input box.
    
- Search opens global search.
    

---

## 5. Left Panel: Project Navigator

The left panel is the project navigation area.

### Tabs

- Files
    
- Tasks
    
- Knowledge
    

### Files Tab

Displays a VS Code-style project file tree.

Features:

- Expand/collapse folders.
    
- Open files.
    
- Highlight selected file.
    
- Search files.
    
- Filter files.
    
- Show basic file icons.
    
- Show modified file indicators.
    

### Tasks Tab

Displays task groups:

- Active
    
- In Review
    
- Completed
    
- Blocked
    

Each task item should show:

- Task title.
    
- Assigned agent.
    
- Status.
    
- Priority.
    
- Small progress indicator.
    

### Knowledge Tab

Displays project knowledge documents:

- Architecture.
    
- Roadmap.
    
- Requirements.
    
- Notes.
    
- Decisions.
    

---

## 6. Center Panel: Activity Feed

The center panel is the main workspace.

It should look like a group chat, but function as the project activity feed.

### Feed Includes

- User messages to Codex.
    
- Codex messages.
    
- Worker agent updates.
    
- Task assignments.
    
- Task completions.
    
- Review updates.
    
- System events.
    
- File change summaries.
    

### Message Types

- User message.
    
- Codex message.
    
- Worker agent message.
    
- System event.
    
- Task card.
    
- Review card.
    
- File change card.
    
- Error card.
    

### Input Box

The input box is always sent to Codex only.

Placeholder:

```text
Message Codex...
```

Users do not directly command worker agents in V1.

Codex decides whether to:

- Answer directly.
    
- Ask clarifying questions.
    
- Create tasks.
    
- Assign work.
    
- Work on the task itself.
    
- Review completed work.
    

---

## 7. Right Panel: Agent Status

The right panel shows all registered agents.

### Agent Card Content

Each agent card should show:

- Agent name.
    
- Role label.
    
- Online/idle/working/error status.
    
- Current task.
    
- Progress percentage.
    
- Current branch.
    
- Last active time.
    

### Agent Roles

Examples:

- Codex: Lead Engineer.
    
- AntiGravity: Backend Expert.
    
- OpenCode: Frontend Expert.
    
- Blackbox: QA Engineer.
    
- Kilocode: Utility Worker.
    
- Mimo Code: Junior Worker.
    

### Agent Card Behavior

Clicking an agent updates the Bottom Inspector with:

- Recent messages.
    
- Current task.
    
- Execution logs.
    
- Assigned branch.
    
- Recent files changed.
    

---

## 8. Bottom Inspector

The bottom inspector is context-sensitive.

It changes depending on what the user selects.

### Default Tabs

- Changes
    
- Logs
    
- Reviews
    
- Terminal
    
- Files
    

### When File Selected

Show:

- Code viewer.
    
- File path.
    
- Last modified time.
    
- Related task.
    
- Agent that modified it.
    

### When Task Selected

Show:

- Task description.
    
- Assigned agent.
    
- Status.
    
- Dependencies.
    
- Related files.
    
- Review history.
    

### When Agent Selected

Show:

- Agent logs.
    
- Current task.
    
- Recent actions.
    
- Runtime output.
    

### When Review Selected

Show:

- Review result.
    
- Changed files.
    
- Codex comments.
    
- Approval/rejection status.
    

---

## 9. File Viewer

V1 should support opening project files.

### Features

- Read-only code viewer.
    
- Syntax highlighting.
    
- File tabs.
    
- Line numbers.
    
- Search inside file.
    
- Highlight changed lines.
    

V1 should not include full file editing.

---

## 10. Diff Viewer

The app should display file changes caused by agents.

### Features

- Added lines.
    
- Removed lines.
    
- Modified files.
    
- Created files.
    
- Deleted files.
    
- Split diff view.
    
- Unified diff view.
    

---

## 11. Interaction Rules

- The user talks only to Codex.
    
- Worker agents appear in the feed but are not directly controlled by the user in V1.
    
- Codex owns task assignment.
    
- All major actions must appear in the activity feed.
    
- Errors must be visible and understandable.
    
- The UI should never hide agent activity from the user.
    
- The system should feel transparent, not magical.
    

---

## 12. V1 Non-Goals

V1 does not include:

- Full code editing.
    
- Direct messaging worker agents.
    
- Drag-and-drop task planning.
    
- Advanced analytics.
    
- Custom themes.
    
- Voice interface.
    
- Multi-user collaboration.
    
- Cloud sync.
    
- Mobile UI.
    

---

## 13. Reference Direction

The UI should be inspired by modern dark developer tools and team communication apps.

The layout direction should resemble:

- A black-background developer dashboard.
    
- A Slack-like activity feed.
    
- A VS Code-style file explorer.
    
- A GitHub-style diff viewer.
    
- Agent status cards on the right.
    

The final result should feel like an AI engineering control room.