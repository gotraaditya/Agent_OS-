import React, { useState } from "react";
import { Agent } from "../types";
import { AgentRoleSelect, AdapterTypeSelect, CapabilityTagInput } from "./AgentSubComponents";

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAgent: (agent: Agent) => void;
}

export const AddAgentModal: React.FC<AddAgentModalProps> = ({
  isOpen,
  onClose,
  onAddAgent
}) => {
  const [name, setName] = useState("");
  const [role, setRole] = useState("Backend Expert");
  const [description, setDescription] = useState("");
  const [capabilities, setCapabilities] = useState<string[]>(["backend"]);
  const [intelligenceLevel, setIntelligenceLevel] = useState("High");
  const [adapterType, setAdapterType] = useState("Mock");
  const [launchCommand, setLaunchCommand] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Create avatar from initials
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

    const newAgent: Agent = {
      name: name.trim(),
      role,
      status: "idle",
      currentTask: "Idle - Standby",
      progress: 0,
      lastActive: "Just now",
      avatar: initials || "AG",
      logs: [`[SYSTEM] Agent adapter '${name.trim()}' added to registry.`],
      description: description.trim(),
      capabilities,
      intelligenceLevel,
      adapterType,
      launchCommand: launchCommand.trim(),
      isEnabled
    };

    onAddAgent(newAgent);
    
    // Reset state
    setName("");
    setRole("Backend Expert");
    setDescription("");
    setCapabilities(["backend"]);
    setIntelligenceLevel("High");
    setAdapterType("Mock");
    setLaunchCommand("");
    setIsEnabled(true);
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" role="dialog" aria-modal="true" style={{ maxWidth: "550px" }}>
        <div className="modal-header">
          <h2>Register New Agent</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group" style={{ flex: 2 }}>
              <label htmlFor="agent-name">Agent Name</label>
              <input
                id="agent-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CodeCop"
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <AgentRoleSelect value={role} onChange={setRole} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="agent-desc">Description</label>
            <textarea
              id="agent-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the agent's responsibilities or operational focus..."
              rows={2}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="agent-intelligence">Intelligence / Priority Level</label>
              <select
                id="agent-intelligence"
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
            <label htmlFor="agent-launch">Launch Command / Binary Path</label>
            <input
              id="agent-launch"
              type="text"
              value={launchCommand}
              onChange={(e) => setLaunchCommand(e.target.value)}
              placeholder="e.g. python -m agents.codecop --port 8010"
            />
          </div>

          <CapabilityTagInput value={capabilities} onChange={setCapabilities} />

          <div className="form-group toggle-group" style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px" }}>
            <label htmlFor="agent-enabled" className="toggle-label" style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
              <input
                id="agent-enabled"
                type="checkbox"
                checked={isEnabled}
                onChange={(e) => setIsEnabled(e.target.checked)}
                className="custom-toggle-checkbox"
              />
              <span className="toggle-text">Agent Enabled (Operational)</span>
            </label>
          </div>

          <div className="modal-actions" style={{ marginTop: "20px" }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Register Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
