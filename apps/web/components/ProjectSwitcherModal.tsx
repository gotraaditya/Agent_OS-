import React, { useState, useEffect } from "react";
import { Project } from "../types";

interface ProjectSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string) => void;
  onAddProject: (name: string, path: string, branch: string) => void;
  onArchiveProject: (id: string) => void;
  onRemoveProject: (id: string) => void;
  defaultShowAddForm?: boolean;
}

export const ProjectSwitcherModal: React.FC<ProjectSwitcherModalProps> = ({
  isOpen,
  onClose,
  projects,
  activeProjectId,
  onSelectProject,
  onAddProject,
  onArchiveProject,
  onRemoveProject,
  defaultShowAddForm = false
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(defaultShowAddForm);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectPath, setNewProjectPath] = useState("");
  const [newProjectBranch, setNewProjectBranch] = useState("main");

  useEffect(() => {
    if (isOpen) {
      setShowAddForm(defaultShowAddForm);
    }
  }, [isOpen, defaultShowAddForm]);

  if (!isOpen) return null;

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.localPath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !newProjectPath.trim()) return;

    onAddProject(
      newProjectName.trim(),
      newProjectPath.trim(),
      newProjectBranch.trim()
    );

    // Reset form
    setNewProjectName("");
    setNewProjectPath("");
    setNewProjectBranch("main");
    setShowAddForm(false);
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-container project-switcher-modal">
        <div className="modal-header">
          <h3>{showAddForm ? "Create New Project" : "Workspace Projects"}</h3>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close dialog">
            &times;
          </button>
        </div>

        <div className="modal-body">
          {showAddForm ? (
            <form onSubmit={handleSubmit} className="project-create-form">
              <div className="form-group">
                <label htmlFor="proj-name">Project Name</label>
                <input
                  id="proj-name"
                  type="text"
                  className="modal-input"
                  placeholder="e.g., TownSim, VectorSearch"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="proj-path">Local Directory Path</label>
                <input
                  id="proj-path"
                  type="text"
                  className="modal-input font-mono"
                  placeholder="e.g., C:\projects\townsim"
                  value={newProjectPath}
                  onChange={(e) => setNewProjectPath(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="proj-branch">Default Git Branch</label>
                <input
                  id="proj-branch"
                  type="text"
                  className="modal-input font-mono"
                  placeholder="e.g., main, master, dev"
                  value={newProjectBranch}
                  onChange={(e) => setNewProjectBranch(e.target.value)}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setShowAddForm(false)}
                >
                  Back to Projects
                </button>
                <button type="submit" className="btn-modal-submit">
                  Create Project
                </button>
              </div>
            </form>
          ) : (
            <div className="project-switcher-explorer">
              <div className="explorer-controls">
                <div className="modal-search-container">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.3-4.3" />
                  </svg>
                  <input
                    type="text"
                    className="modal-search-input"
                    placeholder="Search projects by name or path..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <button
                  className="btn-create-project-trigger"
                  onClick={() => setShowAddForm(true)}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  Create Project
                </button>
              </div>

              <div className="project-cards-list">
                {filteredProjects.length > 0 ? (
                  filteredProjects.map((p) => {
                    const isActive = p.id === activeProjectId;
                    return (
                      <div
                        key={p.id}
                        className={`project-card ${isActive ? "active" : ""}`}
                      >
                        <div className="project-card-header">
                          <div className="project-title-group">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="folder-icon">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                            <h4 className="project-card-name">{p.name}</h4>
                            {isActive && <span className="active-badge">Active</span>}
                          </div>
                          <span className={`project-status-label status-${p.status}`}>
                            {p.status.toUpperCase()}
                          </span>
                        </div>

                        <span className="project-card-path font-mono" title={p.localPath}>
                          {p.localPath}
                        </span>

                        <div className="project-card-stats">
                          <div className="stat-pill">
                            <span className="stat-label">Agents:</span>
                            <span className="stat-val">{p.agentCount}</span>
                          </div>
                          <div className="stat-pill">
                            <span className="stat-label">Tasks:</span>
                            <span className="stat-val">{p.taskCount}</span>
                          </div>
                          <span className="last-opened-label">Last opened: {p.lastOpened}</span>
                        </div>

                        <div className="project-card-actions">
                          <button
                            className="btn-project-open"
                            onClick={() => {
                              onSelectProject(p.id);
                              onClose();
                            }}
                          >
                            {isActive ? "Reload Workspace" : "Open Workspace"}
                          </button>
                          {!isActive && (
                            <>
                              <button
                                className="btn-project-archive"
                                onClick={() => onArchiveProject(p.id)}
                                title="Archive project"
                              >
                                Archive
                              </button>
                              <button
                                className="btn-project-remove"
                                onClick={() => onRemoveProject(p.id)}
                                title="Remove project from workspaces"
                              >
                                Remove
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-projects-filtered">
                    <p>No projects match "{searchQuery}"</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
