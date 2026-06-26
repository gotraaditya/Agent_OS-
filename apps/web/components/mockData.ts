import { Agent, Task, Message, FileNode } from "../types";

export const mockFiles: FileNode = {
  name: "project-root",
  path: "/",
  isDir: true,
  children: [
    {
      name: "backend",
      path: "/backend",
      isDir: true,
      children: [
        {
          name: "app",
          path: "/backend/app",
          isDir: true,
          children: [
            {
              name: "main.py",
              path: "/backend/app/main.py",
              isDir: false,
              language: "python",
              content: `from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.app.database import get_db, initialize_database
from backend.app.auth import get_current_user

app = FastAPI(title="AI Team Manager API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    initialize_database()

@app.get("/api/health")
def health_check():
    return {"status": "healthy", "database": "connected"}

@app.get("/api/tasks")
def read_tasks(current_user = Depends(get_current_user), db = Depends(get_db)):
    return db.query_all_tasks()
`
            },
            {
              name: "database.py",
              path: "/backend/app/database.py",
              isDir: false,
              language: "python",
              content: `import sqlite3
import os

DATABASE_PATH = os.environ.get("DATABASE_PATH", "ai_team.db")

def get_db():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def initialize_database():
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            agent_name TEXT,
            status TEXT NOT NULL,
            priority TEXT NOT NULL,
            progress INTEGER DEFAULT 0
        )
    """)
    conn.commit()
    conn.close()
`
            },
            {
              name: "auth.py",
              path: "/backend/app/auth.py",
              isDir: false,
              language: "python",
              content: `from fastapi import Header, HTTPException

def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    token = authorization.split(" ")[1]
    if token == "codex-secret-token":
        return {"username": "codex", "role": "lead_agent"}
    return {"username": "developer", "role": "human"}
`
            }
          ]
        },
        {
          name: "requirements.txt",
          path: "/backend/requirements.txt",
          isDir: false,
          language: "text",
          content: `fastapi>=0.100.0
uvicorn>=0.22.0
sqlite3-binary>=0.1.0
pydantic>=2.0.0
python-jose[cryptography]>=4.0.0
`
        }
      ]
    },
    {
      name: "src",
      path: "/src",
      isDir: true,
      children: [
        {
          name: "components",
          path: "/src/components",
          isDir: true,
          children: [
            {
              name: "Dashboard.tsx",
              path: "/src/components/Dashboard.tsx",
              isDir: false,
              language: "typescript",
              content: `import React from 'react';
import { useAgentState } from '../hooks/useAgentState';

export const Dashboard: React.FC = () => {
  const { agents, tasks } = useAgentState();
  
  return (
    <div className="dashboard-grid">
      <div className="summary-card">
        <h3>Active Tasks</h3>
        <p className="highlight">{tasks.filter(t => t.status === 'active').length}</p>
      </div>
      <div className="summary-card">
        <h3>Agents Online</h3>
        <p className="highlight green">{agents.filter(a => a.status === 'online').length}</p>
      </div>
    </div>
  );
};
`
            },
            {
              name: "Navbar.tsx",
              path: "/src/components/Navbar.tsx",
              isDir: false,
              language: "typescript",
              content: `import React from 'react';

export const Navbar: React.FC = () => {
  return (
    <nav className="nav-container">
      <div className="brand">AI Team Manager</div>
      <div className="status-badge">
        <span className="dot pulse green"></span> Active Branch: main
      </div>
    </nav>
  );
};
`
            }
          ]
        },
        {
          name: "App.tsx",
          path: "/src/App.tsx",
          isDir: false,
          language: "typescript",
          content: `import React from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';

function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <main className="content">
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
`
        }
      ]
    },
    {
      name: "package.json",
      path: "/package.json",
      isDir: false,
      language: "json",
      content: `{
  "name": "ai-team-manager-web",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "react": "^19.2.3",
    "react-dom": "^19.2.3",
    "next": "^16.2.9"
  },
  "devDependencies": {
    "typescript": "^6.0.3",
    "@types/react": "^19.2.7"
  }
}`
    },
    {
      name: "README.md",
      path: "/README.md",
      isDir: false,
      language: "markdown",
      content: `# AI Team Manager

A centralized command center for coordinating multiple specialized AI coding agents.

## Getting Started

1. Set up backend virtual environment
2. Install client dependencies: \`npm install\`
3. Run the development server: \`npm run dev\`
`
    }
  ]
};

export const mockKnowledge: Record<string, string> = {
  "Architecture.md": `# System Architecture

The AI Team Manager consists of:
1. **Frontend App (Next.js)**: Runs in desktop window wrapper (Electron) to provide developer dashboard.
2. **Local Agent Orchestrator (FastAPI Backend)**: Executes in local subprocess environment.
3. **Agent Adapters**: CLI and API bindings interface for agents (Codex, AntiGravity, etc.).

\`\`\`
┌──────────────────┐
│   Electron UI    │
└────────┬─────────┘
         │ (HTTP / WS API)
┌────────▼─────────┐
│  Python Backend  │
└────────┬─────────┘
         │ (Subprocesses)
┌────────▼─────────┐
│   CLI Agents     │
└──────────────────┘
\`\`\`
`,
  "Roadmap.md": `# V1 Development Roadmap

- **Phase 1**: Project Foundation (Done)
- **Phase 2**: Static UI Prototype (In Progress)
- **Phase 3**: Workspace System (Pending)
- **Phase 4**: File Viewer (Pending)
- **Phase 5**: Local Database Persistence (Pending)
- **Phase 6**: Task System & Validation (Pending)
`,
  "Requirements.md": `# V1 Feature Requirements

1. **Local Project Context**: The app must load files from a user-specified project folder.
2. **Codex Orchestration**: Users direct Codex, which automatically delegates tasks to specific workers.
3. **Activity Log**: Every agent command execution must write to the unified UI stream.
4. **Code Inspection**: Built-in viewer for review workflow.
`,
  "Decisions.md": `# Architectural Decision Records

## ADR-001: Use SQLite for Local State
* **Context**: We need to persist projects, tasks, reviews, and logs locally.
* **Decision**: Use a single SQLite database file, stored in the project AppData directory.
* **Consequences**: Easy backup, simple query engine, zero system service dependencies.

## ADR-002: Electron + Next.js App
* **Context**: High performance desktop feel combined with rapid HTML5/CSS development.
* **Decision**: Host a Next.js server locally and wrap in an Electron browser window shell.
`
};

export const mockTasks: Task[] = [
  {
    id: "T-1",
    title: "Implement Authentication Middleware",
    agentName: "AntiGravity",
    status: "completed",
    priority: "high",
    progress: 100,
    description: "Write JWT-based OAuth2 auth logic for securing API endpoints in FastAPI. Include token verify routes.",
    relatedFiles: ["/backend/app/auth.py", "/backend/app/main.py"],
    expectedOutput: "Secure /api/tasks and check authorization header tokens.",
    reviewHistory: [
      {
        reviewer: "Codex",
        status: "approved",
        feedback: "Auth middleware verified. Code follows style guide and includes correct HTTP 401 exceptions. Verified database credentials lookup.",
        timestamp: "5m ago"
      }
    ]
  },
  {
    id: "T-2",
    title: "Create Interactive Dashboard UI",
    agentName: "OpenCode",
    status: "active",
    priority: "high",
    progress: 68,
    description: "Assemble the central command panels using Next.js. Implement the sidebars, activity timeline, and bottom terminal component.",
    relatedFiles: ["/src/components/Dashboard.tsx", "/src/App.tsx"],
    expectedOutput: "Flexible flexbox dashboard rendering panels styled with command-center color accents."
  },
  {
    id: "T-3",
    title: "Write Unit Tests for Database Connectors",
    agentName: "Blackbox",
    status: "review",
    priority: "medium",
    progress: 90,
    description: "Construct unit tests covering SQL table initialization, row insertion, queries, and connection errors.",
    relatedFiles: ["/backend/app/database.py"],
    expectedOutput: "Pytest script returning > 90% coverage on sqlite connector methods.",
    reviewHistory: [
      {
        reviewer: "Codex",
        status: "changes_requested",
        feedback: "Coverage is excellent (94%), but please add a mock test for database locked exceptions (sqlite3.OperationalError).",
        timestamp: "10m ago"
      }
    ]
  },
  {
    id: "T-4",
    title: "Optimize Docker Build Image Size",
    agentName: "Kilocode",
    status: "blocked",
    priority: "low",
    progress: 20,
    description: "Configure multi-stage Docker build for python backend to drop image size below 200MB.",
    relatedFiles: ["/backend/requirements.txt"],
    expectedOutput: "Dockerfile output with alpine-slim base packages.",
    reviewHistory: []
  },
  {
    id: "T-5",
    title: "Fix Header Spacing on Mobile Views",
    agentName: "Mimo Code",
    status: "completed",
    priority: "low",
    progress: 100,
    description: "Reduce header padding and stack metadata items vertically on window viewport width <= 768px.",
    relatedFiles: ["/src/components/Navbar.tsx"],
    expectedOutput: "CSS media query adjustments fixing top flex items alignment.",
    reviewHistory: [
      {
        reviewer: "Codex",
        status: "approved",
        feedback: "Visual checked. Spacing is correct on smaller resolutions.",
        timestamp: "1h ago"
      }
    ]
  }
];

export const mockAgents: Agent[] = [
  {
    name: "Codex",
    role: "Lead Engineer",
    status: "online",
    currentTask: "Orchestrating AI Team",
    progress: 100,
    lastActive: "Active now",
    avatar: "CX",
    logs: [
      "[INFO] Codex initialized.",
      "[INFO] Project loaded: ai-team-manager",
      "[INFO] Scanning workspace files... Found 8 files.",
      "[INFO] Analyzing requirements... Task T-2 and T-3 identified.",
      "[ACTION] Assigned T-2 to OpenCode.",
      "[ACTION] Assigned T-3 to Blackbox.",
      "[REVIEW] Reviewing completed task T-1 (Auth Middleware). Status: APPROVED.",
      "[REVIEW] Reviewing task T-3 (DB Unit Tests). Status: CHANGES REQUESTED."
    ],
    description: "Central AI Orchestration agent coordinating developer team members.",
    capabilities: ["architecture", "debugging", "documentation", "testing", "refactoring"],
    intelligenceLevel: "Critical",
    adapterType: "API",
    launchCommand: "node build/codex.js",
    isEnabled: true
  },
  {
    name: "AntiGravity",
    role: "Backend Expert",
    status: "idle",
    currentTask: "Idle - Standby for integration",
    progress: 0,
    lastActive: "5m ago",
    avatar: "AG",
    logs: [
      "[INFO] AntiGravity backend subsystem online.",
      "[ACTION] Started Task T-1: Implement Authentication Middleware.",
      "[INFO] Auth scaffolding created. Writing python auth token verify handlers...",
      "[TEST] Auth tests passed. Coverage: 100%.",
      "[SUBMIT] Submitted T-1 code implementation to Codex.",
      "[INFO] Task T-1 APPROVED by Codex. Subsystem returning to idle standby."
    ],
    description: "Specialized in Python FastAPI, SQLite databases, and server architecture.",
    capabilities: ["backend", "database", "debugging", "testing"],
    intelligenceLevel: "High",
    adapterType: "Mock",
    launchCommand: "python -m agents.antigravity",
    isEnabled: true
  },
  {
    name: "OpenCode",
    role: "Frontend Expert",
    status: "working",
    currentTask: "T-2: Create Interactive Dashboard UI",
    progress: 68,
    lastActive: "Active now",
    avatar: "OC",
    logs: [
      "[INFO] OpenCode frontend subsystem online.",
      "[ACTION] Started Task T-2: Create Interactive Dashboard UI.",
      "[INFO] Setting up components: Sidebar, Header, Activity timeline.",
      "[INFO] Writing flex layouts and dark mode CSS configurations...",
      "[INFO] Completed Sidebar and Header integration. Layout status: 68% complete."
    ],
    description: "Specialized in React, Next.js, CSS layouts, and UI component styling.",
    capabilities: ["frontend", "boilerplate", "refactoring"],
    intelligenceLevel: "High",
    adapterType: "Mock",
    launchCommand: "npm run dev-agent",
    isEnabled: true
  },
  {
    name: "Blackbox",
    role: "QA Engineer",
    status: "working",
    currentTask: "T-3: DB Unit Tests Revision",
    progress: 90,
    lastActive: "2m ago",
    avatar: "BB",
    logs: [
      "[INFO] Blackbox QA subsystem online.",
      "[ACTION] Started Task T-3: Write Unit Tests for Database Connectors.",
      "[TEST] Writing pytest tests for sqlite functions in database.py...",
      "[TEST] Pytest execution succeeded. Coverage: 94%.",
      "[SUBMIT] Submitted T-3 testing suites to Codex for review.",
      "[INFO] Task T-3 REVIEW FEEDBACK: Codex requested db-lock mock tests.",
      "[ACTION] Implementing mock database locking scenarios in test suites (90% done)..."
    ],
    description: "Automated test suite generation, unit tests, and coverage analyzer.",
    capabilities: ["testing", "debugging", "documentation"],
    intelligenceLevel: "Medium",
    adapterType: "CLI",
    launchCommand: "pytest tests/ --cov",
    isEnabled: true
  },
  {
    name: "Kilocode",
    role: "Utility Worker",
    status: "blocked",
    currentTask: "T-4: Docker Build Optimization",
    progress: 20,
    lastActive: "12m ago",
    avatar: "KC",
    logs: [
      "[INFO] Kilocode workspace helper online.",
      "[ACTION] Started Task T-4: Optimize Docker Build Image Size.",
      "[ERROR] Docker engine daemon not running in dev environment. Cannot run builder check.",
      "[WARN] Task T-4 status set to BLOCKED. Waiting for Docker environment daemon start."
    ],
    description: "Helper tasks: Docker builds, environment config, boilerplate cleanup.",
    capabilities: ["devops", "boilerplate"],
    intelligenceLevel: "Low",
    adapterType: "CLI",
    launchCommand: "docker build -t app .",
    isEnabled: true
  },
  {
    name: "Mimo Code",
    role: "Junior Worker",
    status: "idle",
    currentTask: "Idle - Standby",
    progress: 100,
    lastActive: "45m ago",
    avatar: "MC",
    logs: [
      "[INFO] Mimo Code online.",
      "[ACTION] Started Task T-5: Fix Header Spacing on Mobile.",
      "[CSS] Added flex-direction styles inside media query breakpoints.",
      "[SUBMIT] Submitted code changes to Codex.",
      "[INFO] Task T-5 APPROVED by Codex. State set to IDLE."
    ],
    description: "Assists with simple edits, documentation updates, and linting fixes.",
    capabilities: ["documentation", "boilerplate"],
    intelligenceLevel: "Low",
    adapterType: "Mock",
    launchCommand: "npm run lint",
    isEnabled: true
  }
];

export const mockMessages: Message[] = [
  {
    id: "M1",
    sender: "Aditya Gotra",
    senderType: "user",
    text: "Hey Codex, let's start the V1 dashboard implementation and double check our database test coverage.",
    timestamp: "2:10 PM",
    avatar: "AG"
  },
  {
    id: "M2",
    sender: "Codex",
    senderType: "codex",
    text: "Acknowledged. I have scanned our files and requirements. I am setting up the development tasks for Phase 2. I have assigned the frontend work (T-2) to OpenCode, and the QA database verification (T-3) to Blackbox.",
    timestamp: "2:11 PM",
    avatar: "CX"
  },
  {
    id: "M3",
    sender: "System",
    senderType: "system",
    text: "Task T-2 (Create Interactive Dashboard UI) assigned to OpenCode",
    timestamp: "2:11 PM",
    taskCard: {
      id: "T-2",
      title: "Create Interactive Dashboard UI",
      status: "active",
      agentName: "OpenCode"
    }
  },
  {
    id: "M4",
    sender: "System",
    senderType: "system",
    text: "Task T-3 (Write Unit Tests for Database Connectors) assigned to Blackbox",
    timestamp: "2:11 PM",
    taskCard: {
      id: "T-3",
      title: "Write Unit Tests for Database Connectors",
      status: "active",
      agentName: "Blackbox"
    }
  },
  {
    id: "M5",
    sender: "OpenCode",
    senderType: "worker",
    text: "I have started scaffolding the React components for the dashboard workspace. Writing flex layouts and styles inside `src/components/Dashboard.tsx`.",
    timestamp: "2:15 PM",
    avatar: "OC"
  },
  {
    id: "M6",
    sender: "Blackbox",
    senderType: "worker",
    text: "Writing initial pytest tests for `backend/app/database.py`. Verifying sqlite database create and retrieve workflows.",
    timestamp: "2:18 PM",
    avatar: "BB"
  },
  {
    id: "M7",
    sender: "System",
    senderType: "system",
    text: "OpenCode updated progress on T-2: Dashboard layout completed (68%). Working on the Bottom Inspector tabs.",
    timestamp: "2:20 PM"
  },
  {
    id: "M8",
    sender: "System",
    senderType: "system",
    text: "Task T-3 submitted for Codex review by Blackbox",
    timestamp: "2:22 PM",
    fileChanges: {
      summary: "Created unit test suite for SQLite connection methods.",
      files: [
        { path: "/backend/app/database.py", additions: 5, deletions: 1, status: "modified" },
        { path: "/tests/test_database.py", additions: 42, deletions: 0, status: "added" }
      ]
    }
  },
  {
    id: "M9",
    sender: "Codex",
    senderType: "codex",
    text: "Reviewing Blackbox's tests for T-3. Test suite coverage is excellent (94%), but the connection tests fail to mock database lock exceptions. I have requested revisions for T-3.",
    timestamp: "2:24 PM",
    avatar: "CX",
    reviewCard: {
      taskId: "T-3",
      taskTitle: "Write Unit Tests for Database Connectors",
      status: "changes_requested",
      feedback: "Please add a test simulating sqlite3.OperationalError database locked scenarios to ensure the retry connection wrapper works correctly."
    }
  },
  {
    id: "M10",
    sender: "Blackbox",
    senderType: "worker",
    text: "Understood Codex. I am adding mock database lock tests. I expect to resubmit shortly.",
    timestamp: "2:26 PM",
    avatar: "BB"
  }
];
