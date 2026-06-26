import React from "react";
import { Agent } from "../types";

interface AgentStatusPanelProps {
  agents: Agent[];
  selectedAgentName: string | null;
  onSelectAgent: (agent: Agent) => void;
}

export const AgentStatusPanel: React.FC<AgentStatusPanelProps> = ({
  agents,
  selectedAgentName,
  onSelectAgent
}) => {
  const getStatusDotClass = (status: string) => {
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
      <div className="panel-header">
        <h3 className="panel-title">Agents</h3>
        <span className="panel-subtitle">{agents.length} Registered</span>
      </div>

      <div className="agents-list">
        {agents.map((agent) => {
          const isSelected = selectedAgentName === agent.name;
          const statusClass = getStatusDotClass(agent.status);
          
          return (
            <div
              key={agent.name}
              className={`agent-card ${isSelected ? "selected" : ""}`}
              onClick={() => onSelectAgent(agent)}
              role="button"
              tabIndex={0}
            >
              {/* Card Main Info */}
              <div className="agent-card-header">
                <div className="agent-avatar-group">
                  <div className={`agent-avatar ${agent.name.toLowerCase()}`}>
                    {agent.avatar}
                  </div>
                  <span className={statusClass} />
                </div>
                <div className="agent-info">
                  <h4 className="agent-name">{agent.name}</h4>
                  <span className="agent-role">{agent.role}</span>
                </div>
                <span className="agent-last-active">{agent.lastActive}</span>
              </div>

              {/* Card Detail/Task Info */}
              <div className="agent-card-body">
                <div className="agent-current-task">
                  <span className="task-label">Active:</span>
                  <span className="task-value" title={agent.currentTask}>
                    {agent.currentTask}
                  </span>
                </div>

                {agent.status === "working" && (
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
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
