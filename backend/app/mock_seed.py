import json
import sqlite3
from pathlib import Path
from backend.app.config import PROJECT_ROOT

# Mock project files trees
MOCK_FILES_P1 = {
    "name": "project-root",
    "path": "/",
    "isDir": True,
    "children": [
        {
            "name": "backend",
            "path": "/backend",
            "isDir": True,
            "children": [
                {
                    "name": "app",
                    "path": "/backend/app",
                    "isDir": True,
                    "children": [
                        {
                            "name": "main.py",
                            "path": "/backend/app/main.py",
                            "isDir": False,
                            "language": "python",
                            "content": 'from fastapi import FastAPI, Depends, HTTPException\nfrom fastapi.middleware.cors import CORSMiddleware\nfrom backend.app.database import get_db, initialize_database\nfrom backend.app.auth import get_current_user\n\napp = FastAPI(title="AI Team Manager API", version="0.1.0")\n\napp.add_middleware(\n    CORSMiddleware,\n    allow_origins=["*"],\n    allow_credentials=True,\n    allow_methods=["*"],\n    allow_headers=["*"],\n)\n\n@app.on_event("startup")\ndef on_startup():\n    initialize_database()\n\n@app.get("/api/health")\ndef health_check():\n    return {"status": "healthy", "database": "connected"}\n\n@app.get("/api/tasks")\ndef read_tasks(current_user = Depends(get_current_user), db = Depends(get_db)):\n    return db.query_all_tasks()\n'
                        },
                        {
                            "name": "database.py",
                            "path": "/backend/app/database.py",
                            "isDir": False,
                            "language": "python",
                            "content": 'import sqlite3\nimport os\n\nDATABASE_PATH = os.environ.get("DATABASE_PATH", "ai_team.db")\n\ndef get_db():\n    conn = sqlite3.connect(DATABASE_PATH)\n    conn.row_factory = sqlite3.Row\n    try:\n        yield conn\n    finally:\n        conn.close()\n\ndef initialize_database():\n    conn = sqlite3.connect(DATABASE_PATH)\n    cursor = conn.cursor()\n    cursor.execute("""\n        CREATE TABLE IF NOT EXISTS tasks (\n            id TEXT PRIMARY KEY,\n            title TEXT NOT NULL,\n            agent_name TEXT,\n            status TEXT NOT NULL,\n            priority TEXT NOT NULL,\n            progress INTEGER DEFAULT 0\n        )\n    """)\n    conn.commit()\n    conn.close()\n'
                        },
                        {
                            "name": "auth.py",
                            "path": "/backend/app/auth.py",
                            "isDir": False,
                            "language": "python",
                            "content": 'from fastapi import Header, HTTPException\n\ndef get_current_user(authorization: str = Header(None)):\n    if not authorization or not authorization.startswith("Bearer "):\n        raise HTTPException(status_code=401, detail="Unauthorized")\n    \n    token = authorization.split(" ")[1]\n    if token == "codex-secret-token":\n        return {"username": "codex", "role": "lead_agent"}\n    return {"username": "developer", "role": "human"}\n'
                        }
                    ]
                },
                {
                    "name": "requirements.txt",
                    "path": "/backend/requirements.txt",
                    "isDir": False,
                    "language": "text",
                    "content": "fastapi>=0.100.0\nuvicorn>=0.22.0\nsqlite3-binary>=0.1.0\npydantic>=2.0.0\npython-jose[cryptography]>=4.0.0\n"
                }
            ]
        },
        {
            "name": "src",
            "path": "/src",
            "isDir": True,
            "children": [
                {
                    "name": "components",
                    "path": "/src/components",
                    "isDir": True,
                    "children": [
                        {
                            "name": "Dashboard.tsx",
                            "path": "/src/components/Dashboard.tsx",
                            "isDir": False,
                            "language": "typescript",
                            "content": "import React from 'react';\nimport { useAgentState } from '../hooks/useAgentState';\n\nexport const Dashboard: React.FC = () => {\n  const { agents, tasks } = useAgentState();\n  \n  return (\n    <div className=\"dashboard-grid\">\n      <div className=\"summary-card\">\n        <h3>Active Tasks</h3>\n        <p className=\"highlight\">{tasks.filter(t => t.status === \'active\').length}</p>\n      </div>\n      <div className=\"summary-card\">\n        <h3>Agents Online</h3>\n        <p className=\"highlight green\">{agents.filter(a => a.status === \'online\').length}</p>\n      </div>\n    </div>\n  );\n};\n"
                        },
                        {
                            "name": "Navbar.tsx",
                            "path": "/src/components/Navbar.tsx",
                            "isDir": False,
                            "language": "typescript",
                            "content": "import React from 'react';\n\nexport const Navbar: React.FC = () => {\n  return (\n    <nav className=\"nav-container\">\n      <div className=\"brand\">AI Team Manager</div>\n      <div className=\"status-badge\">\n        <span className=\"dot pulse green\"></span> Active Branch: main\n      </div>\n    </nav>\n  );\n};\n"
                        }
                    ]
                },
                {
                    "name": "App.tsx",
                    "path": "/src/App.tsx",
                    "isDir": False,
                    "language": "typescript",
                    "content": "import React from 'react';\nimport { Navbar } from './components/Navbar';\nimport { Dashboard } from './components/Dashboard';\n\nfunction App() {\n  return (\n    <div className=\"app-shell\">\n      <Navbar />\n      <main className=\"content\">\n        <Dashboard />\n      </main>\n    </div>\n  );\n}\n\nexport default App;\n"
                }
            ]
        },
        {
            "name": "package.json",
            "path": "/package.json",
            "isDir": False,
            "language": "json",
            "content": '{\n  "name": "ai-team-manager-web",\n  "version": "0.1.0",\n  "private": true,\n  "dependencies": {\n    "react": "^19.2.3",\n    "react-dom": "^19.2.3",\n    "next": "^16.2.9"\n  },\n  "devDependencies": {\n    "typescript": "^6.0.3",\n    "@types/react": "^19.2.7"\n  }\n}'
        },
        {
            "name": "README.md",
            "path": "/README.md",
            "isDir": False,
            "language": "markdown",
            "content": "# AI Team Manager\n\nA centralized command center for coordinating multiple specialized AI coding agents.\n\n## Getting Started\n\n1. Set up backend virtual environment\n2. Install client dependencies: `npm install`\n3. Run the development server: `npm run dev`\n"
        }
    ]
}

MOCK_FILES_P2 = {
    "name": "townsim-root",
    "path": "/",
    "isDir": True,
    "children": [
        {
            "name": "backend",
            "path": "/backend",
            "isDir": True,
            "children": [
                {
                    "name": "town.py",
                    "path": "/backend/town.py",
                    "isDir": False,
                    "language": "python",
                    "content": 'class TownSimulation:\n    def __init__(self, size=100):\n        self.size = size\n        self.residents = []\n        self.grid = [[None for _ in range(size)] for _ in range(size)]\n\n    def add_resident(self, resident):\n        self.residents.append(resident)\n        self.grid[resident.x][resident.y] = resident\n\n    def tick(self):\n        # Simulation loop tick\n        for resident in self.residents:\n            resident.update_state()\n            resident.move_towards_target()\n'
                },
                {
                    "name": "agent.py",
                    "path": "/backend/agent.py",
                    "isDir": False,
                    "language": "python",
                    "content": 'class ResidentAgent:\n    def __init__(self, name, role, x, y):\n        self.name = name\n        self.role = role\n        self.x = x\n        self.y = y\n        self.memory = []\n        self.current_goal = "idle"\n\n    def update_state(self):\n        # LLM based resident agent simulation loop\n        if len(self.memory) > 10:\n            self.current_goal = "reflecting"\n        else:\n            self.current_goal = "socializing"\n'
                }
            ]
        },
        {
            "name": "frontend",
            "path": "/frontend",
            "isDir": True,
            "children": [
                {
                    "name": "App.tsx",
                    "path": "/frontend/App.tsx",
                    "isDir": False,
                    "language": "typescript",
                    "content": "import React, { useEffect, useRef } from 'react';\n\nexport const TownCanvas: React.FC = () => {\n  const canvasRef = useRef<HTMLCanvasElement>(null);\n\n  useEffect(() => {\n    const canvas = canvasRef.current;\n    if (!canvas) return;\n    const ctx = canvas.getContext('2d');\n    if (!ctx) return;\n    \n    // Draw simple grid map\n    ctx.fillStyle = '#0f172a';\n    ctx.fillRect(0, 0, 500, 500);\n  }, []);\n\n  return <canvas ref={canvasRef} width={500} height={500} />;\n};"
                }
            ]
        },
        {
            "name": "README.md",
            "path": "/README.md",
            "isDir": False,
            "language": "markdown",
            "content": "# TownSim: Generative Agent Town Sandbox\nA local simulation sandbox containing 100 LLM-based autonomous residents who live, work, and socialize in a grid town.\n"
        }
    ]
}

MOCK_FILES_P3 = {
    "name": "rag-root",
    "path": "/",
    "isDir": True,
    "children": [
        {
            "name": "src",
            "path": "/src",
            "isDir": True,
            "children": [
                {
                    "name": "vector_db.py",
                    "path": "/src/vector_db.py",
                    "isDir": False,
                    "language": "python",
                    "content": 'import chroma\nimport os\n\nclass ChromaConnector:\n    def __init__(self):\n        self.client = chroma.Client(\n            host=os.environ.get("CHROMA_HOST", "localhost"),\n            port=int(os.environ.get("CHROMA_PORT", 8000))\n        )\n        self.collection = self.client.get_or_create_collection("docs")\n\n    def insert_documents(self, documents, ids, metadatas=None):\n        self.collection.add(\n            documents=documents,\n            ids=ids,\n            metadatas=metadatas\n        )\n'
                },
                {
                    "name": "chunker.py",
                    "path": "/src/chunker.py",
                    "isDir": False,
                    "language": "python",
                    "content": 'import re\n\ndef semantic_sentence_chunking(text, max_tokens=150):\n    sentences = re.split(r\'(?<=[.?!]) +\', text)\n    chunks = []\n    current_chunk = []\n    current_length = 0\n    \n    for sentence in sentences:\n        words = sentence.split()\n        if current_length + len(words) > max_tokens:\n            chunks.append(" ".join(current_chunk))\n            current_chunk = words\n            current_length = len(words)\n        else:\n            current_chunk.extend(words)\n            current_length += len(words)\n            \n    if current_chunk:\n        chunks.append(" ".join(current_chunk))\n    return chunks\n'
                }
            ]
        },
        {
            "name": "requirements.txt",
            "path": "/requirements.txt",
            "isDir": False,
            "language": "text",
            "content": "chromadb>=0.4.15\ncohere>=4.27.0\nsentence-transformers>=2.2.2\nnltk>=3.8.1\n"
        }
    ]
}

MOCK_FILES_P4 = {
    "name": "competitor-root",
    "path": "/",
    "isDir": True,
    "children": [
        {
            "name": "scrapers",
            "path": "/scrapers",
            "isDir": True,
            "children": [
                {
                    "name": "web_scraper.py",
                    "path": "/scrapers/web_scraper.py",
                    "isDir": False,
                    "language": "python",
                    "content": 'from playwright.sync_api import sync_playwright\n\ndef scrape_pricing_page(url):\n    with sync_playwright() as p:\n        browser = p.chromium.launch(headless=True)\n        page = browser.new_page()\n        page.goto(url)\n        # Parse pricing cards elements\n        pricing = page.locator(".pricing-card").all_inner_texts()\n        browser.close()\n        return pricing\n'
                }
            ]
        }
    ]
}

MOCK_FILES_P5 = {
    "name": "extractor-root",
    "path": "/",
    "isDir": True,
    "children": [
        {
            "name": "ocr",
            "path": "/ocr",
            "isDir": True,
            "children": [
                {
                    "name": "tesseract_parser.py",
                    "path": "/ocr/tesseract_parser.py",
                    "isDir": False,
                    "language": "python",
                    "content": 'import pytesseract\nfrom PIL import Image\n\ndef extract_text_from_pdf(image_path):\n    img = Image.open(image_path)\n    text = pytesseract.image_to_string(img)\n    return text\n'
                }
            ]
        }
    ]
}


SEED_PROJECTS = [
    {
        "id": "p1",
        "name": "AI Team Manager",
        "local_path": str(PROJECT_ROOT).replace("\\", "/"),
        "last_opened": "Just now",
        "status": "active",
        "branch": "Ui",
        "mock_files": json.dumps(MOCK_FILES_P1)
    },
    {
        "id": "p2",
        "name": "TownSim",
        "local_path": "C:/projects/townsim-agent-town",
        "last_opened": "2 hours ago",
        "status": "development",
        "branch": "main",
        "mock_files": json.dumps(MOCK_FILES_P2)
    },
    {
        "id": "p3",
        "name": "RAG Engine",
        "local_path": "C:/projects/rag-engine-service",
        "last_opened": "Yesterday",
        "status": "development",
        "branch": "dev-indexing",
        "mock_files": json.dumps(MOCK_FILES_P3)
    },
    {
        "id": "p4",
        "name": "Competitor Analysis Agent",
        "local_path": "C:/projects/competitor-analysis-agent",
        "last_opened": "3 days ago",
        "status": "development",
        "branch": "main",
        "mock_files": json.dumps(MOCK_FILES_P4)
    },
    {
        "id": "p5",
        "name": "Invoice Extractor Agent",
        "local_path": "C:/projects/invoice-extractor",
        "last_opened": "1 week ago",
        "status": "development",
        "branch": "prod-deploy",
        "mock_files": json.dumps(MOCK_FILES_P5)
    }
]

SEED_AGENTS = [
    # Project 1 (AI Team Manager)
    {
        "project_id": "p1",
        "name": "Codex",
        "role": "Lead Engineer",
        "status": "online",
        "current_task": "Orchestrating AI Team",
        "progress": 100,
        "last_active": "Active now",
        "avatar": "CX",
        "logs": json.dumps([
            "[INFO] Codex initialized.",
            "[INFO] Project loaded: ai-team-manager",
            "[INFO] Scanning workspace files... Found 8 files.",
            "[INFO] Analyzing requirements... Task T-2 and T-3 identified.",
            "[ACTION] Assigned T-2 to OpenCode.",
            "[ACTION] Assigned T-3 to Blackbox.",
            "[REVIEW] Reviewing completed task T-1 (Auth Middleware). Status: APPROVED.",
            "[REVIEW] Reviewing task T-3 (DB Unit Tests). Status: CHANGES REQUESTED."
        ]),
        "description": "Central AI Orchestration agent coordinating developer team members.",
        "capabilities": json.dumps(["architecture", "debugging", "documentation", "testing", "refactoring"]),
        "intelligence_level": "Critical",
        "adapter_type": "API",
        "launch_command": "node backend/app/agents/codex_cli_stub.js",
        "enabled": 1
    },
    {
        "project_id": "p1",
        "name": "AntiGravity",
        "role": "Backend Expert",
        "status": "idle",
        "current_task": "Idle - Standby for integration",
        "progress": 0,
        "last_active": "5m ago",
        "avatar": "AG",
        "logs": json.dumps([
            "[INFO] AntiGravity backend subsystem online.",
            "[ACTION] Started Task T-1: Implement Authentication Middleware.",
            "[INFO] Auth scaffolding created. Writing python auth token verify handlers...",
            "[TEST] Auth tests passed. Coverage: 100%.",
            "[SUBMIT] Submitted T-1 code implementation to Codex.",
            "[INFO] Task T-1 APPROVED by Codex. Subsystem returning to idle standby."
        ]),
        "description": "Specialized in Python FastAPI, SQLite databases, and server architecture.",
        "capabilities": json.dumps(["backend", "database", "debugging", "testing"]),
        "intelligence_level": "High",
        "adapter_type": "Mock",
        "launch_command": "python -m agents.antigravity",
        "enabled": 1
    },
    {
        "project_id": "p1",
        "name": "OpenCode",
        "role": "Frontend Expert",
        "status": "working",
        "current_task": "T-2: Create Interactive Dashboard UI",
        "progress": 68,
        "last_active": "Active now",
        "avatar": "OC",
        "logs": json.dumps([
            "[INFO] OpenCode frontend subsystem online.",
            "[ACTION] Started Task T-2: Create Interactive Dashboard UI.",
            "[INFO] Setting up components: Sidebar, Header, Activity timeline.",
            "[INFO] Writing flex layouts and dark mode CSS configurations...",
            "[INFO] Completed Sidebar and Header integration. Layout status: 68% complete."
        ]),
        "description": "Specialized in React, Next.js, CSS layouts, and UI component styling.",
        "capabilities": json.dumps(["frontend", "boilerplate", "refactoring"]),
        "intelligence_level": "High",
        "adapter_type": "Mock",
        "launch_command": "npm run dev-agent",
        "enabled": 1
    },
    {
        "project_id": "p1",
        "name": "Blackbox",
        "role": "QA Engineer",
        "status": "working",
        "current_task": "T-3: DB Unit Tests Revision",
        "progress": 90,
        "last_active": "2m ago",
        "avatar": "BB",
        "logs": json.dumps([
            "[INFO] Blackbox QA subsystem online.",
            "[ACTION] Started Task T-3: Write Unit Tests for Database Connectors.",
            "[TEST] Writing pytest tests for sqlite functions in database.py...",
            "[TEST] Pytest execution succeeded. Coverage: 94%.",
            "[SUBMIT] Submitted T-3 testing suites to Codex for review.",
            "[INFO] Task T-3 REVIEW FEEDBACK: Codex requested db-lock mock tests.",
            "[ACTION] Implementing mock database locking scenarios in test suites (90% done)..."
        ]),
        "description": "Automated test suite generation, unit tests, and coverage analyzer.",
        "capabilities": json.dumps(["testing", "debugging", "documentation"]),
        "intelligence_level": "Medium",
        "adapter_type": "CLI",
        "launch_command": "pytest tests/ --cov",
        "enabled": 1
    },
    {
        "project_id": "p1",
        "name": "Kilocode",
        "role": "Utility Worker",
        "status": "blocked",
        "current_task": "T-4: Docker Build Optimization",
        "progress": 20,
        "last_active": "12m ago",
        "avatar": "KC",
        "logs": json.dumps([
            "[INFO] Kilocode workspace helper online.",
            "[ACTION] Started Task T-4: Optimize Docker Build Image Size.",
            "[ERROR] Docker engine daemon not running in dev environment. Cannot run builder check.",
            "[WARN] Task T-4 status set to BLOCKED. Waiting for Docker environment daemon start."
        ]),
        "description": "Helper tasks: Docker builds, environment config, boilerplate cleanup.",
        "capabilities": json.dumps(["devops", "boilerplate"]),
        "intelligence_level": "Low",
        "adapter_type": "CLI",
        "launch_command": "docker build -t app .",
        "enabled": 1
    },
    {
        "project_id": "p1",
        "name": "Mimo Code",
        "role": "Junior Worker",
        "status": "idle",
        "current_task": "Idle - Standby",
        "progress": 100,
        "last_active": "45m ago",
        "avatar": "MC",
        "logs": json.dumps([
            "[INFO] Mimo Code online.",
            "[ACTION] Started Task T-5: Fix Header Spacing on Mobile.",
            "[CSS] Added flex-direction styles inside media query breakpoints.",
            "[SUBMIT] Submitted code changes to Codex.",
            "[INFO] Task T-5 APPROVED by Codex. State set to IDLE."
        ]),
        "description": "Assists with simple edits, documentation updates, and linting fixes.",
        "capabilities": json.dumps(["documentation", "boilerplate"]),
        "intelligence_level": "Low",
        "adapter_type": "Mock",
        "launch_command": "npm run lint",
        "enabled": 1
    },

    # Project 2 (TownSim)
    {
        "project_id": "p2",
        "name": "Codex",
        "role": "Lead Coordinator",
        "status": "online",
        "current_task": "Reviewing A* benchmarking data",
        "progress": 0,
        "last_active": "1m ago",
        "avatar": "CX",
        "logs": json.dumps([
            "[INFO] Standing by for resident simulation logs.",
            "[T-3] Blackbox submitted benchmarking data for review."
        ]),
        "description": "Lead PM and system architecture advisor.",
        "capabilities": json.dumps(["architecture", "refactoring"]),
        "intelligence_level": "Critical",
        "adapter_type": "API",
        "launch_command": "",
        "enabled": 1
    },
    {
        "project_id": "p2",
        "name": "OpenCode",
        "role": "Frontend Engineer",
        "status": "idle",
        "current_task": "None",
        "progress": 100,
        "last_active": "15m ago",
        "avatar": "OC",
        "logs": json.dumps([
            "[BUILD] Finished drawing canvas rendering map.",
            "[SUCCESS] T-1 spatial navigation grid verified."
        ]),
        "description": "Frontend canvas builder.",
        "capabilities": json.dumps(["frontend"]),
        "intelligence_level": "High",
        "adapter_type": "Mock",
        "enabled": 1
    },
    {
        "project_id": "p2",
        "name": "AntiGravity",
        "role": "Backend Architect",
        "status": "working",
        "current_task": "Writing LLM prompts for dialogues",
        "progress": 45,
        "last_active": "Just now",
        "avatar": "AG",
        "logs": json.dumps([
            "[RUN] Simulating resident interaction at node (12, 14)...",
            "[PROMPT] Sending prompt context to API endpoint: 'Alice meets Bob at the cafe...'"
        ]),
        "description": "Generative agent behaviors and simulation builder.",
        "capabilities": json.dumps(["backend", "database"]),
        "intelligence_level": "High",
        "adapter_type": "Mock",
        "enabled": 1
    },
    {
        "project_id": "p2",
        "name": "Blackbox",
        "role": "QA Automation",
        "status": "idle",
        "current_task": "Completed T-3",
        "progress": 90,
        "last_active": "3m ago",
        "avatar": "BB",
        "logs": json.dumps([
            "[TEST] benchmark_pathfinding passes. Mean frame compute time: 8.4ms."
        ]),
        "description": "Performance testing automation agent.",
        "capabilities": json.dumps(["testing"]),
        "intelligence_level": "Medium",
        "adapter_type": "Mock",
        "enabled": 1
    },

    # Project 3 (RAG Engine)
    {
        "project_id": "p3",
        "name": "Codex",
        "role": "Lead Coordinator",
        "status": "working",
        "current_task": "Writing ReRank connector code",
        "progress": 25,
        "last_active": "Just now",
        "avatar": "CX",
        "logs": json.dumps([
            "[RAG] Testing connection to Cohere API...",
            "[SUCCESS] Connection verified. API Response: OK."
        ]),
        "description": "Coordinator and API integration manager.",
        "capabilities": json.dumps(["architecture", "debugging"]),
        "intelligence_level": "Critical",
        "adapter_type": "API",
        "enabled": 1
    },
    {
        "project_id": "p3",
        "name": "Blackbox",
        "role": "Data Pipeline",
        "status": "idle",
        "current_task": "Idle",
        "progress": 100,
        "last_active": "10m ago",
        "avatar": "BB",
        "logs": json.dumps([
            "[INFO] Indexing complete: 4,512 chunks inserted into Chroma collection 'docs'."
        ]),
        "description": "Vector processing pipeline and chunking builder.",
        "capabilities": json.dumps(["testing", "database"]),
        "intelligence_level": "Medium",
        "adapter_type": "Mock",
        "enabled": 1
    },

    # Project 4 (Competitor Analysis)
    {
        "project_id": "p4",
        "name": "Codex",
        "role": "Lead Coordinator",
        "status": "online",
        "current_task": "Awaiting Kilocode proxies bypass",
        "progress": 0,
        "last_active": "5m ago",
        "avatar": "CX",
        "logs": json.dumps([
            "[WARNING] Scraping failed due to cloudflare challenge page."
        ]),
        "description": "Scraping orchestrator.",
        "capabilities": json.dumps(["architecture"]),
        "intelligence_level": "Critical",
        "adapter_type": "API",
        "enabled": 1
    },
    {
        "project_id": "p4",
        "name": "Kilocode",
        "role": "Scraper Dev",
        "status": "blocked",
        "current_task": "Blocked by Cloudflare challenge",
        "progress": 10,
        "last_active": "1m ago",
        "avatar": "KC",
        "logs": json.dumps([
            "[ERROR] PlaywrightTimeoutException: Timeout 30000ms exceeded waiting for selector '.pricing-card'",
            "[BLOCKED] Target pricing page redirected to Cloudflare turnstile challenge."
        ]),
        "description": "Playwright scraping utility developer.",
        "capabilities": json.dumps(["devops"]),
        "intelligence_level": "Low",
        "adapter_type": "CLI",
        "enabled": 1
    },

    # Project 5 (Invoice Extractor)
    {
        "project_id": "p5",
        "name": "Codex",
        "role": "Lead Coordinator",
        "status": "online",
        "current_task": "None",
        "progress": 100,
        "last_active": "1d ago",
        "avatar": "CX",
        "logs": json.dumps([
            "[OCR] Extractor pipeline active on lambda webhook."
        ]),
        "description": "Invoice routing coordinator.",
        "capabilities": json.dumps(["architecture"]),
        "intelligence_level": "Critical",
        "adapter_type": "API",
        "enabled": 1
    },
    {
        "project_id": "p5",
        "name": "Mimo Code",
        "role": "OCR Engineer",
        "status": "idle",
        "current_task": "Completed T-1",
        "progress": 100,
        "last_active": "2d ago",
        "avatar": "MC",
        "logs": json.dumps([
            "[SUCCESS] Invoice extraction model returning 98.4% parser accuracy scores."
        ]),
        "description": "Tesseract layout parsing model developer.",
        "capabilities": json.dumps(["boilerplate"]),
        "intelligence_level": "Low",
        "adapter_type": "Mock",
        "enabled": 1
    }
]

SEED_TASKS = [
    # Project 1 (AI Team Manager)
    {
        "id": "T-1",
        "project_id": "p1",
        "title": "Implement Authentication Middleware",
        "agent_name": "AntiGravity",
        "status": "completed",
        "priority": "high",
        "progress": 100,
        "description": "Write JWT-based OAuth2 auth logic for securing API endpoints in FastAPI. Include token verify routes.",
        "related_files": json.dumps(["/backend/app/auth.py", "/backend/app/main.py"]),
        "expected_output": "Secure /api/tasks and check authorization header tokens."
    },
    {
        "id": "T-2",
        "project_id": "p1",
        "title": "Create Interactive Dashboard UI",
        "agent_name": "OpenCode",
        "status": "active",
        "priority": "high",
        "progress": 68,
        "description": "Assemble the central command panels using Next.js. Implement the sidebars, activity timeline, and bottom terminal component.",
        "related_files": json.dumps(["/src/components/Dashboard.tsx", "/src/App.tsx"]),
        "expected_output": "Flexible flexbox dashboard rendering panels styled with command-center color accents."
    },
    {
        "id": "T-3",
        "project_id": "p1",
        "title": "Write Unit Tests for Database Connectors",
        "agent_name": "Blackbox",
        "status": "review",
        "priority": "medium",
        "progress": 90,
        "description": "Construct unit tests covering SQL table initialization, row insertion, queries, and connection errors.",
        "related_files": json.dumps(["/backend/app/database.py"]),
        "expected_output": "Pytest script returning > 90% coverage on sqlite connector methods."
    },
    {
        "id": "T-4",
        "project_id": "p1",
        "title": "Optimize Docker Build Image Size",
        "agent_name": "Kilocode",
        "status": "blocked",
        "priority": "low",
        "progress": 20,
        "description": "Configure multi-stage Docker build for python backend to drop image size below 200MB.",
        "related_files": json.dumps(["/backend/requirements.txt"]),
        "expected_output": "Dockerfile output with alpine-slim base packages."
    },
    {
        "id": "T-5",
        "project_id": "p1",
        "title": "Fix Header Spacing on Mobile Views",
        "agent_name": "Mimo Code",
        "status": "completed",
        "priority": "low",
        "progress": 100,
        "description": "Reduce header padding and stack metadata items vertically on window viewport width <= 768px.",
        "related_files": json.dumps(["/src/components/Navbar.tsx"]),
        "expected_output": "CSS media query adjustments fixing top flex items alignment."
    },

    # Project 2 (TownSim)
    {
        "id": "T-1",
        "project_id": "p2",
        "title": "Implement spatial navigation grid",
        "agent_name": "OpenCode",
        "status": "completed",
        "priority": "high",
        "progress": 100,
        "description": "Set up the 100x100 2D coordinate grid and map houses, cafes, and parks.",
        "related_files": json.dumps(["/backend/town.py"]),
        "expected_output": "Array-based map indexing coordinates with collision detection."
    },
    {
        "id": "T-2",
        "project_id": "p2",
        "title": "Add LLM resident conversations logging",
        "agent_name": "AntiGravity",
        "status": "active",
        "priority": "medium",
        "progress": 45,
        "description": "Capture dialogues between residents when they occupy adjacent grid nodes and log to conversation history.",
        "related_files": json.dumps(["/backend/agent.py"]),
        "expected_output": "Structured text log tracking speaker, listener, and dialogue summaries."
    },
    {
        "id": "T-3",
        "project_id": "p2",
        "title": "Verify pathfinding performance on 100 residents",
        "agent_name": "Blackbox",
        "status": "review",
        "priority": "high",
        "progress": 90,
        "description": "Benchmark A* pathfinding algorithms running concurrently across 100 resident agent loops.",
        "related_files": json.dumps(["/backend/town.py"]),
        "expected_output": "Average compute frame time below 16ms during active traversal."
    },

    # Project 3 (RAG Engine)
    {
        "id": "T-1",
        "project_id": "p3",
        "title": "Write embedding batch pipeline",
        "agent_name": "Blackbox",
        "status": "completed",
        "priority": "high",
        "progress": 100,
        "description": "Set up the sentence-transformer batching loader to feed document chunks to Chroma.",
        "related_files": json.dumps(["/src/vector_db.py"]),
        "expected_output": "Batch loop processing 100 documents per batch."
    },
    {
        "id": "T-2",
        "project_id": "p3",
        "title": "Integrate Cohere re-ranking module",
        "agent_name": "Codex",
        "status": "active",
        "priority": "medium",
        "progress": 25,
        "description": "Plug the query retrieval candidates list into Cohere's ReRank API to optimize generator source context.",
        "related_files": json.dumps(["/requirements.txt"]),
        "expected_output": "Method returning re-ordered documents according to relevance scores."
    },

    # Project 4 (Competitor Analysis)
    {
        "id": "T-1",
        "project_id": "p4",
        "title": "Handle anti-bot cloudflare bypass",
        "agent_name": "Kilocode",
        "status": "blocked",
        "priority": "high",
        "progress": 10,
        "description": "Configure proxy rotations and browser fingerprint spoofing to bypass Cloudflare protection on target domains.",
        "related_files": json.dumps(["/scrapers/web_scraper.py"]),
        "expected_output": "Playwright session loading pricing selectors without 403 Forbidden screens."
    },

    # Project 5 (Invoice Extractor)
    {
        "id": "T-1",
        "project_id": "p5",
        "title": "Train custom invoice layout parser",
        "agent_name": "Mimo Code",
        "status": "completed",
        "priority": "medium",
        "progress": 100,
        "description": "Write OCR layouts bounding box extraction script to fetch Total Due, Line Items, and TAX details.",
        "related_files": json.dumps(["/ocr/tesseract_parser.py"]),
        "expected_output": "JSON parser mapping invoice fields accurately."
    }
]

SEED_MESSAGES = [
    # Project 1 (AI Team Manager)
    {
        "id": "M1",
        "project_id": "p1",
        "sender": "Aditya Gotra",
        "sender_type": "user",
        "text": "Hey Codex, let's start the V1 dashboard implementation and double check our database test coverage.",
        "timestamp": "2:10 PM",
        "avatar": "AG",
        "meta": None
    },
    {
        "id": "M2",
        "project_id": "p1",
        "sender": "Codex",
        "sender_type": "codex",
        "text": "Acknowledged. I have scanned our files and requirements. I am setting up the development tasks for Phase 2. I have assigned the frontend work (T-2) to OpenCode, and the QA database verification (T-3) to Blackbox.",
        "timestamp": "2:11 PM",
        "avatar": "CX",
        "meta": None
    },
    {
        "id": "M3",
        "project_id": "p1",
        "sender": "System",
        "sender_type": "system",
        "text": "Task T-2 (Create Interactive Dashboard UI) assigned to OpenCode",
        "timestamp": "2:11 PM",
        "avatar": None,
        "meta": json.dumps({
            "taskCard": {
                "id": "T-2",
                "title": "Create Interactive Dashboard UI",
                "status": "active",
                "agentName": "OpenCode"
            }
        })
    },
    {
        "id": "M4",
        "project_id": "p1",
        "sender": "System",
        "sender_type": "system",
        "text": "Task T-3 (Write Unit Tests for Database Connectors) assigned to Blackbox",
        "timestamp": "2:11 PM",
        "avatar": None,
        "meta": json.dumps({
            "taskCard": {
                "id": "T-3",
                "title": "Write Unit Tests for Database Connectors",
                "status": "active",
                "agentName": "Blackbox"
            }
        })
    },
    {
        "id": "M5",
        "project_id": "p1",
        "sender": "OpenCode",
        "sender_type": "worker",
        "text": "I have started scaffolding the React components for the dashboard workspace. Writing flex layouts and styles inside `src/components/Dashboard.tsx`.",
        "timestamp": "2:15 PM",
        "avatar": "OC",
        "meta": None
    },
    {
        "id": "M6",
        "project_id": "p1",
        "sender": "Blackbox",
        "sender_type": "worker",
        "text": "Writing initial pytest tests for `backend/app/database.py`. Verifying sqlite database create and retrieve workflows.",
        "timestamp": "2:18 PM",
        "avatar": "BB",
        "meta": None
    },
    {
        "id": "M7",
        "project_id": "p1",
        "sender": "System",
        "sender_type": "system",
        "text": "OpenCode updated progress on T-2: Dashboard layout completed (68%). Working on the Bottom Inspector tabs.",
        "timestamp": "2:20 PM",
        "avatar": None,
        "meta": None
    },
    {
        "id": "M8",
        "project_id": "p1",
        "sender": "System",
        "sender_type": "system",
        "text": "Task T-3 submitted for Codex review by Blackbox",
        "timestamp": "2:22 PM",
        "avatar": None,
        "meta": json.dumps({
            "fileChanges": {
                "summary": "Created unit test suite for SQLite connection methods.",
                "files": [
                    {"path": "/backend/app/database.py", "additions": 5, "deletions": 1, "status": "modified"},
                    {"path": "/tests/test_database.py", "additions": 42, "deletions": 0, "status": "added"}
                ]
            }
        })
    },
    {
        "id": "M9",
        "project_id": "p1",
        "sender": "Codex",
        "sender_type": "codex",
        "text": "Reviewing Blackbox's tests for T-3. Test suite coverage is excellent (94%), but the connection tests fail to mock database lock exceptions. I have requested revisions for T-3.",
        "timestamp": "2:24 PM",
        "avatar": "CX",
        "meta": json.dumps({
            "reviewCard": {
                "taskId": "T-3",
                "taskTitle": "Write Unit Tests for Database Connectors",
                "status": "changes_requested",
                "feedback": "Please add a test simulating sqlite3.OperationalError database locked scenarios to ensure the retry connection wrapper works correctly."
            }
        })
    },
    {
        "id": "M10",
        "project_id": "p1",
        "sender": "Blackbox",
        "sender_type": "worker",
        "text": "Understood Codex. I am adding mock database lock tests. I expect to resubmit shortly.",
        "timestamp": "2:26 PM",
        "avatar": "BB",
        "meta": None
    },

    # Project 2 (TownSim)
    {
        "id": "m2-1",
        "project_id": "p2",
        "sender": "System",
        "sender_type": "system",
        "text": "TownSim workspace initialized on branch 'main'. Found 4 active agent adapters.",
        "timestamp": "10:30 AM",
        "avatar": None,
        "meta": None
    },
    {
        "id": "m2-2",
        "project_id": "p2",
        "sender": "Codex",
        "sender_type": "codex",
        "text": "Welcome to the TownSim sandbox. OpenCode has finished T-1. @AntiGravity, please prioritize T-2 resident logs. Bob is currently unable to remember Alice's name in coordinates (12, 14).",
        "timestamp": "10:32 AM",
        "avatar": "CX",
        "meta": None
    },
    {
        "id": "m2-3",
        "project_id": "p2",
        "sender": "AntiGravity",
        "sender_type": "worker",
        "text": "Understood. Adjusting LLM prompt injection formatting to pull from the memory reflection buffers.",
        "timestamp": "10:35 AM",
        "avatar": "AG",
        "meta": None
    },

    # Project 3 (RAG Engine)
    {
        "id": "m3-1",
        "project_id": "p3",
        "sender": "System",
        "sender_type": "system",
        "text": "Connected to local Chroma instance. 4,512 semantic nodes indexed.",
        "timestamp": "Yesterday",
        "avatar": None,
        "meta": None
    },
    {
        "id": "m3-2",
        "project_id": "p3",
        "sender": "Blackbox",
        "sender_type": "worker",
        "text": "I completed the Chroma DB ingestion. The data has been indexed successfully.",
        "timestamp": "Yesterday",
        "avatar": "BB",
        "meta": None
    },

    # Project 4 (Competitor Analysis)
    {
        "id": "m4-1",
        "project_id": "p4",
        "sender": "Kilocode",
        "sender_type": "worker",
        "text": "I am blocked on T-1. Target website is using Cloudflare Turnstile which intercepts our headless Playwright scraper. I need to integrate a browser solver extension.",
        "timestamp": "2 hours ago",
        "avatar": "KC",
        "meta": None
    },

    # Project 5 (Invoice Extractor)
    {
        "id": "m5-1",
        "project_id": "p5",
        "sender": "Mimo Code",
        "sender_type": "worker",
        "text": "OCR extractor model deployed successfully. Parsed fields now flow directly to the accounting portal database.",
        "timestamp": "5 days ago",
        "avatar": "MC",
        "meta": None
    }
]

SEED_REVIEWS = [
    {
        "id": "rev-1",
        "project_id": "p1",
        "task_id": "T-1",
        "reviewer_agent_name": "Codex",
        "status": "approved",
        "comments": "Auth middleware verified. Code follows style guide and includes correct HTTP 401 exceptions. Verified database credentials lookup.",
        "timestamp": "5m ago"
    },
    {
        "id": "rev-2",
        "project_id": "p1",
        "task_id": "T-3",
        "reviewer_agent_name": "Codex",
        "status": "changes_requested",
        "comments": "Coverage is excellent (94%), but please add a mock test for database locked exceptions (sqlite3.OperationalError).",
        "timestamp": "10m ago"
    },
    {
        "id": "rev-3",
        "project_id": "p1",
        "task_id": "T-5",
        "reviewer_agent_name": "Codex",
        "status": "approved",
        "comments": "Visual checked. Spacing is correct on smaller resolutions.",
        "timestamp": "1h ago"
    }
]


def seed_database(connection: sqlite3.Connection) -> None:
    cursor = connection.cursor()
    cursor.execute("SELECT COUNT(*) FROM projects")
    if cursor.fetchone()[0] > 0:
        return  # Already seeded

    # Insert projects
    for p in SEED_PROJECTS:
        cursor.execute(
            """
            INSERT INTO projects (id, name, local_path, last_opened, status, branch, mock_files)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (p["id"], p["name"], p["local_path"], p["last_opened"], p["status"], p["branch"], p["mock_files"])
        )

    # Insert agents
    for a in SEED_AGENTS:
        cursor.execute(
            """
            INSERT INTO agents (
                project_id, name, role, status, current_task, progress, last_active,
                avatar, logs, description, capabilities, intelligence_level,
                adapter_type, launch_command, enabled
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                a["project_id"], a["name"], a["role"], a["status"], a["current_task"],
                a["progress"], a["last_active"], a["avatar"], a["logs"],
                a.get("description"), a.get("capabilities"), a.get("intelligence_level"),
                a.get("adapter_type"), a.get("launch_command"), a["enabled"]
            )
        )

    # Insert tasks
    for t in SEED_TASKS:
        cursor.execute(
            """
            INSERT INTO tasks (
                id, project_id, title, agent_name, status, priority, progress,
                description, related_files, expected_output
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                t["id"], t["project_id"], t["title"], t["agent_name"], t["status"],
                t["priority"], t["progress"], t.get("description"), t.get("related_files"),
                t.get("expected_output")
            )
        )

    # Insert reviews
    for r in SEED_REVIEWS:
        cursor.execute(
            """
            INSERT INTO reviews (id, project_id, task_id, reviewer_agent_name, status, comments, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                r["id"], r["project_id"], r["task_id"], r["reviewer_agent_name"],
                r["status"], r["comments"], r["timestamp"]
            )
        )

    # Insert messages
    for m in SEED_MESSAGES:
        cursor.execute(
            """
            INSERT INTO messages (id, project_id, sender, sender_type, text, timestamp, avatar, meta)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                m["id"], m["project_id"], m["sender"], m["sender_type"], m["text"],
                m["timestamp"], m.get("avatar"), m.get("meta")
            )
        )

    connection.commit()
