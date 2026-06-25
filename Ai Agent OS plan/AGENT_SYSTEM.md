
## 1. Purpose

The Agent System defines how AI agents collaborate, communicate, and execute work within a project.

The goal is to create a centralized AI engineering team where every agent has a clearly defined responsibility and Codex acts as the lead engineer.

---

# 2. System Hierarchy

The hierarchy is intentionally not flat.

```text
Developer
      │
      ▼
Codex (Lead Engineer / Project Manager)
      │
 ┌────┼────┐
 ▼    ▼    ▼
AntiGravity
OpenCode
Blackbox
Kilocode
Mimo Code
Future Agents
```

Codex has complete authority over project execution.

Worker agents never coordinate the project themselves.

---

# 3. Agent Responsibilities

## Developer

Responsibilities

- Define product goals.
    
- Answer design questions.
    
- Approve important decisions.
    
- Review overall progress.
    

The developer does not manually distribute work between agents.

---

## Codex

Codex is the brain of the system.

Responsibilities

- Understand project requirements.
    
- Maintain complete project context.
    
- Create implementation plans.
    
- Break features into subtasks.
    
- Decide which work to delegate.
    
- Complete the hardest and highest-risk tasks.
    
- Review all completed work.
    
- Maintain architectural consistency.
    
- Request revisions when necessary.
    
- Keep project documentation updated.
    

Codex has complete visibility into the project.

---

## Worker Agents

Examples

- AntiGravity
    
- OpenCode
    
- Blackbox
    
- Kilocode
    
- Mimo Code
    

Responsibilities

- Execute assigned work.
    
- Report progress.
    
- Submit results.
    
- Answer Codex questions.
    
- Request clarification when blocked.
    

Worker agents never:

- Self-assign tasks.
    
- Modify project architecture.
    
- Merge completed work.
    
- Override Codex decisions.
    

---

# 4. Agent Intelligence

Agents have different capabilities.

Codex uses these capabilities when assigning work.

---

# 5. Communication Model

The system uses centralized communication.

```text
Developer
      │
      ▼
Codex
      │
      ▼
Orchestrator
      │
 ┌────┼────┐
 ▼    ▼    ▼
Workers
```

All communication flows through the orchestrator.

Workers never communicate directly with one another.

The UI presents communication as a shared activity feed for readability.

---

# 6. Task Ownership

Every task has exactly one owner.

States

- Pending
    
- Assigned
    
- Working
    
- Review
    
- Completed
    
- Blocked
    

Only Codex may assign ownership.

Worker agents cannot claim tasks.

---

# 7. Context Ownership

Codex owns complete project knowledge.

Worker agents receive only the context required for their current task.

This includes:

- Relevant files
    
- Related documentation
    
- Project constraints
    
- Dependencies
    
- Expected output
    

This minimizes unnecessary context and improves focus.

---

# 8. Review Workflow

All completed work follows the same process.

```text
Task Assigned

↓

Worker Completes

↓

Submit To Codex

↓

Review

↓

Approve
or
Request Revision
```

No task is considered complete until Codex approves it.

---

# 9. Project Memory

Codex maintains the project's long-term memory.

Examples

- Architecture decisions
    
- Coding conventions
    
- Roadmap
    
- Important discussions
    
- Completed tasks
    

Worker agents do not maintain permanent project memory in V1.

---

# 10. Human Interaction

The developer communicates only with Codex.

The developer never assigns work directly to worker agents.

All user instructions are interpreted by Codex.

Examples

User

"Build an inventory system."

↓

Codex

Creates implementation plan.

Creates tasks.

Assigns work.

Begins implementation.

---

# 11. Agent Lifecycle

Worker agents follow this lifecycle.

```text
Idle

↓

Task Assigned

↓

Context Loaded

↓

Working

↓

Submit Results

↓

Idle
```

Codex remains active for the duration of the project.

---

# 12. Extensibility

The system must support future agent types without architectural changes.

Every new agent should define:

- Name
    
- Role
    
- Capabilities
    
- Status
    
- Adapter
    
- Supported task types
    

The orchestrator should be able to register new agents dynamically.

---

# 13. Core Principles

- Codex is the single source of truth.
    
- One owner per task.
    
- Architecture consistency is more important than speed.
    
- Every action is visible.
    
- Every decision is logged.
    
- Every task is reviewed.
    
- The human always remains in control.
    
- Worker agents execute work; Codex leads the team.