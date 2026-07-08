import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ProjectEmptyState } from "./ProjectEmptyState";
import { TopHeader } from "./TopHeader";
import { AppShell } from "./AppShell";
import { AdapterTypeSelect } from "./AgentSubComponents";
import { BottomInspector } from "./BottomInspector";

// Mock fetch globally
const mockProjectsData = [
  {
    id: "p-test-1",
    name: "Mock Test Project",
    localPath: "/projects/mock-test-1",
    lastOpened: "Just now",
    status: "development",
    branch: "main",
    taskCount: 1,
    agentCount: 2,
    files: {
      name: "mock-test-1-root",
      path: "/",
      isDir: true,
      children: []
    },
    tasks: [
      {
        id: "T-1",
        title: "Test Task",
        agentName: "AntiGravity",
        status: "active",
        priority: "medium",
        progress: 30,
        description: "A simple task for testing",
        relatedFiles: [],
        expectedOutput: "Done"
      }
    ],
    agents: [
      {
        name: "Codex",
        role: "Lead Coordinator",
        status: "online",
        currentTask: "None",
        progress: 0,
        lastActive: "Just now",
        avatar: "CX",
        logs: [],
        description: "Lead coordinator",
        capabilities: ["architecture"],
        intelligenceLevel: "Critical",
        adapterType: "API",
        launchCommand: "",
        isEnabled: true
      },
      {
        name: "AntiGravity",
        role: "Backend Architect",
        status: "idle",
        currentTask: "None",
        progress: 0,
        lastActive: "Just now",
        avatar: "AG",
        logs: [],
        description: "Backend architect",
        capabilities: ["backend"],
        intelligenceLevel: "High",
        adapterType: "CLI",
        launchCommand: "",
        isEnabled: true
      }
    ],
    messages: [
      {
        id: "msg-1",
        sender: "System",
        senderType: "system",
        text: "Project workspace loaded.",
        timestamp: "12:00 PM"
      }
    ]
  }
];

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => {
    if (url.includes("/api/projects")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockProjectsData)
      });
    }
    if (url.includes("/api/workspace/scan")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ name: "root", path: "/", isDir: true, children: [] })
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404
    });
  }));

  // Mock window.desktop
  vi.stubGlobal("desktop", {
    platform: "win32",
    backendUrl: "http://127.0.0.1:8000"
  });

  // Mock localStorage
  const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, value: string) => { store[key] = value.toString(); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; }
    };
  })();
  vi.stubGlobal("localStorage", localStorageMock);

  // Mock scrollIntoView
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe("ProjectEmptyState Component", () => {
  it("renders correctly with callbacks", () => {
    const onOpenProjectSwitcher = vi.fn();
    const onOpenCreateProject = vi.fn();
    const onOpenFolder = vi.fn();

    render(
      <ProjectEmptyState
        onOpenProjectSwitcher={onOpenProjectSwitcher}
        onOpenCreateProject={onOpenCreateProject}
        onOpenFolder={onOpenFolder}
      />
    );

    expect(screen.getByText("No Projects Loaded")).toBeDefined();
    expect(screen.getByText("Open Folder")).toBeDefined();
    expect(screen.getByText("Recent Projects")).toBeDefined();
    expect(screen.getByText("Create New Project")).toBeDefined();

    fireEvent.click(screen.getByText("Open Folder"));
    expect(onOpenFolder).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Recent Projects"));
    expect(onOpenProjectSwitcher).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Create New Project"));
    expect(onOpenCreateProject).toHaveBeenCalledTimes(1);
  });
});

describe("TopHeader Component", () => {
  it("renders the project title and branch", () => {
    const onOpenNewTask = vi.fn();
    const onFocusSearch = vi.fn();
    const onAskCodex = vi.fn();
    const onToggleInspector = vi.fn();
    const onSelectProject = vi.fn();
    const onOpenProjectSwitcher = vi.fn();
    const onOpenCreateProject = vi.fn();
    const onSelectBranch = vi.fn();

    render(
      <TopHeader
        projectName="Test Project Alpha"
        currentBranch="main"
        onOpenNewTask={onOpenNewTask}
        onFocusSearch={onFocusSearch}
        onAskCodex={onAskCodex}
        activeTasksCount={3}
        isInspectorOpen={true}
        onToggleInspector={onToggleInspector}
        projects={[{ id: "p1", name: "Test Project Alpha" }]}
        onSelectProject={onSelectProject}
        onOpenProjectSwitcher={onOpenProjectSwitcher}
        onOpenCreateProject={onOpenCreateProject}
        onSelectBranch={onSelectBranch}
      />
    );

    expect(screen.getByText("Test Project Alpha")).toBeDefined();
    expect(screen.getByText("main")).toBeDefined();
    expect(screen.getByText("3 active tasks")).toBeDefined();
  });
});

describe("Agent Adapter Controls", () => {
  it("offers the Codex SDK adapter type", () => {
    render(<AdapterTypeSelect value="CodexSDK" onChange={vi.fn()} />);

    expect(screen.getByText("Codex SDK")).toBeDefined();
  });
});

describe("BottomInspector Component", () => {
  it("renders real file change diffs when provided", () => {
    const task = {
      id: "T-REAL",
      title: "Real diff task",
      agentName: "Codex Worker",
      status: "review" as const,
      priority: "medium" as const,
      progress: 90,
      description: "Use real file changes",
      relatedFiles: ["src/app.ts"],
      expectedOutput: "Updated file",
      reviewHistory: []
    };

    render(
      <BottomInspector
        activeTab="changes"
        onTabChange={vi.fn()}
        selectedFile={null}
        selectedTask={task}
        selectedAgent={null}
        tasks={[task]}
        fileChanges={[
          {
            id: "fc-1",
            taskId: "T-REAL",
            path: "src/app.ts",
            changeType: "modified",
            diffContent: "diff --git a/src/app.ts b/src/app.ts\n@@ -1 +1 @@\n-before\n+after\n",
            timestamp: "12:00 PM"
          }
        ]}
        generalLogs={[]}
        terminalOutput={[]}
        inspectorHeight={220}
        onResize={vi.fn()}
      />
    );

    expect(screen.getByText("app.ts")).toBeDefined();
    expect(screen.getByText("before")).toBeDefined();
    expect(screen.getByText("after")).toBeDefined();
  });
});

describe("AppShell Coordinator Component", () => {
  it("starts in empty state after closing the workspace and loads a project after selection", async () => {
    localStorage.setItem("ai_team_workspace_closed", "true");

    render(<AppShell />);

    // 1. Verify it starts with empty project state
    await waitFor(() => {
      expect(screen.getByText("No Projects Loaded")).toBeDefined();
    });

    // 2. Open project switcher modal via Recent Projects
    fireEvent.click(screen.getByText("Recent Projects"));
    
    // 3. Wait for projects list to load and display in switcher
    await waitFor(() => {
      expect(screen.getByText("Mock Test Project")).toBeDefined();
    });

    // 4. Click Open Workspace to load the selected project
    fireEvent.click(screen.getByText("Open Workspace"));

    // 5. Verify workspace panels and details render successfully
    await waitFor(() => {
      expect(screen.getByText("Mock Test Project")).toBeDefined();
      expect(screen.getByText("Lead Coordinator")).toBeDefined();
      expect(screen.getByText("Backend Architect")).toBeDefined();
    });
  });

  it("restores the saved active project on startup", async () => {
    localStorage.setItem("ai_team_active_project_id", "p-test-1");

    render(<AppShell />);

    await waitFor(() => {
      expect(screen.getByText("# mock-test-project-dev")).toBeDefined();
      expect(screen.getByText("Lead Coordinator")).toBeDefined();
      expect(screen.getByText("Backend Architect")).toBeDefined();
    });

    expect(screen.queryByText("No Projects Loaded")).toBeNull();
  });
});
