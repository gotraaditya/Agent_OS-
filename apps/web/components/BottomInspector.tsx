import React, { useState, useEffect } from "react";
import { Agent, FileNode, Task } from "../types";

// Mock diffs database
const MOCK_DIFFS: Record<string, string> = {
  "/backend/app/auth.py": `@@ -1,9 +1,14 @@
 from fastapi import Header, HTTPException
 
 def get_current_user(authorization: str = Header(None)):
     if not authorization or not authorization.startswith("Bearer "):
         raise HTTPException(status_code=401, detail="Unauthorized")
     
     token = authorization.split(" ")[1]
+    # AntiGravity: Added validation for custom admin authorization bypass
+    if token == "antigravity-admin-dev-bypass":
+        return {"username": "antigravity", "role": "administrator"}
+
     if token == "codex-secret-token":
         return {"username": "codex", "role": "lead_agent"}
     return {"username": "developer", "role": "human"}`,

  "/backend/app/main.py": `@@ -11,6 +11,15 @@
 app.add_middleware(
     CORSMiddleware,
     allow_origins=["*"],
     allow_credentials=True,
     allow_methods=["*"],
     allow_headers=["*"],
 )
 
+@app.post("/api/auth/token")
+def login_for_access_token():
+    # AntiGravity: Added endpoint for client authentication token exchange
+    return {"access_token": "codex-secret-token", "token_type": "bearer"}
+
 @app.on_event("startup")
 def on_startup():
     initialize_database()`,

  "/tests/test_database.py": `@@ -0,0 +1,15 @@
+import pytest
+import sqlite3
+from backend.app.database import initialize_database
+
+def test_initialize_database():
+    # Blackbox: Ensure SQLite database file is created and table initialized
+    initialize_database()
+    conn = sqlite3.connect("ai_team.db")
+    cursor = conn.cursor()
+    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks';")
+    table = cursor.fetchone()
+    assert table is not None
+    assert table[0] == 'tasks'`,

  "/backend/app/database.py": `@@ -5,11 +5,18 @@
 DATABASE_PATH = os.environ.get("DATABASE_PATH", "ai_team.db")
 
 def get_db():
     conn = sqlite3.connect(DATABASE_PATH)
     conn.row_factory = sqlite3.Row
     try:
         yield conn
+    except sqlite3.OperationalError as e:
+        # Blackbox: Handle database locked exceptions gracefully
+        print(f"Database access failed: {e}")
+        raise
     finally:
         conn.close()`,

  "/src/components/Dashboard.tsx": `@@ -10,12 +10,22 @@
 export const Dashboard: React.FC = () => {
   const { agents, tasks } = useAgentState();
   
   return (
     <div className="dashboard-grid">
-      <div className="summary-card">
-        <h3>Active Tasks</h3>
-        <p className="highlight">{tasks.filter(t => t.status === 'active').length}</p>
-      </div>
+      <div className="summary-card interactive-hover">
+        <div className="summary-card-icon tasks-icon" />
+        <div className="summary-card-info">
+          <h3>Active Tasks</h3>
+          <p className="highlight">{tasks.filter(t => t.status === 'active').length}</p>
+        </div>
+      </div>
+      <div className="summary-card interactive-hover">
+        <div className="summary-card-icon agents-icon" />
+        <div className="summary-card-info">
+          <h3>Agents Online</h3>
+          <p className="highlight green">{agents.filter(a => a.status === 'online').length}</p>
+        </div>
+      </div>
     </div>
   );
 };`,

  "/src/App.tsx": `@@ -4,8 +4,8 @@
 import { Sidebar } from './components/Sidebar';
 import { Dashboard } from './components/Dashboard';
 
 function App() {
   return (
-    <div className="app-container-raw">
-      <Sidebar />
-      <Dashboard />
+    <div className="app-container-theme dark-mode">
+      <Sidebar activePanel="dashboard" />
+      <main className="main-content-flow">
+        <Dashboard />
+      </main>
     </div>
   );
 }`,

  "/backend/requirements.txt": `@@ -1,4 +1,5 @@
 fastapi>=0.100.0
 uvicorn>=0.22.0
 sqlite3-binary>=0.1.0
 pydantic>=2.0.0
+python-jose[cryptography]>=4.0.0`,

  "/src/components/Navbar.tsx": `@@ -15,5 +15,9 @@
 export const Navbar = () => {
   return (
-    <nav className="navbar-padding">
-      <div className="logo-group">AI Team Manager</div>
+    <nav className="navbar-container-responsive">
+      <div className="logo-group-styled">
+        <span className="logo-icon-accent" />
+        <span className="logo-text">AI Team Manager</span>
+      </div>
     </nav>
   );
 };`
};

const getFileStatus = (path: string): "modified" | "added" | "deleted" => {
  if (path === "/tests/test_database.py") return "added";
  return "modified";
};

const getFileStats = (path: string) => {
  if (path === "/backend/app/auth.py") return { add: 5, del: 1 };
  if (path === "/backend/app/main.py") return { add: 15, del: 2 };
  if (path === "/tests/test_database.py") return { add: 15, del: 0 };
  if (path === "/backend/app/database.py") return { add: 8, del: 2 };
  if (path === "/src/components/Dashboard.tsx") return { add: 12, del: 4 };
  if (path === "/src/App.tsx") return { add: 6, del: 2 };
  if (path === "/backend/requirements.txt") return { add: 1, del: 0 };
  if (path === "/src/components/Navbar.tsx") return { add: 4, del: 2 };
  return { add: 2, del: 1 };
};

const getFileAgent = (path: string, taskAgent: string | null): string => {
  if (taskAgent) return taskAgent;
  if (path === "/tests/test_database.py") return "Blackbox";
  return "AntiGravity";
};

const ReviewActionForm: React.FC<{
  taskId: string;
  onSubmitReview: (taskId: string, status: "approved" | "changes_requested", feedback: string) => Promise<void>;
}> = ({ taskId, onSubmitReview }) => {
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAction = async (status: "approved" | "changes_requested") => {
    if (!feedback.trim()) {
      alert("Please enter review feedback comments first.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmitReview(taskId, status, feedback);
      setFeedback("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <input
        type="text"
        placeholder="Enter review feedback..."
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        disabled={isSubmitting}
        style={{
          padding: "6px 12px",
          borderRadius: "4px",
          border: "1px solid var(--accent-purple)",
          backgroundColor: "#0f0f15",
          color: "#ffffff",
          fontSize: "0.8rem",
          width: "220px"
        }}
      />
      <button
        type="button"
        className="btn"
        onClick={() => handleAction("approved")}
        disabled={isSubmitting}
        style={{ padding: "6px 12px", fontSize: "0.8rem", backgroundColor: "#22c55e", borderColor: "#16a34a", color: "#ffffff", cursor: "pointer", borderRadius: "4px" }}
      >
        Approve
      </button>
      <button
        type="button"
        className="btn"
        onClick={() => handleAction("changes_requested")}
        disabled={isSubmitting}
        style={{ padding: "6px 12px", fontSize: "0.8rem", backgroundColor: "#ef4444", borderColor: "#dc2626", color: "#ffffff", cursor: "pointer", borderRadius: "4px" }}
      >
        Request Revision
      </button>
    </div>
  );
};

interface BottomInspectorProps {
  activeTab: "changes" | "logs" | "reviews" | "terminal" | "details";
  onTabChange: (tab: "changes" | "logs" | "reviews" | "terminal" | "details") => void;
  selectedFile: FileNode | null;
  selectedTask: Task | null;
  selectedAgent: Agent | null;
  tasks: Task[];
  generalLogs: string[];
  terminalOutput: string[];
  onOpenFileByPath?: (path: string) => void;
  onClearTaskSelection?: () => void;
  onSubmitReview?: (taskId: string, status: "approved" | "changes_requested", feedback: string) => Promise<void>;
  onSubmitTaskStatus?: (taskId: string, status: string) => Promise<void>;
  inspectorHeight: number;
  onResize: (height: number) => void;
  onResizeStart?: () => void;
  onResizeEnd?: () => void;
}

export const BottomInspector: React.FC<BottomInspectorProps> = ({
  activeTab,
  onTabChange,
  selectedFile,
  selectedTask,
  selectedAgent,
  tasks,
  generalLogs,
  terminalOutput,
  onOpenFileByPath,
  onClearTaskSelection,
  onSubmitReview,
  onSubmitTaskStatus,
  inspectorHeight,
  onResize,
  onResizeStart,
  onResizeEnd
}) => {
  const [selectedChangePath, setSelectedChangePath] = useState<string>("/backend/app/auth.py");

  useEffect(() => {
    if (selectedTask && selectedTask.relatedFiles.length > 0) {
      if (!selectedTask.relatedFiles.includes(selectedChangePath)) {
        setSelectedChangePath(selectedTask.relatedFiles[0]);
      }
    } else if (!selectedTask) {
      const defaultWorkspaceFiles = [
        "/backend/app/auth.py",
        "/backend/app/main.py",
        "/tests/test_database.py"
      ];
      if (!defaultWorkspaceFiles.includes(selectedChangePath)) {
        setSelectedChangePath("/backend/app/auth.py");
      }
    }
  }, [selectedTask]);

  const renderDiff = (diffText: string | undefined) => {
    if (!diffText) {
      return (
        <div className="diff-empty-state">
          No diff content available for this file.
        </div>
      );
    }
    const lines = diffText.split("\n");
    let oldLineNum = 0;
    let newLineNum = 0;

    return (
      <div className="diff-lines-container font-mono">
        {lines.map((line, idx) => {
          let lineClass = "diff-line-context";
          let sign = " ";
          let displayLine = line;

          if (line.startsWith("+")) {
            lineClass = "diff-line-addition";
            sign = "+";
            displayLine = line.substring(1);
            newLineNum++;
          } else if (line.startsWith("-")) {
            lineClass = "diff-line-deletion";
            sign = "-";
            displayLine = line.substring(1);
            oldLineNum++;
          } else if (line.startsWith("@@")) {
            lineClass = "diff-line-hunk";
            sign = " ";
            const match = line.match(/^@@ -(\d+),?\d* \+(\d+),?\d* @@/);
            if (match) {
              oldLineNum = parseInt(match[1]) - 1;
              newLineNum = parseInt(match[2]) - 1;
            }
          } else {
            oldLineNum++;
            newLineNum++;
          }

          const showOldLine = !line.startsWith("+") && !line.startsWith("@@");
          const showNewLine = !line.startsWith("-") && !line.startsWith("@@");

          return (
            <div key={idx} className={`diff-line-row ${lineClass}`}>
              <div className="diff-gutter diff-gutter-old">
                {showOldLine ? oldLineNum : ""}
              </div>
              <div className="diff-gutter diff-gutter-new">
                {showNewLine ? newLineNum : ""}
              </div>
              <div className="diff-sign">{sign}</div>
              <div className="diff-code-text">{displayLine || " "}</div>
            </div>
          );
        })}
      </div>
    );
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onResizeStart) onResizeStart();

    const startY = e.clientY;
    const startHeight = inspectorHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(120, Math.min(650, startHeight - deltaY));
      onResize(newHeight);
    };

    const handleMouseUp = () => {
      if (onResizeEnd) onResizeEnd();
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <footer className="bottom-inspector" aria-label="Inspector Panel">
      <div
        className="inspector-resize-handle"
        onMouseDown={handleMouseDown}
        onDoubleClick={() => onResize(220)}
        title="Drag to resize panel (Double click to reset)"
      />
      {/* Tabs */}
      <div className="inspector-tabs" role="tablist">
        <button
          className={`inspector-tab-btn ${activeTab === "changes" ? "active" : ""}`}
          onClick={() => onTabChange("changes")}
          role="tab"
          aria-selected={activeTab === "changes"}
        >
          Changes
        </button>
        <button
          className={`inspector-tab-btn ${activeTab === "logs" ? "active" : ""}`}
          onClick={() => onTabChange("logs")}
          role="tab"
          aria-selected={activeTab === "logs"}
        >
          Logs {selectedAgent ? `(${selectedAgent.name})` : ""}
        </button>
        <button
          className={`inspector-tab-btn ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => onTabChange("reviews")}
          role="tab"
          aria-selected={activeTab === "reviews"}
        >
          Reviews {selectedTask && selectedTask.reviewHistory ? `(${selectedTask.id})` : ""}
        </button>
        <button
          className={`inspector-tab-btn ${activeTab === "terminal" ? "active" : ""}`}
          onClick={() => onTabChange("terminal")}
          role="tab"
          aria-selected={activeTab === "terminal"}
        >
          Terminal
        </button>
        {selectedTask && (
          <button
            className={`inspector-tab-btn ${activeTab === "details" ? "active" : ""}`}
            onClick={() => onTabChange("details")}
            role="tab"
            aria-selected={activeTab === "details"}
          >
            Task Info ({selectedTask.id})
          </button>
        )}
        {selectedAgent && (
          <button
            className={`inspector-tab-btn ${activeTab === "details" ? "active" : ""}`}
            onClick={() => onTabChange("details")}
            role="tab"
            aria-selected={activeTab === "details"}
          >
            Agent Info ({selectedAgent.name})
          </button>
        )}
      </div>

      {/* Content pane */}
      <div className="inspector-content">
        {/* Changes Tab */}
        {activeTab === "changes" && (
          <div className="inspector-panel-view changes-view">
            <div className="changes-inspector-layout">
              {/* Left Panel: Files & Context list */}
              <div className="changes-sidebar">
                {selectedTask && (
                  <div className="task-mini-summary-card">
                    <div className="task-summary-header">
                      <span className="task-summary-id">{selectedTask.id}</span>
                      <span className={`task-badge status-${selectedTask.status} mini`}>
                        {selectedTask.status.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="task-summary-title" title={selectedTask.title}>
                      {selectedTask.title}
                    </h4>
                    <div className="task-summary-meta">
                      <span>@{selectedTask.agentName}</span>
                      <span>·</span>
                      <span>{selectedTask.progress}% progress</span>
                    </div>
                    <button
                      className="btn-clear-task-focus"
                      onClick={onClearTaskSelection}
                      title="View all files changed on this branch"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                      All Workspace Changes
                    </button>
                  </div>
                )}

                <div className="changes-files-list-header">
                  <span>Files Changed</span>
                  <span className="changes-files-count">
                    {selectedTask ? selectedTask.relatedFiles.length : 3}
                  </span>
                </div>

                <div className="changes-files-list">
                  {(selectedTask ? selectedTask.relatedFiles : [
                    "/backend/app/auth.py",
                    "/backend/app/main.py",
                    "/tests/test_database.py"
                  ]).map((path) => {
                    const status = getFileStatus(path);
                    const stats = getFileStats(path);
                    const agent = getFileAgent(path, selectedTask ? selectedTask.agentName : null);
                    const isActive = selectedChangePath === path;
                    const fileName = path.split("/").pop() || "";

                    return (
                      <div
                        key={path}
                        className={`changes-file-row ${isActive ? "active" : ""}`}
                        onClick={() => setSelectedChangePath(path)}
                      >
                        <span className={`file-status-dot ${status}`} title={status.toUpperCase()} />
                        <div className="file-info-group">
                          <span className="file-name" title={path}>{fileName}</span>
                          <span className="file-path" title={path}>{path.substring(0, path.lastIndexOf("/"))}</span>
                        </div>
                        <div className="file-meta-group">
                          <div className="diff-stats-wrapper">
                            <span className="diff-text-add">+{stats.add}</span>
                            <span className="diff-text-del">-{stats.del}</span>
                          </div>
                          <span className={`change-author-badge mini ${agent.toLowerCase()}`}>
                            @{agent}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Panel: Diff Viewer */}
              <div className="changes-diff-pane">
                {selectedChangePath ? (
                  <div className="diff-viewer-container">
                    <div className="diff-viewer-header">
                      <div className="diff-viewer-title-group">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7f5af0" strokeWidth="2" className="file-icon">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
                          <path d="M14 3v5h5" />
                        </svg>
                        <span className="diff-viewer-filename">{selectedChangePath}</span>
                      </div>
                      <div className="diff-viewer-actions">
                        <span className="diff-author-label">
                          Authored by: <strong className="agent-highlight">@{getFileAgent(selectedChangePath, selectedTask ? selectedTask.agentName : null)}</strong>
                        </span>
                        <button
                          className="btn-open-workspace"
                          onClick={() => onOpenFileByPath && onOpenFileByPath(selectedChangePath)}
                          title="Open full file in main editor"
                        >
                          Open in Editor
                        </button>
                      </div>
                    </div>
                    <div className="diff-viewer-content scrollable-diff">
                      {renderDiff(MOCK_DIFFS[selectedChangePath])}
                    </div>
                  </div>
                ) : (
                  <div className="diff-placeholder">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" className="placeholder-icon">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="8" y1="13" x2="16" y2="13" />
                      <line x1="8" y1="17" x2="16" y2="17" />
                      <line x1="10" y1="9" x2="9" y2="9" />
                    </svg>
                    <p>Select a file from the sidebar to view code diffs</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* Logs Tab */}
        {activeTab === "logs" && (
          <div className="inspector-panel-view logs-view scrollable-console">
            {selectedAgent ? (
              <div className="agent-logs-container">
                <div className="inspector-header-row">
                  <h4>Agent Run Logs: {selectedAgent.name}</h4>
                  <span className="log-role-tag">{selectedAgent.role}</span>
                </div>
                <div className="console-lines font-mono">
                  {selectedAgent.logs.map((log, idx) => (
                    <div key={idx} className="console-line">
                      <span className="line-timestamp">[{new Date().toLocaleDateString()} 14:00:{idx}]</span> {log}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="general-logs-container">
                <h4>System Logs (AI Team Orchestrator)</h4>
                <div className="console-lines font-mono">
                  {generalLogs.map((log, idx) => (
                    <div key={idx} className="console-line">{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === "reviews" && (
          <div className="inspector-panel-view reviews-view">
            {selectedTask && selectedTask.reviewHistory && selectedTask.reviewHistory.length > 0 ? (
              <div className="review-history-container">
                <h4>Review History: {selectedTask.id}</h4>
                {selectedTask.reviewHistory.map((rev, idx) => (
                  <div key={idx} className={`review-history-card ${rev.status}`}>
                    <div className="review-history-header">
                      <span className={`review-status-text ${rev.status}`}>
                        {rev.status === "approved" ? "APPROVED" : "REVISION REQUIRED"}
                      </span>
                      <span className="review-history-meta">by {rev.reviewer} · {rev.timestamp}</span>
                    </div>
                    <div className="review-history-feedback">
                      &ldquo;{rev.feedback}&rdquo;
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="all-reviews-view">
                <h4>Codex Review Submissions</h4>
                <div className="reviews-list">
                  {tasks.filter(t => t.reviewHistory && t.reviewHistory.length > 0).map(t => (
                    <div key={t.id} className="review-summary-row" onClick={() => onTabChange("changes")}>
                      <span className="review-row-id">{t.id}</span>
                      <span className="review-row-title">{t.title}</span>
                      <span className="review-row-agent">@{t.agentName}</span>
                      <span className={`review-row-status ${t.reviewHistory?.[0].status}`}>
                        {t.reviewHistory?.[0].status === "approved" ? "Approved" : "Revision"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Terminal Tab */}
        {activeTab === "terminal" && (
          <div className="inspector-panel-view terminal-view scrollable-console font-mono">
            <div className="console-lines">
              {terminalOutput.map((line, idx) => (
                <div key={idx} className="terminal-line">{line}</div>
              ))}
              <div className="terminal-prompt-line">
                <span className="terminal-prompt">powershell (ui-branch) C:\projects\ai-team-manager&gt;</span>
                <span className="terminal-cursor" />
              </div>
            </div>
          </div>
        )}

        {/* Details Tab */}
        {activeTab === "details" && (
          <div className="inspector-panel-view details-view scrollable-console">
            {selectedTask && (
              <div className="task-details-view" style={{ padding: "8px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span className="task-details-id" style={{ fontSize: "1.1rem", fontWeight: "bold", color: "var(--accent-orange)" }}>{selectedTask.id}</span>
                      <span className={`task-badge status-${selectedTask.status}`} style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                        {selectedTask.status.toUpperCase()}
                      </span>
                      <span className={`badge-priority ${selectedTask.priority}`} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                        {selectedTask.priority.toUpperCase()}
                      </span>
                    </div>
                    <h3 style={{ margin: "4px 0", color: "#ffffff" }}>{selectedTask.title}</h3>
                  </div>

                  <div className="task-details-actions" style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                    {/* Render action buttons based on task status */}
                    {selectedTask.status === "active" && onSubmitTaskStatus && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => onSubmitTaskStatus(selectedTask.id, "review")}
                        style={{ padding: "6px 12px", fontSize: "0.8rem", backgroundColor: "var(--accent-orange)", border: "1px solid var(--accent-orange)", color: "#ffffff", borderRadius: "4px", cursor: "pointer" }}
                      >
                        Submit for Review
                      </button>
                    )}
                    
                    {selectedTask.status === "review" && onSubmitReview && (
                      <ReviewActionForm taskId={selectedTask.id} onSubmitReview={onSubmitReview} />
                    )}
                  </div>
                </div>

                <div className="details-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                  <div>
                    <div className="detail-section" style={{ marginBottom: "12px" }}>
                      <h4 style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "4px" }}>Description</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0, lineHeight: 1.4 }}>{selectedTask.description || "No description provided."}</p>
                    </div>

                    <div className="detail-section" style={{ marginBottom: "12px" }}>
                      <h4 style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "4px" }}>Expected Output</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0, lineHeight: 1.4 }}>{selectedTask.expectedOutput || "No expected output defined."}</p>
                    </div>
                  </div>

                  <div>
                    <div className="detail-section" style={{ marginBottom: "12px" }}>
                      <h4 style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "4px" }}>Assigned Agent</h4>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div className="mini-avatar" style={{ width: "24px", height: "24px", fontSize: "0.75rem" }}>
                          {selectedTask.agentName.substring(0, 2).toUpperCase()}
                        </div>
                        <span style={{ color: "#ffffff", fontSize: "0.85rem" }}>@{selectedTask.agentName}</span>
                      </div>
                    </div>

                    <div className="detail-section" style={{ marginBottom: "12px" }}>
                      <h4 style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "4px" }}>Progress</h4>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div className="mini-progress-bar" style={{ flex: 1, height: "6px", backgroundColor: "#1e1e2f" }}>
                          <div className="progress-fill" style={{ width: `${selectedTask.progress}%`, height: "100%", backgroundColor: "var(--accent-orange)" }} />
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{selectedTask.progress}%</span>
                      </div>
                    </div>

                    <div className="detail-section" style={{ marginBottom: "12px" }}>
                      <h4 style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "4px" }}>Related Files</h4>
                      {selectedTask.relatedFiles.length === 0 ? (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>No files linked to this task.</p>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          {selectedTask.relatedFiles.map((file) => (
                            <button
                              key={file}
                              type="button"
                              onClick={() => onOpenFileByPath && onOpenFileByPath(file)}
                              style={{
                                background: "none",
                                border: "none",
                                padding: 0,
                                color: "var(--accent-purple)",
                                fontSize: "0.8rem",
                                textAlign: "left",
                                cursor: "pointer",
                                textDecoration: "underline",
                                width: "fit-content"
                              }}
                            >
                              {file}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedAgent && (
              <div className="agent-details-view" style={{ padding: "8px 16px" }}>
                <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "16px" }}>
                  <div className={`agent-avatar ${selectedAgent.name.toLowerCase()}`} style={{ width: "40px", height: "40px", fontSize: "1.2rem" }}>
                    {selectedAgent.avatar}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h3 style={{ margin: 0, color: "#ffffff" }}>{selectedAgent.name}</h3>
                      <span className={`status-dot ${selectedAgent.isEnabled !== false ? (selectedAgent.status === "online" ? "green" : selectedAgent.status === "working" ? "orange" : selectedAgent.status === "blocked" ? "yellow" : "gray") : "gray"}`} />
                      <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>({selectedAgent.isEnabled !== false ? selectedAgent.status : "disabled"})</span>
                    </div>
                    <span style={{ color: "var(--accent-purple)", fontSize: "0.85rem", fontWeight: 500 }}>{selectedAgent.role}</span>
                  </div>
                </div>

                <div className="details-grid" style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "20px" }}>
                  <div>
                    <div className="detail-section" style={{ marginBottom: "12px" }}>
                      <h4 style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "4px" }}>Description</h4>
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", margin: 0, lineHeight: 1.4 }}>{selectedAgent.description || "No description available for this agent adapter registry profile."}</p>
                    </div>

                    <div className="detail-section" style={{ marginBottom: "12px" }}>
                      <h4 style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "6px" }}>Capabilities & Specialized Skills</h4>
                      {selectedAgent.capabilities && selectedAgent.capabilities.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                          {selectedAgent.capabilities.map((cap) => (
                            <span
                              key={cap}
                              className="agent-card-cap-badge"
                              style={{
                                fontSize: "0.7rem",
                                padding: "4px 8px",
                                backgroundColor: "#161622",
                                border: "1px solid #2e2a47",
                                borderRadius: "4px",
                                color: "var(--text-secondary)"
                              }}
                            >
                              {cap}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", margin: 0 }}>No specific capabilities registered.</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="detail-section" style={{ marginBottom: "10px" }}>
                      <h4 style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "2px" }}>Intelligence Rating</h4>
                      <span style={{ color: "#ffffff", fontSize: "0.85rem", fontWeight: 600 }}>{selectedAgent.intelligenceLevel || "High"}</span>
                    </div>

                    <div className="detail-section" style={{ marginBottom: "10px" }}>
                      <h4 style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "2px" }}>Adapter Binding Type</h4>
                      <span style={{ color: "#ffffff", fontSize: "0.85rem" }}>{selectedAgent.adapterType || "Mock"}</span>
                    </div>

                    <div className="detail-section" style={{ marginBottom: "10px" }}>
                      <h4 style={{ color: "var(--text-muted)", fontSize: "0.8rem", textTransform: "uppercase", marginBottom: "2px" }}>Launch Subprocess Command</h4>
                      <code style={{ display: "block", padding: "4px 8px", backgroundColor: "#0f0f15", borderRadius: "4px", fontSize: "0.75rem", color: "var(--text-secondary)", border: "1px solid #1e1e2f" }}>
                        {selectedAgent.launchCommand || "N/A (Built-in)"}
                      </code>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </footer>
  );
};
