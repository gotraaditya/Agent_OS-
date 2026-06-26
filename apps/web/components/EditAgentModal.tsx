import React, { useState, useEffect } from "react";
import { Agent } from "../types";
import { AgentRoleSelect, AdapterTypeSelect, CapabilityTagInput } from "./AgentSubComponents";

interface EditAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
  onUpdateAgent: (updatedAgent: Agent) => void;
  onDeleteAgent?: (name: string) => void;
}

export const EditAgentModal: React.FC<EditAgentModalProps> = ({
  isOpen,
  onClose,
  agent,
  onUpdateAgent,
  onDeleteAgent
}) => {
  const [role, setRole] = useState("");
  const [description, setDescription] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [intelligenceLevel, setIntelligenceLevel] = useState("High");
  const [adapterType, setAdapterType] = useState("Mock");
  const [launchCommand, setLaunchCommand] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (agent) {
      setRole(agent.role || "Backend Expert");
      setDescription(agent.description || "");
      setCapabilities(agent.capabilities || []);
      setIntelligenceLevel(agent.intelligenceLevel || "High");
      setAdapterType(agent.adapterType || "Mock");
      setLaunchCommand(agent.launchCommand || "");
      setIsEnabled(agent.isEnabled !== false); // default to true
    }
  }, [agent, isOpen]);

  if (!isOpen || !agent) return null;

  const isCodex = agent.name === "Codex";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedAgent: Agent = {
      ...agent,
      role: isCodex ? "Lead Engineer" : role,
      description: description.trim(),
      capabilities,
      intelligenceLevel,
      adapterType,
      launchCommand: launchCommand.trim(),
      isEnabled: isCodex ? true : isEnabled // Codex is always enabled
    };

    onUpdateAgent(updatedAgent);
    onClose();
  };

  const handleDelete = () => {
    if (isCodex) return;
    if (onDeleteAgent) {
      if (confirm(`Are you sure you want to unregister agent "${agent.name}"?`)) {
        onDeleteAgent(agent.name);
        onClose();
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" role="dialog" aria-modal="true" style={{ maxWidth: "550px" }}>
        <div className="modal-header">
          <h2>Configure Agent: {agent.name}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label>Agent Name</label>
              <input
                type="text"
                value={agent.name}
                disabled
                className="disabled-input"
                style={{ cursor: "not-allowed", backgroundColor: "#0f0f15", color: "var(--text-muted)" }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <AgentRoleSelect 
                value={isCodex ? "Lead Engineer" : role} 
                onChange={setRole} 
                disabled={isCodex} 
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="agent-desc-edit">Description</label>
            <textarea
              id="agent-desc-edit"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the agent's responsibilities or operational focus..."
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="agent-intelligence-edit">Intelligence / Priority Level</label>
              <select
                id="agent-intelligence-edit"
                className="form-select"
                value={intelligenceLevel}
                onChange={(e) => setIntelligenceLevel(e.target.value)}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <div>
              <AdapterTypeSelect value={adapterType} onChange={setAdapterType} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="agent-launch-edit">Launch Command / Binary Path</label>
            <input
              id="agent-launch-edit"
              type="text"
              value={launchCommand}
              onChange={(e) => setLaunchCommand(e.target.value)}
              placeholder="e.g. python -m agents.codecop --port 8010"
            />
          </div>

          <CapabilityTagInput value={capabilities} onChange={setCapabilities} />

          <div className="form-group toggle-group" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
            <label htmlFor="agent-enabled-edit" className="toggle-label" style={{ cursor: isCodex ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                id="agent-enabled-edit"
                type="checkbox"
                checked={isCodex ? true : isEnabled}
                onChange={(e) => !isCodex && setIsEnabled(e.target.checked)}
                disabled={isCodex}
                className="custom-toggle-checkbox"
              />
              <span className="toggle-text">Agent Enabled (Operational)</span>
            </label>
            {isCodex && (
              <span style={{ fontSize: "0.65rem", color: "var(--accent-purple)", fontStyle: "italic" }}>
                Codex must remain enabled as Lead Engineer.
              </span>
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: "20px", justifyContent: "space-between" }}>
            <div>
              {!isCodex && onDeleteAgent && (
                <button
                  type="button"
                  className="btn btn-secondary btn-delete"
                  style={{ color: "#ef4444", borderColor: "#7f1d1d" }}
                  onClick={handleDelete}
                >
                  Unregister Agent
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
