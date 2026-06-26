export interface Agent {
  name: string;
  role: string;
  status: "online" | "idle" | "working" | "error" | "blocked";
  currentTask: string;
  progress: number;
  lastActive: string;
  avatar: string;
  logs: string[];
  // Registry fields
  description?: string;
  capabilities?: string[];
  intelligenceLevel?: string;
  adapterType?: string;
  launchCommand?: string;
  isEnabled?: boolean;
}

export type TaskStatus = "active" | "review" | "completed" | "blocked";
export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
  id: string;
  title: string;
  agentName: string;
  status: TaskStatus;
  priority: TaskPriority;
  progress: number;
  description: string;
  relatedFiles: string[];
  expectedOutput: string;
  reviewHistory?: {
    reviewer: string;
    status: "approved" | "changes_requested";
    feedback: string;
    timestamp: string;
  }[];
}

export type MessageSenderType = "user" | "codex" | "worker" | "system";

export interface Message {
  id: string;
  sender: string;
  senderType: MessageSenderType;
  text: string;
  timestamp: string;
  avatar?: string;
  taskCard?: {
    id: string;
    title: string;
    status: TaskStatus;
    agentName: string;
  };
  fileChanges?: {
    files: { path: string; additions: number; deletions: number; status: "added" | "modified" | "deleted" }[];
    summary: string;
  };
  reviewCard?: {
    taskId: string;
    taskTitle: string;
    status: "approved" | "changes_requested";
    feedback: string;
  };
}

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
  content?: string;
  language?: string;
}

export interface Project {
  id: string;
  name: string;
  localPath: string;
  lastOpened: string;
  status: "active" | "archived" | "development";
  taskCount: number;
  agentCount: number;
  branch: string;
  files: FileNode;
  tasks: Task[];
  agents: Agent[];
  messages: Message[];
}
