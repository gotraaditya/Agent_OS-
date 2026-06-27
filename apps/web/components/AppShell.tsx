"use client";

import React, { useState, useRef, useEffect } from "react";
import { Agent, FileNode, Task, Message, Project, TaskStatus } from "../types";
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
import { AddAgentModal } from "./AddAgentModal";
import { EditAgentModal } from "./EditAgentModal";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isProjectSwitcherOpen, setIsProjectSwitcherOpen] = useState(false);
  const [switcherDefaultShowAddForm, setSwitcherDefaultShowAddForm] = useState(false);
  const [currentFiles, setCurrentFiles] = useState<FileNode>(mockFiles);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch projects from backend database on mount
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
        const response = await fetch(`${backendUrl}/api/projects`);
        if (response.ok) {
          setIsBackendConnected(true);
          const data: Project[] = await response.json();
          setProjects(data);

          let savedActiveId = localStorage.getItem("ai_team_active_project_id");
          if (!savedActiveId || !data.some(p => p.id === savedActiveId)) {
            savedActiveId = data[0]?.id || null;
          }

          if (savedActiveId) {
            const activeProj = data.find(p => p.id === savedActiveId);
            if (activeProj) {
              setActiveProjectId(savedActiveId);
              setTasks(activeProj.tasks);
              setAgents(activeProj.agents);
              setMessages(activeProj.messages);
              setSelectedTask(activeProj.tasks.find(t => t.status === "active") || null);
              setSelectedAgent(activeProj.agents[0] || null);

              if (activeProj.localPath) {
                try {
                  const scanRes = await fetch(`${backendUrl}/api/workspace/scan?path=${encodeURIComponent(activeProj.localPath)}`);
                  if (scanRes.ok) {
                    const fileTree = await scanRes.json();
                    setCurrentFiles(fileTree);
                  } else {
                    setCurrentFiles(activeProj.files || mockFiles);
                  }
                } catch {
                  setCurrentFiles(activeProj.files || mockFiles);
                }
              } else {
                setCurrentFiles(activeProj.files || mockFiles);
              }
            }
          }
        } else {
          setIsBackendConnected(false);
        }
      } catch (err) {
        setIsBackendConnected(false);
        console.error("Failed to load projects from SQLite database backend", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // Save active project selection changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      if (activeProjectId) {
        localStorage.setItem("ai_team_active_project_id", activeProjectId);
      } else {
        localStorage.removeItem("ai_team_active_project_id");
      }
    }
  }, [activeProjectId]);



  // Tabs & panel controls
  const [activeLeftTab, setActiveLeftTab] = useState<"files" | "tasks" | "knowledge">("files");
  const [activeInspectorTab, setActiveInspectorTab] = useState<"changes" | "logs" | "reviews" | "terminal" | "details">("changes");

  // Selection states
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(mockTasks[1]); // Default select T-2
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(mockAgents[0]); // Default select Codex
  const [selectedKnowledgeName, setSelectedKnowledgeName] = useState<string | null>(null);

  // Modal control
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
  const [isEditAgentOpen, setIsEditAgentOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(true);

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

  // Poll project data from backend database every 3 seconds to get live status, progress, logs and review history updates
  useEffect(() => {
    if (!activeProjectId) return;

    let isSubscribed = true;

    const pollProject = async () => {
      try {
        const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
        const response = await fetch(`${backendUrl}/api/projects`);
        if (response.ok && isSubscribed) {
          setIsBackendConnected(true);
          const data: Project[] = await response.json();
          setProjects(data);

          const currentProj = data.find(p => p.id === activeProjectId);
          if (currentProj) {
            setTasks(currentProj.tasks);
            setAgents(currentProj.agents);
            setMessages(currentProj.messages);

            // Dynamically refresh selection states
            if (selectedTask) {
              const updatedTask = currentProj.tasks.find(t => t.id === selectedTask.id);
              if (updatedTask) {
                if (
                  updatedTask.status !== selectedTask.status ||
                  updatedTask.progress !== selectedTask.progress ||
                  JSON.stringify(updatedTask.reviewHistory) !== JSON.stringify(selectedTask.reviewHistory)
                ) {
                  setSelectedTask(updatedTask);
                }
              }
            }
            if (selectedAgent) {
              const updatedAgent = currentProj.agents.find(a => a.name === selectedAgent.name);
              if (updatedAgent) {
                if (
                  updatedAgent.status !== selectedAgent.status ||
                  updatedAgent.progress !== selectedAgent.progress ||
                  updatedAgent.logs.length !== selectedAgent.logs.length
                ) {
                  setSelectedAgent(updatedAgent);
                }
              }
            }
          }
        } else {
          setIsBackendConnected(false);
        }
      } catch (err) {
        setIsBackendConnected(false);
        console.error("Error polling project updates", err);
      }
    };

    const intervalId = setInterval(pollProject, 3000);
    return () => {
      isSubscribed = false;
      clearInterval(intervalId);
    };
  }, [activeProjectId, selectedTask, selectedAgent]);

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

  // Sync state changes back to projects list so switching projects preserves state
  useEffect(() => {
    if (!activeProjectId) return;
    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        return {
          ...p,
          tasks,
          agents,
          messages,
          files: currentFiles,
          agentCount: agents.length,
          taskCount: tasks.length
        };
      }
      return p;
    }));
  }, [tasks, agents, messages, currentFiles, activeProjectId]);

  const activeProject = projects.find(p => p.id === activeProjectId) || null;

  const loadProjectWorkspace = async (proj: Project) => {
    setActiveProjectId(proj.id);
    setTasks(proj.tasks);
    setAgents(proj.agents);
    setMessages(proj.messages);

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

    // Scan real directory path if it exists
    if (proj.localPath) {
      try {
        const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
        const response = await fetch(`${backendUrl}/api/workspace/scan?path=${encodeURIComponent(proj.localPath)}`);
        if (response.ok) {
          const fileTree = await response.json();
          setCurrentFiles(fileTree);
          
          setGeneralLogs(prev => [
            ...prev,
            `[SYSTEM] Scanned workspace folder '${proj.localPath}' successfully.`
          ]);
        } else {
          console.warn("Backend failed to scan, falling back to mock files.");
          setCurrentFiles(proj.files || mockFiles);
        }
      } catch (err) {
        console.error("Failed to fetch folder scan, falling back to mock files.", err);
        setCurrentFiles(proj.files || mockFiles);
      }
    } else {
      setCurrentFiles(proj.files || mockFiles);
    }
  };

  const handleSelectProject = async (projectId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (!proj) return;

    await loadProjectWorkspace(proj);
  };

  const handleAddProject = async (name: string, path: string, branch: string = "main") => {
    try {
      const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
      const response = await fetch(`${backendUrl}/api/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, localPath: path, branch })
      });
      if (response.ok) {
        const newProj: Project = await response.json();
        setProjects(prev => [...prev, newProj]);
        await loadProjectWorkspace(newProj);
      }
    } catch (err) {
      console.error("Failed to create project in local database", err);
    }
  };

  const handleArchiveProject = (id: string) => {
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, status: "archived" };
      }
      return p;
    }));
  };

  const handleRemoveProject = async (id: string) => {
    try {
      const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
      const response = await fetch(`${backendUrl}/api/projects/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        const updated = projects.filter(p => p.id !== id);
        setProjects(updated);
        if (activeProjectId === id) {
          if (updated.length > 0) {
            await handleSelectProject(updated[0].id);
          } else {
            setActiveProjectId(null);
          }
        }
      }
    } catch (err) {
      console.error("Failed to delete project from local database", err);
    }
  };

  // Interactive handler: Select a file
  const handleSelectFile = async (file: FileNode) => {
    setSelectedFile(file);
    setSelectedTask(null);
    setSelectedKnowledgeName(null);
    
    let fileWithContent = file;
    
    // If it's a file, has no content populated, and has an absolute/real path, let's fetch it on demand
    if (!file.isDir && file.content === undefined && (file.path.startsWith("/") || file.path.includes(":"))) {
      try {
        const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
        const activeRoot = activeProject?.localPath || "";
        const response = await fetch(
          `${backendUrl}/api/workspace/file?path=${encodeURIComponent(file.path)}&root=${encodeURIComponent(activeRoot)}`
        );
        if (response.ok) {
          const data = await response.json();
          fileWithContent = { ...file, content: data.content, language: data.language || file.language };
        }
      } catch (err) {
        console.error("Failed to read file content from backend", err);
      }
    }
    
    setCenterTabs(prev => {
      const exists = prev.some(tab => tab.id === file.path);
      if (exists) {
        // Update the existing tab with the loaded content
        return prev.map(tab => tab.id === file.path ? { ...tab, file: fileWithContent } : tab);
      }
      return [
        ...prev,
        { id: file.path, title: file.name, type: "file", file: fileWithContent }
      ];
    });
    setActiveCenterTabId(file.path);
    
    // Append a log and terminal command simulation
    const byteLength = fileWithContent.content?.length || 0;
    setTerminalOutput(prev => [
      ...prev,
      `C:\\projects\\ai-team-manager> cat "${file.path}"`,
      `[File Read] Opened file ${file.name} (${byteLength} bytes)`
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
  const handleAddTask = async (newTask: Task) => {
    if (!activeProjectId) return;
    try {
      const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
      const response = await fetch(`${backendUrl}/api/projects/${activeProjectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: newTask.id,
          title: newTask.title,
          agentName: newTask.agentName,
          status: newTask.status,
          priority: newTask.priority,
          progress: newTask.progress || 0,
          description: newTask.description || "",
          relatedFiles: newTask.relatedFiles || [],
          expectedOutput: newTask.expectedOutput || ""
        })
      });
      if (response.ok) {
        setTasks(prev => [...prev, newTask]);

        // Add system message to feed
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const systemMsg: Message = {
          id: `M-SYS-TASK-${Date.now()}`,
          sender: "System",
          senderType: "system",
          text: `Task ${newTask.id} (${newTask.title}) created and assigned to @${newTask.agentName}.`,
          timestamp,
          taskCard: {
            id: newTask.id,
            title: newTask.title,
            status: newTask.status,
            agentName: newTask.agentName
          }
        };

        // Save message to database
        await fetch(`${backendUrl}/api/projects/${activeProjectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: systemMsg.id,
            sender: systemMsg.sender,
            senderType: systemMsg.senderType,
            text: systemMsg.text,
            timestamp: systemMsg.timestamp,
            avatar: null,
            meta: { taskCard: systemMsg.taskCard }
          })
        });

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
      }
    } catch (err) {
      console.error("Failed to add task to database", err);
    }
  };

  // Handle task review submission
  const handleSubmitReview = async (taskId: string, status: "approved" | "changes_requested", feedback: string) => {
    if (!activeProjectId) return;
    try {
      const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const response = await fetch(`${backendUrl}/api/projects/${activeProjectId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          reviewer: "Codex",
          status,
          feedback,
          timestamp
        })
      });
      if (response.ok) {
        const task = tasks.find(t => t.id === taskId);
        const taskTitle = task ? task.title : "";

        // Update local tasks state
        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            const newReviews = [
              ...(t.reviewHistory || []),
              { reviewer: "Codex", status, feedback, timestamp }
            ];
            return {
              ...t,
              status: status === "approved" ? "completed" : "active",
              progress: status === "approved" ? 100 : t.progress,
              reviewHistory: newReviews
            };
          }
          return t;
        }));

        if (selectedTask?.id === taskId) {
          setSelectedTask(prev => {
            if (!prev) return null;
            return {
              ...prev,
              status: status === "approved" ? "completed" : "active",
              progress: status === "approved" ? 100 : prev.progress,
              reviewHistory: [
                ...(prev.reviewHistory || []),
                { reviewer: "Codex", status, feedback, timestamp }
              ]
            };
          });
        }

        // Post review message to timeline feed
        const systemMsg: Message = {
          id: `M-SYS-REV-${Date.now()}`,
          sender: "Codex",
          senderType: "codex",
          text: status === "approved"
            ? `Approved task ${taskId}: "${feedback}"`
            : `Requested revisions for task ${taskId}: "${feedback}"`,
          timestamp,
          reviewCard: {
            taskId,
            taskTitle,
            status,
            feedback
          }
        };

        await fetch(`${backendUrl}/api/projects/${activeProjectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: systemMsg.id,
            sender: systemMsg.sender,
            senderType: systemMsg.senderType,
            text: systemMsg.text,
            timestamp: systemMsg.timestamp,
            avatar: "CX",
            meta: { reviewCard: systemMsg.reviewCard }
          })
        });

        setMessages(prev => [...prev, systemMsg]);
        setGeneralLogs(prev => [
          ...prev,
          `[REVIEW] Codex submitted review for task ${taskId} (Status: ${status.toUpperCase()}).`
        ]);
        
        // Contextually switch tab back to reviews so they can inspect history
        setActiveInspectorTab("reviews");
      }
    } catch (err) {
      console.error("Failed to submit task review", err);
    }
  };

  // Handle task status transition (e.g. active to review)
  const handleSubmitTaskStatus = async (taskId: string, status: string) => {
    if (!activeProjectId) return;
    try {
      const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
      const response = await fetch(`${backendUrl}/api/projects/${activeProjectId}/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            return { ...t, status: status as TaskStatus };
          }
          return t;
        }));

        if (selectedTask?.id === taskId) {
          setSelectedTask(prev => {
            if (!prev) return null;
            return { ...prev, status: status as TaskStatus };
          });
        }

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const systemMsg: Message = {
          id: `M-SYS-STATUS-${Date.now()}`,
          sender: "System",
          senderType: "system",
          text: `Task ${taskId} status updated to: ${status.toUpperCase()}.`,
          timestamp
        };

        await fetch(`${backendUrl}/api/projects/${activeProjectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: systemMsg.id,
            sender: systemMsg.sender,
            senderType: systemMsg.senderType,
            text: systemMsg.text,
            timestamp: systemMsg.timestamp,
            avatar: null,
            meta: null
          })
        });

        setMessages(prev => [...prev, systemMsg]);
        setGeneralLogs(prev => [
          ...prev,
          `[STATUS] Task ${taskId} status transitioned to ${status.toUpperCase()}.`
        ]);
      }
    } catch (err) {
      console.error("Failed to update task status", err);
    }
  };

  // Handle agent adding
  const handleAddAgent = async (newAgent: Agent) => {
    if (!activeProjectId) return;
    try {
      const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
      const response = await fetch(`${backendUrl}/api/projects/${activeProjectId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newAgent.name,
          role: newAgent.role,
          status: newAgent.status,
          currentTask: newAgent.currentTask || "None",
          progress: newAgent.progress || 0,
          lastActive: newAgent.lastActive || "Just now",
          avatar: newAgent.avatar || "",
          logs: newAgent.logs || [],
          description: newAgent.description || "",
          capabilities: newAgent.capabilities || [],
          intelligenceLevel: newAgent.intelligenceLevel || "Low",
          adapterType: newAgent.adapterType || "Mock",
          launchCommand: newAgent.launchCommand || "",
          isEnabled: newAgent.isEnabled !== false
        })
      });
      if (response.ok) {
        setAgents(prev => [...prev, newAgent]);

        // Add system message to feed
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const systemMsg: Message = {
          id: `M-SYS-AGENT-${Date.now()}`,
          sender: "System",
          senderType: "system",
          text: `Agent '${newAgent.name}' (${newAgent.role}) successfully registered in the project workspace.`,
          timestamp
        };

        // Write message to database
        await fetch(`${backendUrl}/api/projects/${activeProjectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: systemMsg.id,
            sender: systemMsg.sender,
            senderType: systemMsg.senderType,
            text: systemMsg.text,
            timestamp: systemMsg.timestamp,
            avatar: null,
            meta: null
          })
        });

        setMessages(prev => [...prev, systemMsg]);
        setGeneralLogs(prev => [
          ...prev,
          `[REGISTRY] Registered new agent adapter: ${newAgent.name} (Role: ${newAgent.role}).`
        ]);

        // Select the new agent
        setSelectedAgent(newAgent);
      }
    } catch (err) {
      console.error("Failed to add agent to database", err);
    }
  };

  // Handle agent updating
  const handleUpdateAgent = async (updatedAgent: Agent) => {
    if (!activeProjectId) return;
    try {
      const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
      const response = await fetch(`${backendUrl}/api/projects/${activeProjectId}/agents/${updatedAgent.name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: updatedAgent.role,
          status: updatedAgent.status,
          currentTask: updatedAgent.currentTask,
          progress: updatedAgent.progress,
          lastActive: updatedAgent.lastActive,
          avatar: updatedAgent.avatar,
          logs: updatedAgent.logs,
          description: updatedAgent.description,
          capabilities: updatedAgent.capabilities,
          intelligenceLevel: updatedAgent.intelligenceLevel,
          adapterType: updatedAgent.adapterType,
          launchCommand: updatedAgent.launchCommand,
          isEnabled: updatedAgent.isEnabled !== false
        })
      });
      if (response.ok) {
        setAgents(prev => prev.map(a => a.name === updatedAgent.name ? updatedAgent : a));

        // Update selected agent if we updated the currently selected one
        if (selectedAgent && selectedAgent.name === updatedAgent.name) {
          setSelectedAgent(updatedAgent);
        }

        // Add system log
        setGeneralLogs(prev => [
          ...prev,
          `[REGISTRY] Updated configuration for agent: ${updatedAgent.name} (Role: ${updatedAgent.role}, Enabled: ${updatedAgent.isEnabled !== false}).`
        ]);
      }
    } catch (err) {
      console.error("Failed to update agent configuration", err);
    }
  };

  // Handle agent deleting/unregistering
  const handleDeleteAgent = async (name: string) => {
    if (name === "Codex" || !activeProjectId) return; // Codex cannot be removed
    try {
      const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
      const response = await fetch(`${backendUrl}/api/projects/${activeProjectId}/agents/${name}`, {
        method: "DELETE"
      });
      if (response.ok) {
        setAgents(prev => prev.filter(a => a.name !== name));

        // Deselect if active
        if (selectedAgent && selectedAgent.name === name) {
          setSelectedAgent(agents.find(a => a.name !== name) || null);
        }

        // Add system message
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const systemMsg: Message = {
          id: `M-SYS-AGENT-DEL-${Date.now()}`,
          sender: "System",
          senderType: "system",
          text: `Agent '${name}' unregistered from the project workspace.`,
          timestamp
        };

        // Save message to database
        await fetch(`${backendUrl}/api/projects/${activeProjectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: systemMsg.id,
            sender: systemMsg.sender,
            senderType: systemMsg.senderType,
            text: systemMsg.text,
            timestamp: systemMsg.timestamp,
            avatar: null,
            meta: null
          })
        });

        setMessages(prev => [...prev, systemMsg]);
        setGeneralLogs(prev => [
          ...prev,
          `[REGISTRY] Unregistered agent: ${name}.`
        ]);
      }
    } catch (err) {
      console.error("Failed to delete agent from database", err);
    }
  };

  // Switch Git active branch
  const handleSelectBranch = async (newBranch: string) => {
    if (!activeProjectId) return;
    try {
      const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
      const response = await fetch(`${backendUrl}/api/projects/${activeProjectId}/branch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: newBranch })
      });
      if (response.ok) {
        setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, branch: newBranch } : p));

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const systemMsg: Message = {
          id: `M-SYS-BRANCH-${Date.now()}`,
          sender: "System",
          senderType: "system",
          text: `Switched active branch to '${newBranch}'.`,
          timestamp
        };

        // Save message to database
        await fetch(`${backendUrl}/api/projects/${activeProjectId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: systemMsg.id,
            sender: systemMsg.sender,
            senderType: systemMsg.senderType,
            text: systemMsg.text,
            timestamp: systemMsg.timestamp,
            avatar: null,
            meta: null
          })
        });

        setMessages(prev => [...prev, systemMsg]);
        setGeneralLogs(prev => [
          ...prev,
          `[GIT] Switched active repository branch to '${newBranch}'.`
        ]);
      }
    } catch (err) {
      console.error("Failed to switch branch in database", err);
    }
  };

  // Focus chat input composer and switch center tab
  const handleAskCodex = () => {
    setActiveCenterTabId("timeline");
    setTimeout(() => {
      chatInputRef.current?.focus();
    }, 50);
  };

  // Send message to Codex simulator/router
  const handleSendMessage = async (text: string) => {
    if (!activeProjectId) return;
    try {
      const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const userMsgId = `M-USER-${Date.now()}`;

      // Save user message and get Codex response from backend
      const response = await fetch(`${backendUrl}/api/projects/${activeProjectId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userMsgId,
          sender: "Aditya Gotra",
          senderType: "user",
          text,
          timestamp,
          avatar: "AG",
          meta: null
        })
      });

      if (response.ok) {
        const data = await response.json();
        const userMsg: Message = data.userMessage;
        const codexMsg: Message | null = data.codexMessage;

        // Append user message and Codex reply locally
        setMessages(prev => {
          const list = [...prev, userMsg];
          if (codexMsg) {
            list.push(codexMsg);
          }
          return list;
        });

        setGeneralLogs(prev => {
          const logs = [...prev, `[CHAT] User: "${text}"`];
          if (codexMsg) {
            logs.push(`[CHAT] Codex: "${codexMsg.text}"`);
          }
          return logs;
        });
      }
    } catch (err) {
      console.error("Failed to send message to database", err);
    }
  };

  const gridStyle = isInspectorOpen && activeProject
    ? { gridTemplateRows: `56px minmax(0, 1fr) ${inspectorHeight}px` }
    : { gridTemplateRows: `56px minmax(0, 1fr)` };

  return (
    <main
      className={`app-shell ${isInspectorOpen && activeProject ? "" : "inspector-closed"} ${isResizing ? "is-resizing" : ""}`}
      style={gridStyle}
    >
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
      `}</style>

      {!isBackendConnected && (
        <div className="offline-banner" style={{ gridColumn: "1 / -1", background: "#78350f", color: "#fef3c7", padding: "6px 16px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 500, gap: "8px", borderBottom: "1px solid #92400e", zIndex: 100 }}>
          <span className="blink-dot" style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b", animation: "blink 1.5s infinite" }} />
          <span>⚡ Command Center disconnected. Reconnecting to local SQLite database backend...</span>
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay" style={{ position: "absolute", inset: 0, background: "rgba(17,24,39,0.8)", backdropFilter: "blur(4px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 1000, gap: "16px" }}>
          <div className="spinner" style={{ width: "36px", height: "36px", border: "3px solid rgba(255,255,255,0.1)", borderTopColor: "#a855f7", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <span style={{ fontSize: "14px", fontWeight: 500, color: "#e9d5ff" }}>Initializing Agent OS Workspace...</span>
        </div>
      )}

      {/* Top Header */}
      <TopHeader
        projectName={activeProject ? activeProject.name : "No Project"}
        currentBranch={activeProject ? activeProject.branch : "N/A"}
        onOpenNewTask={() => setIsNewTaskModalOpen(true)}
        onFocusSearch={() => {}}
        onAskCodex={handleAskCodex}
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
        onSelectBranch={handleSelectBranch}
        onOpenSettings={() => setIsSettingsOpen(true)}
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
            onOpenAddAgent={() => setIsAddAgentOpen(true)}
            onOpenEditAgent={(agent) => {
              setEditingAgent(agent);
              setIsEditAgentOpen(true);
            }}
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
          onSubmitReview={handleSubmitReview}
          onSubmitTaskStatus={handleSubmitTaskStatus}
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

      {/* Add Agent Modal */}
      <AddAgentModal
        isOpen={isAddAgentOpen}
        onClose={() => setIsAddAgentOpen(false)}
        onAddAgent={handleAddAgent}
      />

      {/* Edit Agent Modal */}
      <EditAgentModal
        isOpen={isEditAgentOpen}
        onClose={() => {
          setIsEditAgentOpen(false);
          setEditingAgent(null);
        }}
        agent={editingAgent}
        onUpdateAgent={handleUpdateAgent}
        onDeleteAgent={handleDeleteAgent}
      />

      {isSettingsOpen && (
        <div className="modal-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1001 }} onClick={() => setIsSettingsOpen(false)}>
          <div className="modal-content" style={{ width: "400px", padding: "24px", background: "rgba(30, 41, 59, 0.95)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "8px", color: "#e2e8f0" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>System Settings</h3>
              <button onClick={() => setIsSettingsOpen(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: "16px" }}>&times;</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Backend Server Status</label>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px" }}>
                  <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: isBackendConnected ? "#22c55e" : "#ef4444" }} />
                  <span>{isBackendConnected ? "Connected (127.0.0.1:8000)" : "Disconnected"}</span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "4px" }}>Active Workspace Branch</label>
                <span style={{ fontSize: "14px", fontFamily: "monospace", background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: "4px" }}>
                  {activeProject ? activeProject.branch : "N/A"}
                </span>
              </div>

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: "16px", marginTop: "8px" }}>
                <label style={{ display: "block", fontSize: "12px", color: "#94a3b8", marginBottom: "8px" }}>Database Administration</label>
                <button
                  onClick={async () => {
                    if (confirm("Are you sure you want to reset the database and re-seed all initial mock data? This will clear active simulation records.")) {
                      try {
                        const backendUrl = (window as any).desktop?.backendUrl || "http://127.0.0.1:8000";
                        const res = await fetch(`${backendUrl}/api/settings/reseed`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ confirm: "RESET_DATABASE" })
                        });
                        if (res.ok) {
                          alert("Database successfully reset and re-seeded!");
                          window.location.reload();
                        } else {
                          alert("Failed to reset database: Server returned error");
                        }
                      } catch (err) {
                        alert("Failed to reset database: Connection error");
                      }
                    }
                  }}
                  style={{ width: "100%", padding: "10px", borderRadius: "4px", background: "#7f1d1d", border: "1px solid #b91c1c", color: "#fca5a5", cursor: "pointer", fontWeight: 500 }}
                >
                  Reset & Re-seed Database
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
