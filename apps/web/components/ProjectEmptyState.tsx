import React from "react";

interface ProjectEmptyStateProps {
  onOpenProjectSwitcher: () => void;
  onOpenCreateProject: () => void;
  onOpenFolder: () => void;
}

export const ProjectEmptyState: React.FC<ProjectEmptyStateProps> = ({
  onOpenProjectSwitcher,
  onOpenCreateProject,
  onOpenFolder
}) => {
  return (
    <div className="project-empty-state-container">
      <div className="empty-state-card">
        <div className="empty-state-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#7f5af0" strokeWidth="1.5">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            <line x1="12" y1="11" x2="12" y2="17" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
        </div>
        <h2>No Projects Loaded</h2>
        <p>
          You are currently disconnected from any active agent workspaces. Open a project folder from your computer or configure a new one to initialize your AI team coordinator.
        </p>
        <div className="empty-state-actions">
          <button className="btn-empty-primary" onClick={onOpenFolder}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            Open Folder
          </button>
          <button className="btn-empty-secondary" onClick={onOpenProjectSwitcher}>
            Recent Projects
          </button>
          <button className="btn-empty-secondary" onClick={onOpenCreateProject}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create New Project
          </button>
        </div>
      </div>
    </div>
  );
};
