import React from "react";
import { Agent } from "../types";

interface AgentStatusPanelProps {
  agents: Agent[];
  selectedAgentName: string | null;
  onSelectAgent: (agent: Agent) => void;
  onOpenAddAgent: () => void;
  onOpenEditAgent: (agent: Agent) => void;
}

export const AgentStatusPanel: React.FC<AgentStatusPanelProps> = ({
  agents,
  selectedAgentName,
  onSelectAgent,
  onOpenAddAgent,
  onOpenEditAgent
}) => {
  const getStatusDotClass = (status: string, isEnabled?: boolean) => {
    if (isEnabled === false) {
      return "status-dot gray";
    }
    switch (status) {
      case "online":
        return "status-dot green pulse";
      case "working":
        return "status-dot orange pulse";
      case "blocked":
        return "status-dot yellow";
      case "error":
        return "status-dot red pulse";
      default:
        return "status-dot gray";
    }
  };

  return (
    <aside className="agent-status-panel" aria-label="Agent Statuses">
      <div className="panel-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h3 className="panel-title">Agents</h3>
          <span className="panel-subtitle">{agents.length} Registered</span>
        </div>
        <button
          className="btn-add-agent"
          onClick={onOpenAddAgent}
          title="Register New Agent"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            backgroundColor: "var(--accent-purple-dim)",
            border: "1px solid var(--accent-purple)",
            borderRadius: "4px",
            color: "#ffffff",
            fontSize: "0.75rem",
            fontWeight: 500,
            cursor: "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="btn-icon">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Agent
        </button>
      </div>

      <div className="agents-list">
        {agents.map((agent) => {
          const isSelected = selectedAgentName === agent.name;
          const isEnabled = agent.isEnabled !== false;
          const statusClass = getStatusDotClass(agent.status, isEnabled);
          
          return (
            <div
              key={agent.name}
              className={`agent-card ${isSelected ? "selected" : ""} ${!isEnabled ? "disabled-agent-card" : ""}`}
              onClick={() => {
                onSelectAgent(agent);
                onOpenEditAgent(agent);
              }}
              role="button"
              tabIndex={0}
            >
              {/* Card Main Info */}
              <div className="agent-card-header">
                <div className="agent-avatar-group">
                  <div className={`agent-avatar ${agent.name.toLowerCase()} ${!isEnabled ? "avatar-disabled" : ""}`}>
                    {agent.avatar}
                  </div>
                  <span className={statusClass} />
                </div>
                <div className="agent-info">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <h4 className="agent-name">{agent.name}</h4>
                    {!isEnabled && <span className="disabled-tag">Disabled</span>}
                  </div>
                  <span className="agent-role">{agent.role}</span>
                </div>
                <div className="agent-card-meta">
                  <span className="agent-last-active">{agent.lastActive}</span>
                  <button
                    className="btn-agent-edit-inline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectAgent(agent);
                      onOpenEditAgent(agent);
                    }}
                    title="Configure Agent"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Card Detail/Task Info */}
              <div className="agent-card-body">
                <div className="agent-current-task">
                  <span className="task-label">Active:</span>
                  <span className="task-value" title={agent.currentTask}>
                    {agent.currentTask}
                  </span>
                </div>

                {isEnabled && agent.status === "working" && (
                  <div className="agent-progress-container">
                    <div className="agent-progress-header">
                      <span>Working progress</span>
                      <span>{agent.progress}%</span>
                    </div>
                    <div className="progress-bar-outer">
                      <div
                        className="progress-bar-inner orange"
                        style={{ width: `${agent.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Capability tags */}
                {agent.capabilities && agent.capabilities.length > 0 && (
                  <div className="agent-card-capabilities" style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "8px" }}>
                    {agent.capabilities.map((cap) => (
                      <span
                        key={cap}
                        className="agent-card-cap-badge"
                        style={{
                          fontSize: "0.65rem",
                          padding: "2px 6px",
                          backgroundColor: "#161622",
                          border: "1px solid #2e2a47",
                          borderRadius: "3px",
                          color: "var(--text-secondary)"
                        }}
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
