
## 1. Purpose

This document defines how tasks are created, assigned, executed, reviewed, and completed inside the AI Team Manager.

The goal is to make sure every task has a clear owner, clear status, clear context, and a clear review process.

---

## 2. Core Workflow

The main workflow is:

```text
User Request
    ↓
Codex Understands Request
    ↓
Codex Creates Plan
    ↓
Codex Breaks Work Into Tasks
    ↓
Codex Assigns Tasks and handles the most complex ones itself
    ↓
Agents Execute Work
    ↓
Agents Submit Results
    ↓
Codex Reviews Work
    ↓
Approve / Reject / Request Revision
    ↓
Task Completed
```

---

## 3. Task Creation

Tasks are created by Codex.

A task can be created from:

- A user instruction.
    
- A feature request.
    
- A bug report.
    
- A code review issue.
    
- A failed test.
    
- A blocked dependency.
    
- A project roadmap item.
    

Worker agents do not create official project tasks in V1.

They can suggest tasks, but Codex must approve and create them.

---

## 4. Task Fields

Each task should contain:

- Task ID
    
- Title
    
- Description
    
- Status
    
- Assigned agent
    
- Priority
    
- Difficulty
    
- Required capability
    
- Dependencies
    
- Related files
    
- Expected output
    
- Created time
    
- Updated time
    
- Review status
    

Example:

```json
{
  "task_id": "TASK-042",
  "title": "Build inventory UI",
  "description": "Create the frontend inventory interface with item slots, stack counts, and drag support.",
  "status": "assigned",
  "assigned_to": "OpenCode",
  "priority": "medium",
  "difficulty": 5,
  "required_capability": "frontend",
  "dependencies": ["TASK-039"],
  "related_files": ["src/ui/inventory"],
  "expected_output": ["UI components", "basic tests", "implementation notes"]
}
```

---

## 5. Task Statuses

Tasks move through these statuses:

### Pending

The task exists but has not been assigned yet.

### Assigned

Codex has assigned the task to an agent.

### Working

The assigned agent has started execution.

### Blocked

The task cannot continue until a dependency, clarification, or issue is resolved.

### Review

The agent has submitted work and Codex is reviewing it.

### Revision Requested

Codex found issues and sent the task back to the agent.

### Completed

Codex approved the work.

### Cancelled

The task is no longer needed.

---

## 6. Task Ownership Rules

Every task must have exactly one owner.

Only Codex can assign task ownership.

Worker agents cannot claim tasks.

Worker agents cannot reassign tasks.

If an agent cannot complete a task, it must mark the task as blocked and explain why.

Codex then decides whether to:

- Provide clarification.
    
- Reassign the task.
    
- Split the task.
    
- Complete the task itself.
    
- Cancel the task.
    

---

## 7. Assignment Logic

Codex assigns tasks based on:

- Task difficulty.
    
- Task risk.
    
- Required capability.
    
- Agent intelligence.
    
- Agent current workload.
    
- Agent reliability.
    
- Project importance.
    
- Whether delegation is worth it.
    

Codex should keep the hardest, most complex, and most architecture-sensitive tasks for itself.

Codex should delegate simpler, isolated, or lower-risk tasks to worker agents.

---

## 8. Agent Task Ranking

Suggested default assignment order:

### Codex

Handles:

- Architecture.
    
- Complex reasoning.
    
- Critical systems.
    
- High-risk changes.
    
- Reviews.
    
- Final decisions.
    
- Deep debugging.
    

### AntiGravity

Handles:

- Complex implementation.
    
- Backend logic.
    
- Systems work.
    
- Medium-high difficulty tasks.
    

### OpenCode

Handles:

- Standard implementation.
    
- UI work.
    
- Feature components.
    
- Refactors.
    

### Blackbox

Handles:

- Boilerplate.
    
- Simple fixes.
    
- Documentation.
    
- Repetitive code.
    

### Kilocode / Mimo Code

Handles:

- Small tasks.
    
- Simple tests.
    
- Cleanup.
    
- Basic documentation.
    
- Minor utilities.
    

---

## 9. Context Package

Before assigning a task, Codex creates a context package.

The context package should include:

- Task description.
    
- Project summary.
    
- Relevant files.
    
- Relevant documentation.
    
- Constraints.
    
- Dependencies.
    
- Expected output.
    
- Coding rules.
    
- What not to change.
    

Worker agents should receive only the context needed for the assigned task.

---

## 10. Task Execution

When an agent starts a task, it must:

- Confirm it has received the assignment.
    
- Read the provided context.
    
- Work only inside the assigned scope.
    
- Avoid unrelated changes.
    
- Report meaningful progress.
    
- Ask Codex for clarification if blocked.
    
- Submit results when finished.
    

---

## 11. Progress Updates

Agents should post progress updates to the activity feed.

Examples:

```text
OpenCode started TASK-042.
```

```text
AntiGravity completed backend implementation for TASK-039.
```

```text
Blackbox is blocked because the API schema is missing.
```

Progress updates should be visible to the user.

---

## 12. Submission Format

When an agent finishes work, it must submit:

- Summary of work completed.
    
- Files changed.
    
- Important decisions made.
    
- Tests added or updated.
    
- Known issues.
    
- Anything Codex should review carefully.
    

Example:

```json
{
  "task_id": "TASK-042",
  "status": "submitted",
  "summary": "Created inventory UI components and connected them to mock inventory data.",
  "files_changed": [
    "src/components/InventoryPanel.tsx",
    "src/components/InventorySlot.tsx"
  ],
  "tests": [
    "src/components/InventoryPanel.test.tsx"
  ],
  "known_issues": []
}
```

---

## 13. Review Workflow

All submitted work must be reviewed by Codex.

Codex checks:

- Does the work satisfy the task?
    
- Does it follow project architecture?
    
- Did the agent modify unrelated files?
    
- Are there bugs?
    
- Are tests needed?
    
- Is the implementation maintainable?
    
- Does documentation need updating?
    

Codex can then:

- Approve the task.
    
- Request revision.
    
- Reassign the task.
    
- Fix the work itself.
    
- Cancel the task.
    

---

## 14. Revision Workflow

If Codex requests a revision, the task status becomes:

```text
Revision Requested
```

The assigned agent receives:

- What is wrong.
    
- What needs to change.
    
- Which files to inspect.
    
- Expected correction.
    

The task returns to review after the agent resubmits.

---

## 15. Completion Rules

A task is only complete when Codex approves it.

Worker agents cannot mark their own work as completed.

Completion requires:

- Work submitted.
    
- Review passed.
    
- No unresolved blockers.
    
- Relevant files logged.
    
- Final result recorded.
    

---

## 16. Activity Feed Events

The task workflow should create visible feed events for:

- Task created.
    
- Task assigned.
    
- Agent started work.
    
- Agent progress update.
    
- Agent blocked.
    
- Agent submitted work.
    
- Codex started review.
    
- Codex approved work.
    
- Codex requested revision.
    
- Task completed.
    
- Task cancelled.
    

---

## 17. V1 Non-Goals

V1 does not include:

- Automatic Git merging.
    
- Self-assigning agents.
    
- Drag-and-drop task planning.
    
- Agent performance scoring.
    
- Multi-agent task negotiation.
    
- Fully autonomous task creation without Codex approval.
    
- Complex dependency graph visualization.
    

---

## 18. Core Principles

- Codex owns task planning.
    
- Codex owns task assignment.
    
- Codex owns review.
    
- Workers execute assigned scope only.
    
- Every task has one owner.
    
- Every task has visible status.
    
- Every important action is logged.
    
- No work is complete without Codex approval.