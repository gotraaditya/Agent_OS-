import { Project, FileNode, Task, Agent, Message } from "../types";
import {
  mockFiles,
  mockTasks,
  mockAgents,
  mockMessages
} from "./mockData";

export const mockProjects: Project[] = [
  {
    id: "p1",
    name: "AI Team Manager",
    localPath: "C:\\projects\\ai-team-manager",
    lastOpened: "Just now",
    status: "active",
    taskCount: mockTasks.length,
    agentCount: mockAgents.length,
    branch: "Ui",
    files: mockFiles,
    tasks: mockTasks,
    agents: mockAgents,
    messages: mockMessages
  },
  {
    id: "p2",
    name: "TownSim",
    localPath: "C:\\projects\\townsim-agent-town",
    lastOpened: "2 hours ago",
    status: "development",
    taskCount: 3,
    agentCount: 4,
    branch: "main",
    files: {
      name: "townsim-root",
      path: "/",
      isDir: true,
      children: [
        {
          name: "backend",
          path: "/backend",
          isDir: true,
          children: [
            {
              name: "town.py",
              path: "/backend/town.py",
              isDir: false,
              language: "python",
              content: `class TownSimulation:
    def __init__(self, size=100):
        self.size = size
        self.residents = []
        self.grid = [[None for _ in range(size)] for _ in range(size)]

    def add_resident(self, resident):
        self.residents.append(resident)
        self.grid[resident.x][resident.y] = resident

    def tick(self):
        # Simulation loop tick
        for resident in self.residents:
            resident.update_state()
            resident.move_towards_target()
`
            },
            {
              name: "agent.py",
              path: "/backend/agent.py",
              isDir: false,
              language: "python",
              content: `class ResidentAgent:
    def __init__(self, name, role, x, y):
        self.name = name
        self.role = role
        self.x = x
        self.y = y
        self.memory = []
        self.current_goal = "idle"

    def update_state(self):
        # LLM based resident agent simulation loop
        if len(self.memory) > 10:
            self.current_goal = "reflecting"
        else:
            self.current_goal = "socializing"
`
            }
          ]
        },
        {
          name: "frontend",
          path: "/frontend",
          isDir: true,
          children: [
            {
              name: "App.tsx",
              path: "/frontend/App.tsx",
              isDir: false,
              language: "typescript",
              content: `import React, { useEffect, useRef } from 'react';

export const TownCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw simple grid map
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 500, 500);
  }, []);

  return <canvas ref={canvasRef} width={500} height={500} />;
};`
            }
          ]
        },
        {
          name: "README.md",
          path: "/README.md",
          isDir: false,
          language: "markdown",
          content: `# TownSim: Generative Agent Town Sandbox
A local simulation sandbox containing 100 LLM-based autonomous residents who live, work, and socialize in a grid town.
`
        }
      ]
    },
    tasks: [
      {
        id: "T-1",
        title: "Implement spatial navigation grid",
        agentName: "OpenCode",
        status: "completed",
        priority: "high",
        progress: 100,
        description: "Set up the 100x100 2D coordinate grid and map houses, cafes, and parks.",
        relatedFiles: ["/backend/town.py"],
        expectedOutput: "Array-based map indexing coordinates with collision detection."
      },
      {
        id: "T-2",
        title: "Add LLM resident conversations logging",
        agentName: "AntiGravity",
        status: "active",
        priority: "medium",
        progress: 45,
        description: "Capture dialogues between residents when they occupy adjacent grid nodes and log to conversation history.",
        relatedFiles: ["/backend/agent.py"],
        expectedOutput: "Structured text log tracking speaker, listener, and dialogue summaries."
      },
      {
        id: "T-3",
        title: "Verify pathfinding performance on 100 residents",
        agentName: "Blackbox",
        status: "review",
        priority: "high",
        progress: 90,
        description: "Benchmark A* pathfinding algorithms running concurrently across 100 resident agent loops.",
        relatedFiles: ["/backend/town.py"],
        expectedOutput: "Average compute frame time below 16ms during active traversal."
      }
    ],
    agents: [
      {
        name: "Codex",
        role: "Lead Coordinator",
        status: "online",
        currentTask: "Reviewing A* benchmarking data",
        progress: 0,
        lastActive: "1m ago",
        avatar: "CX",
        logs: [
          "[INFO] Standing by for resident simulation logs.",
          "[T-3] Blackbox submitted benchmarking data for review."
        ]
      },
      {
        name: "OpenCode",
        role: "Frontend Engineer",
        status: "idle",
        currentTask: "None",
        progress: 100,
        lastActive: "15m ago",
        avatar: "OC",
        logs: [
          "[BUILD] Finished drawing canvas rendering map.",
          "[SUCCESS] T-1 spatial navigation grid verified."
        ]
      },
      {
        name: "AntiGravity",
        role: "Backend Architect",
        status: "working",
        currentTask: "Writing LLM prompts for dialogues",
        progress: 45,
        lastActive: "Just now",
        avatar: "AG",
        logs: [
          "[RUN] Simulating resident interaction at node (12, 14)...",
          "[PROMPT] Sending prompt context to API endpoint: 'Alice meets Bob at the cafe...'"
        ]
      },
      {
        name: "Blackbox",
        role: "QA Automation",
        status: "idle",
        currentTask: "Completed T-3",
        progress: 90,
        lastActive: "3m ago",
        avatar: "BB",
        logs: [
          "[TEST] benchmark_pathfinding passes. Mean frame compute time: 8.4ms."
        ]
      }
    ],
    messages: [
      {
        id: "m2-1",
        sender: "System",
        senderType: "system",
        text: "TownSim workspace initialized on branch 'main'. Found 4 active agent adapters.",
        timestamp: "10:30 AM"
      },
      {
        id: "m2-2",
        sender: "Codex",
        senderType: "codex",
        text: "Welcome to the TownSim sandbox. OpenCode has finished T-1. @AntiGravity, please prioritize T-2 resident logs. Bob is currently unable to remember Alice's name in coordinates (12, 14).",
        timestamp: "10:32 AM",
        avatar: "CX"
      },
      {
        id: "m2-3",
        sender: "AntiGravity",
        senderType: "worker",
        text: "Understood. Adjusting LLM prompt injection formatting to pull from the memory reflection buffers.",
        timestamp: "10:35 AM",
        avatar: "AG"
      }
    ]
  },
  {
    id: "p3",
    name: "RAG Engine",
    localPath: "C:\\projects\\rag-engine-service",
    lastOpened: "Yesterday",
    status: "development",
    taskCount: 2,
    agentCount: 2,
    branch: "dev-indexing",
    files: {
      name: "rag-root",
      path: "/",
      isDir: true,
      children: [
        {
          name: "src",
          path: "/src",
          isDir: true,
          children: [
            {
              name: "vector_db.py",
              path: "/src/vector_db.py",
              isDir: false,
              language: "python",
              content: `import chroma
import os

class ChromaConnector:
    def __init__(self):
        self.client = chroma.Client(
            host=os.environ.get("CHROMA_HOST", "localhost"),
            port=int(os.environ.get("CHROMA_PORT", 8000))
        )
        self.collection = self.client.get_or_create_collection("docs")

    def insert_documents(self, documents, ids, metadatas=None):
        self.collection.add(
            documents=documents,
            ids=ids,
            metadatas=metadatas
        )
`
            },
            {
              name: "chunker.py",
              path: "/src/chunker.py",
              isDir: false,
              language: "python",
              content: `import re

def semantic_sentence_chunking(text, max_tokens=150):
    sentences = re.split(r'(?<=[.?!]) +', text)
    chunks = []
    current_chunk = []
    current_length = 0
    
    for sentence in sentences:
        words = sentence.split()
        if current_length + len(words) > max_tokens:
            chunks.append(" ".join(current_chunk))
            current_chunk = words
            current_length = len(words)
        else:
            current_chunk.extend(words)
            current_length += len(words)
            
    if current_chunk:
        chunks.append(" ".join(current_chunk))
    return chunks
`
            }
          ]
        },
        {
          name: "requirements.txt",
          path: "/requirements.txt",
          isDir: false,
          language: "text",
          content: `chromadb>=0.4.15
cohere>=4.27.0
sentence-transformers>=2.2.2
nltk>=3.8.1
`
        }
      ]
    },
    tasks: [
      {
        id: "T-1",
        title: "Write embedding batch pipeline",
        agentName: "Blackbox",
        status: "completed",
        priority: "high",
        progress: 100,
        description: "Set up the sentence-transformer batching loader to feed document chunks to Chroma.",
        relatedFiles: ["/src/vector_db.py"],
        expectedOutput: "Batch loop processing 100 documents per batch."
      },
      {
        id: "T-2",
        title: "Integrate Cohere re-ranking module",
        agentName: "Codex",
        status: "active",
        priority: "medium",
        progress: 25,
        description: "Plug the query retrieval candidates list into Cohere's ReRank API to optimize generator source context.",
        relatedFiles: ["/requirements.txt"],
        expectedOutput: "Method returning re-ordered documents according to relevance scores."
      }
    ],
    agents: [
      {
        name: "Codex",
        role: "Lead Coordinator",
        status: "working",
        currentTask: "Writing ReRank connector code",
        progress: 25,
        lastActive: "Just now",
        avatar: "CX",
        logs: [
          "[RAG] Testing connection to Cohere API...",
          "[SUCCESS] Connection verified. API Response: OK."
        ]
      },
      {
        name: "Blackbox",
        role: "Data Pipeline",
        status: "idle",
        currentTask: "Idle",
        progress: 100,
        lastActive: "10m ago",
        avatar: "BB",
        logs: [
          "[INFO] Indexing complete: 4,512 chunks inserted into Chroma collection 'docs'."
        ]
      }
    ],
    messages: [
      {
        id: "m3-1",
        sender: "System",
        senderType: "system",
        text: "Connected to local Chroma instance. 4,512 semantic nodes indexed.",
        timestamp: "Yesterday"
      },
      {
        id: "m3-2",
        sender: "Blackbox",
        senderType: "worker",
        text: "I completed the Chroma DB ingestion. The data has been indexed successfully.",
        timestamp: "Yesterday",
        avatar: "BB"
      }
    ]
  },
  {
    id: "p4",
    name: "Competitor Analysis Agent",
    localPath: "C:\\projects\\competitor-analysis-agent",
    lastOpened: "3 days ago",
    status: "development",
    taskCount: 1,
    agentCount: 2,
    branch: "main",
    files: {
      name: "competitor-root",
      path: "/",
      isDir: true,
      children: [
        {
          name: "scrapers",
          path: "/scrapers",
          isDir: true,
          children: [
            {
              name: "web_scraper.py",
              path: "/scrapers/web_scraper.py",
              isDir: false,
              language: "python",
              content: `from playwright.sync_api import sync_playwright

def scrape_pricing_page(url):
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)
        # Parse pricing cards elements
        pricing = page.locator(".pricing-card").all_inner_texts()
        browser.close()
        return pricing
`
            }
          ]
        }
      ]
    },
    tasks: [
      {
        id: "T-1",
        title: "Handle anti-bot cloudflare bypass",
        agentName: "Kilocode",
        status: "blocked",
        priority: "high",
        progress: 10,
        description: "Configure proxy rotations and browser fingerprint spoofing to bypass Cloudflare protection on target domains.",
        relatedFiles: ["/scrapers/web_scraper.py"],
        expectedOutput: "Playwright session loading pricing selectors without 403 Forbidden screens."
      }
    ],
    agents: [
      {
        name: "Codex",
        role: "Lead Coordinator",
        status: "online",
        currentTask: "Awaiting Kilocode proxies bypass",
        progress: 0,
        lastActive: "5m ago",
        avatar: "CX",
        logs: [
          "[WARNING] Scraping failed due to cloudflare challenge page."
        ]
      },
      {
        name: "Kilocode",
        role: "Scraper Dev",
        status: "blocked",
        currentTask: "Blocked by Cloudflare challenge",
        progress: 10,
        lastActive: "1m ago",
        avatar: "KC",
        logs: [
          "[ERROR] PlaywrightTimeoutException: Timeout 30000ms exceeded waiting for selector '.pricing-card'",
          "[BLOCKED] Target pricing page redirected to Cloudflare turnstile challenge."
        ]
      }
    ],
    messages: [
      {
        id: "m4-1",
        sender: "Kilocode",
        senderType: "worker",
        text: "I am blocked on T-1. Target website is using Cloudflare Turnstile which intercepts our headless Playwright scraper. I need to integrate a browser solver extension.",
        timestamp: "2 hours ago",
        avatar: "KC"
      }
    ]
  },
  {
    id: "p5",
    name: "Invoice Extractor Agent",
    localPath: "C:\\projects\\invoice-extractor",
    lastOpened: "1 week ago",
    status: "development",
    taskCount: 1,
    agentCount: 2,
    branch: "prod-deploy",
    files: {
      name: "extractor-root",
      path: "/",
      isDir: true,
      children: [
        {
          name: "ocr",
          path: "/ocr",
          isDir: true,
          children: [
            {
              name: "tesseract_parser.py",
              path: "/ocr/tesseract_parser.py",
              isDir: false,
              language: "python",
              content: `import pytesseract
from PIL import Image

def extract_text_from_pdf(image_path):
    img = Image.open(image_path)
    text = pytesseract.image_to_string(img)
    return text
`
            }
          ]
        }
      ]
    },
    tasks: [
      {
        id: "T-1",
        title: "Train custom invoice layout parser",
        agentName: "Mimo Code",
        status: "completed",
        priority: "medium",
        progress: 100,
        description: "Write OCR layouts bounding box extraction script to fetch Total Due, Line Items, and TAX details.",
        relatedFiles: ["/ocr/tesseract_parser.py"],
        expectedOutput: "JSON parser mapping invoice fields accurately."
      }
    ],
    agents: [
      {
        name: "Codex",
        role: "Lead Coordinator",
        status: "online",
        currentTask: "None",
        progress: 100,
        lastActive: "1d ago",
        avatar: "CX",
        logs: [
          "[OCR] Extractor pipeline active on lambda webhook."
        ]
      },
      {
        name: "Mimo Code",
        role: "OCR Engineer",
        status: "idle",
        currentTask: "Completed T-1",
        progress: 100,
        lastActive: "2d ago",
        avatar: "MC",
        logs: [
          "[SUCCESS] Invoice extraction model returning 98.4% parser accuracy scores."
        ]
      }
    ],
    messages: [
      {
        id: "m5-1",
        sender: "Mimo Code",
        senderType: "worker",
        text: "OCR extractor model deployed successfully. Parsed fields now flow directly to the accounting portal database.",
        timestamp: "5 days ago",
        avatar: "MC"
      }
    ]
  }
];
