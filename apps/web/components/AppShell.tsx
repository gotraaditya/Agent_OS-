"use client";

import React, { useState, useRef, useEffect } from "react";
import { Agent, FileNode, Task, Message, Project } from "../types";
import {
  mockFiles,
  mockTasks,
  mockAgents,
  mockMessages
} from "./mockData";
import { mockProjects } from "./mockProjects";
import { TopHeader } from "./TopHeader";
import { ProjectNavigator } from "./ProjectNavigator";
import { ActivityFeed } from "./ActivityFeed";
import { AgentStatusPanel } from "./AgentStatusPanel";
import { BottomInspector } from "./BottomInspector";
import { NewTaskModal } from "./NewTaskModal";
import { CodeViewer } from "./CodeViewer";
import { ProjectSwitcherModal } from "./ProjectSwitcherModal";
import { ProjectEmptyState } from "./ProjectEmptyState";

interface CenterTab {
  id: string;
  title: string;
  type: "timeline" | "file";
  file?: FileNode;
}

const findFileByPath = (node: FileNode, path: string): FileNode | null => {
  if (node.path === path) return node;
  if (node.children) {
    for (const child of node.children) {
      const found = findFileByPath(child, path);
      if (found) return found;
    }
  }
  return null;
};

export const AppShell: React.FC = () => {
  // Project switching & multi-project management state
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [activeProjectId, setActiveProjectId] = useState<string | null>("p1");
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);
  const [switcherDefaultShowAddForm, setSwitcherDefaultShowAddForm] = useState(false);
  const [currentFiles, setCurrentFiles] = useState<FileNode>(mockFiles);

  // Tabs & panel controls
  const [activeLeftTab, setActiveLeftTab] = useState<"files" | "tasks" | "knowledge">("files");
  const [activeInspectorTab, setActiveInspectorTab] = useState<"changes" | "logs" | "reviews" | "terminal">("changes");

  // Selection states
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(mockTasks[1]); // Default select T-2
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(mockAgents[0]); // Default select Codex
  const [selectedKnowledgeName, setSelectedKnowledgeName] = useState<string | null>(null);

  // Modal control
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);

  // Inspector toggle state
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Inspector height & resize state
  const [inspectorHeight, setInspectorHeight] = useState<number>(220);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // Center workspace tabs
  const [centerTabs, setCenterTabs] = useState<CenterTab[]>([
    { id: "timeline", title: "# ai-team-manager-dev", type: "timeline" }
  ]);
  const [activeCenterTabId, setActiveCenterTabId] = useState<string>("timeline");

  // Mock data states
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [messages, setMessages] = useState<Message[]>(mockMessages);

  // General Log Streams
  const [generalLogs, setGeneralLogs] = useState<string[]>([
    "[SYSTEM] AI Team Orchestrator v1.0.0 initializing...",
    "[SYSTEM] Loaded SQLite local database file: C:\\Users\\Lenovo\\AppData\\Local\\ai-team\\ai_team.db",
    "[SYSTEM] Found 6 registered agent adapters.",
    "[SYSTEM] Listening for agent RPC connections on http://127.0.0.1:8000",
    "[SYSTEM] Successfully initialized project workspace for 'ai-team-manager' on branch 'Ui'."
  ]);

  // Terminal history
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    "Microsoft Windows [Version 10.0.22631.3527]",
    "(c) Microsoft Corporation. All rights reserved.",
    "",
    "C:\\projects\\ai-team-manager> git checkout Ui",
    "Already on 'Ui'",
    "Your branch is up to date with 'origin/Ui'.",
    "",
    "C:\\projects\\ai-team-manager> pytest backend/",
    "============================= test session starts =============================",
    "platform win32 -- Python 3.11.5, pytest-7.4.0, pluggy-1.2.0",
    "rootdir: C:\\projects\\ai-team-manager\\backend",
    "collected 8 items",
    "",
    "tests/test_auth.py ....                                                  [ 50%]",
    "tests/test_main.py ....                                                  [100%]",
    "",
    "============================== 8 passed in 0.42s =============================="
  ]);

  const chatInputRef = useRef<HTMLInputElement | null>(null);

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  const handleSelectProject = (projectId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;

    setActiveProjectId(projectId);
    setTasks(proj.tasks);
    setAgents(proj.agents);
    setMessages(proj.messages);
    setCurrentFiles(proj.files);

    // Clear selections
    setSelectedFile(null);
    setSelectedTask(proj.tasks.find(t => t.status === "active") || null);
    setSelectedAgent(proj.agents[0] || null);
    setSelectedKnowledgeName(null);

    // Reset center panel tabs to just the timeline for the new project!
    const timelineTitle = `# ${proj.name.toLowerCase().replace(/\s+/g, "-")}-dev`;
    setCenterTabs([
      { id: "timeline", title: timelineTitle, type: "timeline" }
    ]);
    setActiveCenterTabId("timeline");
  };

  const handleAddProject = (name: string, path: string, branch: string = "main") => {
    const newProjId = `p-${Date.now()}`;
    const newProj: Project = {
      id: newProjId,
      name,
      localPath: path,
      lastOpened: "Just now",
      status: "development",
      taskCount: 1,
      agentCount: 2,
      branch: branch || "main",
      files: {
        name: `${name.toLowerCase().replace(/\s+/g, "-")}-root`,
        path: "/",
        isDir: true,
        children: [
          {
            name: "src",
            path: "/src",
            isDir: true,
            children: [
              {
                name: "app.py",
                path: "/src/app.py",
                isDir: false,
                language: "python",
                content: `# ${name} main script\nprint("Hello from ${name}!")\n`
              }
            ]
          },
          {
            name: "README.md",
            path: "/README.md",
            isDir: false,
            language: "markdown",
            content: `# ${name}\nInitialized by AI Team Manager.\n`
          }
        ]
      },
      tasks: [
        {
          id: "T-1",
          title: "Initialize project environment",
          agentName: "Codex",
          status: "active",
          priority: "high",
          progress: 10,
          description: "Establish basic codebase layout and write the README file.",
          relatedFiles: ["/README.md"],
          expectedOutput: "Files tree structure with description."
        }
      ],
      agents: [
        {
          name: "Codex",
          role: "Lead Coordinator",
          status: "online",
          currentTask: "Setting up project directory",
          progress: 10,
          lastActive: "Just now",
          avatar: "CX",
          logs: [
            `[SYSTEM] Project '${name}' created at path '${path}'.`,
            `[SYSTEM] Active branch set to '${branch}'.`
          ]
        },
        {
          name: "AntiGravity",
          role: "Backend Architect",
          status: "idle",
          currentTask: "None",
          progress: 0,
          lastActive: "Just now",
          avatar: "AG",
          logs: [
            "[SYSTEM] Adapter online."
          ]
        }
      ],
      messages: [
        {
          id: `m-init-${Date.now()}`,
          sender: "System",
          senderType: "system",
          text: `Project '${name}' initialized at ${path}. Active branch: ${branch}.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]
    };

    const updatedProjects = [...projects, newProj];
    setProjects(updatedProjects);
    handleSelectProject(newProjId);
  };

  const handleArchiveProject = (id: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: "archived" };
      }
      return p;
    }));
  };

  const handleRemoveProject = (id: string) => {
    const updated = projects.filter(p => p.id !== id);
    setProjects(updated);
    if (activeProjectId === id) {
      if (updated.length > 0) {
        handleSelectProject(updated[0].id);
      } else {
        setActiveProjectId(null);
      }
    }
  };

  // Interactive handler: Select a file
  const handleSelectFile = (file: FileNode) => {
    setSelectedFile(file);
    setSelectedTask(null);
    setSelectedKnowledgeName(null);
    
    setCenterTabs(prev => {
      const exists = prev.some(tab => tab.id === file.path);
      if (exists) return prev;
      return [
        ...prev,
        { id: file.path, title: file.name, type: "file", file }
      ];
    });
    setActiveCenterTabId(file.path);
    
    // Append a log and terminal command simulation
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setTerminalOutput(prev => [
      ...prev,
      `C:\\projects\\ai-team-manager> cat .${file.path}`,
      `[File Read] Opened file ${file.name} (${file.content?.length || 0} bytes)`
    ]);
  };

  // Interactive handler: Select a task
  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setSelectedFile(null);
    setSelectedKnowledgeName(null);
    setActiveInspectorTab("changes");

    setTerminalOutput(prev => [
      ...prev,
      `C:\\projects\\ai-team-manager> task-inspect ${task.id}`,
      `ID: ${task.id} | Status: ${task.status.toUpperCase()} | Assigned: @${task.agentName}`
    ]);
  };

  // Interactive handler: Select an agent
  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setSelectedFile(null);
    setSelectedTask(null);
    setSelectedKnowledgeName(null);
    setActiveInspectorTab("logs");

    setTerminalOutput(prev => [
      ...prev,
      `C:\\projects\\ai-team-manager> agent-status --name ${agent.name}`,
      `Role: ${agent.role} | Status: ${agent.status.toUpperCase()} | Task: ${agent.currentTask}`
    ]);
  };

  // Interactive handler: Select knowledge doc
  const handleSelectKnowledge = (name: string, content: string) => {
    setSelectedKnowledgeName(name);
    const mockFileNode: FileNode = {
      name,
      path: `/docs/${name}`,
      isDir: false,
      content,
      language: "markdown"
    };
    setSelectedFile(mockFileNode);
    setSelectedTask(null);

    setCenterTabs(prev => {
      const exists = prev.some(tab => tab.id === mockFileNode.path);
      if (exists) return prev;
      return [
        ...prev,
        { id: mockFileNode.path, title: mockFileNode.name, type: "file", file: mockFileNode }
      ];
    });
    setActiveCenterTabId(mockFileNode.path);
  };

  const handleCloseTab = (tabId: string) => {
    if (activeCenterTabId === tabId) {
      const tabIndex = centerTabs.findIndex(t => t.id === tabId);
      if (tabIndex > -1) {
        const nextActiveTab = centerTabs[tabIndex - 1] || centerTabs[tabIndex + 1] || { id: "timeline" };
        setActiveCenterTabId(nextActiveTab.id);
      }
    }
    setCenterTabs(prev => prev.filter(t => t.id !== tabId));
  };

  // Handle task adding
  const handleAddTask = (newTask: Task) => {
    setTasks(prev => [...prev, newTask]);
    
    // Add system message to feed
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const systemMsg: Message = {
      id: `M-SYS-${Date.now()}`,
      sender: "System",
      senderType: "system",
      text: `Task ${newTask.id} (${newTask.title}) created by user and assigned to ${newTask.agentName}`,
      timestamp,
      taskCard: {
        id: newTask.id,
        title: newTask.title,
        status: newTask.status,
        agentName: newTask.agentName
      }
    };
    
    setMessages(prev => [...prev, systemMsg]);
    setGeneralLogs(prev => [
      ...prev,
      `[ACTION] User created task ${newTask.id} and assigned to ${newTask.agentName}.`
    ]);

    // Set as active selected task
    setSelectedTask(newTask);
    setSelectedFile(null);
    setActiveLeftTab("tasks");
    setActiveInspectorTab("changes");
  };

  // Send message to Codex simulator
  const handleSendMessage = (text: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = {
      id: `M-USER-${Date.now()}`,
      sender: "Aditya Gotra",
      senderType: "user",
      text,
      timestamp,
      avatar: "AG"
    };

    setMessages(prev => [...prev, userMsg]);
    setGeneralLogs(prev => [...prev, `[CHAT] User: "${text}"`]);

    // Simulate Codex response after 1 second
    setTimeout(() => {
      const codexTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let codexReply = "";

      const lowerText = text.toLowerCase();
      if (lowerText.includes("task") || lowerText.includes("create") || lowerText.includes("new")) {
        codexReply = "I can assist in task definition. To create a new task and assign it to a worker agent, click the **New Task** button on the top right corner. Fill out the details, and I will dispatch it to the designated agent adapter.";
      } else if (lowerText.includes("status") || lowerText.includes("progress") || lowerText.includes("agents")) {
        codexReply = "Currently, OpenCode is working on T-2 (Create Dashboard, 68% progress) and Blackbox is addressing my review revisions on T-3 (DB tests, 90% progress). AntiGravity and Mimo Code are idle, and Kilocode is blocked by Docker issues.";
      } else if (lowerText.includes("help") || lowerText.includes("commands") || lowerText.includes("how")) {
        codexReply = "I am Codex, the Lead Engineer. You can communicate with me here. Use the Left Panel to view project files, task groups, and knowledge docs. You can click on agents on the right to inspect their live subprocess logs in the Bottom Inspector panel below.";
      } else if (lowerText.includes("backend") || lowerText.includes("database")) {
        codexReply = "The FastAPI backend is fully connected and responding. The sqlite database is initialized. AntiGravity completed the JWT authentication middleware (T-1) which I approved. Blackbox is testing the database connector routines next.";
      } else {
        codexReply = `Understood. I will parse your instruction in the context of the current project branch (Ui). Let me know if you would like me to allocate any subtasks or trigger a code review on the active changes in the workspace.`;
      }

      const codexMsg: Message = {
        id: `M-CODEX-${Date.now()}`,
        sender: "Codex",
        senderType: "codex",
        text: codexReply,
        timestamp: codexTimestamp,
        avatar: "CX"
      };

      setMessages(prev => [...prev, codexMsg]);
      setGeneralLogs(prev => [...prev, `[CHAT] Codex: "${codexReply}"`]);
    }, 1000);
  };

  const gridStyle = isInspectorOpen && activeProject
    ? { gridTemplateRows: `56px minmax(0, 1fr) ${inspectorHeight}px` }
    : { gridTemplateRows: `56px minmax(0, 1fr)` };

  return (
    <main
      className={`app-shell ${isInspectorOpen && activeProject ? "" : "inspector-closed"} ${isResizing ? "is-resizing" : ""}`}
      style={gridStyle}
    >
      {/* Top Header */}
      <TopHeader
        projectName={activeProject ? activeProject.name : "No Project"}
        currentBranch={activeProject ? activeProject.branch : "N/A"}
        onOpenNewTask={() => setIsNewTaskModalOpen(true)}
        onFocusSearch={() => {}}
        activeTasksCount={activeProject ? tasks.filter(t => t.status === "active").length : 0}
        isInspectorOpen={isInspectorOpen && !!activeProject}
        onToggleInspector={() => setIsInspectorOpen(!isInspectorOpen)}
        projects={projects.map(p => ({ id: p.id, name: p.name }))}
        onSelectProject={handleSelectProject}
        onOpenProjectSwitcher={() => {
          setSwitcherDefaultShowAddForm(false);
          setIsProjectSwitcherOpen(true);
        }}
        onOpenCreateProject={() => {
          setSwitcherDefaultShowAddForm(true);
          setIsProjectSwitcherOpen(true);
        }}
      />

      {/* Main Panel Content Grid */}
      {activeProject ? (
        <section className="workspace" aria-label="Command Center workspace panels">
          <ProjectNavigator
            activeTab={activeLeftTab}
            onTabChange={setActiveLeftTab}
            files={currentFiles}
            selectedFilePath={selectedFile?.path || null}
            onSelectFile={handleSelectFile}
            tasks={tasks}
            selectedTaskId={selectedTask?.id || null}
            onSelectTask={handleSelectTask}
            selectedKnowledgeName={selectedKnowledgeName}
            onSelectKnowledge={handleSelectKnowledge}
          />

          <div className="center-workspace-panel">
            {/* Tab Bar */}
            <div className="center-tab-bar" role="tablist">
              {centerTabs.map((tab) => {
                const isActive = activeCenterTabId === tab.id;
                return (
                  <div
                    key={tab.id}
                    className={`center-tab-item ${isActive ? "active" : ""}`}
                    onClick={() => setActiveCenterTabId(tab.id)}
                    role="tab"
                    aria-selected={isActive}
                  >
                    {tab.type === "timeline" ? (
                      <span className="tab-icon">#</span>
                    ) : (
                      <span className="tab-icon">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="file-icon-mini">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                          <path d="M14 3v5h5" />
                        </svg>
                      </span>
                    )}
                    <span className="tab-title">{tab.title}</span>

                    {tab.type !== "timeline" && (
                      <button
                        className="tab-close-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCloseTab(tab.id);
                        }}
                        aria-label={`Close ${tab.title} tab`}
                      >
                        &times;
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Tab Content */}
            <div className="center-tab-content">
              {activeCenterTabId === "timeline" ? (
                <ActivityFeed
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  inputRef={chatInputRef}
                  onOpenFileByPath={(path) => {
                    const fileNode = findFileByPath(currentFiles, path);
                    if (fileNode) handleSelectFile(fileNode);
                  }}
                />
              ) : (
                (() => {
                  const activeTab = centerTabs.find((t) => t.id === activeCenterTabId);
                  if (activeTab && activeTab.file) {
                    return (
                      <div className="center-code-viewer-wrapper">
                        <CodeViewer
                          fileName={activeTab.file.name}
                          content={activeTab.file.content || ""}
                          language={activeTab.file.language || "text"}
                        />
                      </div>
                    );
                  }
                  return null;
                })()
              )}
            </div>
          </div>

          <AgentStatusPanel
            agents={agents}
            selectedAgentName={selectedAgent?.name || null}
            onSelectAgent={handleSelectAgent}
          />
        </section>
      ) : (
        <ProjectEmptyState
          onOpenProjectSwitcher={() => {
            setSwitcherDefaultShowAddForm(false);
            setIsProjectSwitcherOpen(true);
          }}
          onOpenCreateProject={() => {
            setSwitcherDefaultShowAddForm(true);
            setIsProjectSwitcherOpen(true);
          }}
        />
      )}

      {/* Bottom Inspector Panel */}
      {activeProject && isInspectorOpen && (
        <BottomInspector
          activeTab={activeInspectorTab}
          onTabChange={setActiveInspectorTab}
          selectedFile={selectedFile}
          selectedTask={selectedTask}
          selectedAgent={selectedAgent}
          tasks={tasks}
          generalLogs={generalLogs}
          terminalOutput={terminalOutput}
          onOpenFileByPath={(path) => {
            const fileNode = findFileByPath(currentFiles, path);
            if (fileNode) handleSelectFile(fileNode);
          }}
          onClearTaskSelection={() => setSelectedTask(null)}
          inspectorHeight={inspectorHeight}
          onResize={setInspectorHeight}
          onResizeStart={() => setIsResizing(true)}
          onResizeEnd={() => setIsResizing(false)}
        />
      )}

      {/* New Task dialog */}
      <NewTaskModal
        isOpen={isNewTaskModalOpen}
        onClose={() => setIsNewTaskModalOpen(false)}
        onAddTask={handleAddTask}
        agents={agents.map(a => ({ name: a.name, role: a.role }))}
      />

      {/* Project Switcher Modal */}
      <ProjectSwitcherModal
        isOpen={isProjectSwitcherOpen}
        onClose={() => setIsProjectSwitcherOpen(false)}
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={handleSelectProject}
        onAddProject={handleAddProject}
        onArchiveProject={handleArchiveProject}
        onRemoveProject={handleRemoveProject}
        defaultShowAddForm={switcherDefaultShowAddForm}
      />
    </main>
  );
};
