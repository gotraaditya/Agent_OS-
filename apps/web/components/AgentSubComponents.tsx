import React, { useState } from "react";

interface AgentRoleSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const ROLES = [
  "Lead Engineer",
  "Backend Expert",
  "Frontend Expert",
  "QA Engineer",
  "Utility Worker",
  "Junior Worker",
  "Documentation Agent",
  "Custom"
];

export const AgentRoleSelect: React.FC<AgentRoleSelectProps> = ({ value, onChange, disabled }) => {
  return (
    <div className="form-group">
      <label htmlFor="agent-role">Role</label>
      <select
        id="agent-role"
        className="form-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </div>
  );
};

interface AdapterTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export const ADAPTER_TYPES = ["Mock", "CLI", "API", "Manual"];

export const AdapterTypeSelect: React.FC<AdapterTypeSelectProps> = ({ value, onChange }) => {
  return (
    <div className="form-group">
      <label htmlFor="agent-adapter">Adapter Type</label>
      <select
        id="agent-adapter"
        className="form-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {ADAPTER_TYPES.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
    </div>
  );
};

interface CapabilityTagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
}

export const AVAILABLE_CAPABILITIES = [
  "architecture",
  "backend",
  "frontend",
  "testing",
  "debugging",
  "refactoring",
  "documentation",
  "boilerplate",
  "database",
  "devops"
];

export const CapabilityTagInput: React.FC<CapabilityTagInputProps> = ({ value, onChange }) => {
  const [customTag, setCustomTag] = useState("");

  const handleToggleCapability = (cap: string) => {
    if (value.includes(cap)) {
      onChange(value.filter((c) => c !== cap));
    } else {
      onChange([...value, cap]);
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && customTag.trim()) {
      e.preventDefault();
      const newTag = customTag.trim().toLowerCase();
      if (!value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setCustomTag("");
    }
  };

  return (
    <div className="form-group capability-tag-input">
      <label>Capabilities</label>
      <div className="capabilities-pool">
        {AVAILABLE_CAPABILITIES.map((cap) => {
          const isSelected = value.includes(cap);
          return (
            <button
              key={cap}
              type="button"
              className={`cap-badge-btn ${isSelected ? "active" : ""}`}
              onClick={() => handleToggleCapability(cap)}
            >
              {cap}
            </button>
          );
        })}
      </div>
      
      {/* Custom capability entry */}
      <div className="custom-cap-input-wrapper" style={{ marginTop: "8px" }}>
        <input
          type="text"
          className="form-input"
          placeholder="Add custom capability (Press Enter)..."
          value={customTag}
          onChange={(e) => setCustomTag(e.target.value)}
          onKeyDown={handleAddCustomTag}
        />
      </div>

      {/* Display selected custom capabilities */}
      {value.filter(v => !AVAILABLE_CAPABILITIES.includes(v)).length > 0 && (
        <div className="custom-caps-selected" style={{ marginTop: "8px" }}>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginRight: "8px" }}>Custom:</span>
          {value
            .filter((v) => !AVAILABLE_CAPABILITIES.includes(v))
            .map((v) => (
              <span key={v} className="custom-cap-badge">
                {v}
                <button
                  type="button"
                  className="remove-cap-btn"
                  onClick={() => onChange(value.filter((c) => c !== v))}
                >
                  &times;
                </button>
              </span>
            ))}
        </div>
      )}
    </div>
  );
};
