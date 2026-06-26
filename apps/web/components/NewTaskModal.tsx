import React, { useState } from "react";
import { Task, TaskPriority, TaskStatus } from "../types";

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTask: (task: Task) => void;
  agents: { name: string; role: string }[];
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({
  isOpen,
  onClose,
  onAddTask,
  agents
}) => {
  const [title, setTitle] = useState("");
  const [agentName, setAgentName] = useState(agents[0]?.name || "Codex");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [description, setDescription] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTask: Task = {
      id: `T-${Math.floor(Math.random() * 900) + 100}`,
      title,
      agentName,
      status: "active",
      priority,
      progress: 0,
      description,
      relatedFiles: [],
      expectedOutput
    };

    onAddTask(newTask);
    setTitle("");
    setDescription("");
    setExpectedOutput("");
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>Create New Task</h2>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="task-title">Task Title</label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement middleware routes"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="task-agent">Assign Agent</label>
              <select
                id="task-agent"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
              >
                {agents.map((agent) => (
                  <option key={agent.name} value={agent.name}>
                    {agent.name} ({agent.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of what needs to be implemented..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="task-output">Expected Output</label>
            <input
              id="task-output"
              type="text"
              value={expectedOutput}
              onChange={(e) => setExpectedOutput(e.target.value)}
              placeholder="e.g. Pytest returns 100% success on endpoints."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Assign Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
