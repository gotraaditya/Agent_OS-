import React, { useState, useEffect, useRef } from "react";

interface TopHeaderProps {
  projectName: string;
  currentBranch: string;
  onOpenNewTask: () => void;
  onFocusSearch: () => void;
  activeTasksCount: number;
  isInspectorOpen: boolean;
  onToggleInspector: () => void;
  projects: { id: string; name: string }[];
  onSelectProject: (id: string) => void;
  onOpenProjectSwitcher: () => void;
  onOpenCreateProject: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  projectName,
  currentBranch,
  onOpenNewTask,
  onFocusSearch,
  activeTasksCount,
  isInspectorOpen,
  onToggleInspector,
  projects,
  onSelectProject,
  onOpenProjectSwitcher,
  onOpenCreateProject
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const switcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const clickedOnSwitcher = switcherRef.current && switcherRef.current.contains(event.target as Node);
      const clickedOnDropdown = dropdownRef.current && dropdownRef.current.contains(event.target as Node);

      if (!clickedOnSwitcher && !clickedOnDropdown) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const handleSelect = (id: string) => {
    onSelectProject(id);
    setIsDropdownOpen(false);
  };

  const currentProject = projects.find(p => p.name === projectName);
  const recentProjects = projects.filter(p => p.name !== projectName).slice(0, 3);

  return (
    <header className="top-header" role="banner">
      <div className="header-left">
        {/* App Branding */}
        <div className="header-brand">
          <div className="app-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="logo-svg">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <div className="app-title-group">
            <span className="app-name">AI Team Manager</span>
            <span className="app-version">v1.0.0-prototype</span>
          </div>
        </div>

        <div className="divider-vertical-dim" />

        {/* Project details & status indicators */}
        <div className="header-project-info" style={{ position: "relative" }}>
          <div
            ref={switcherRef}
            className={`project-switcher clickable ${isDropdownOpen ? "active" : ""}`}
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            title="Click to switch project"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="project-icon">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span className="project-name">{projectName}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`chevron-icon ${isDropdownOpen ? "open" : ""}`}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>

          {isDropdownOpen && (
            <div className="project-dropdown-menu" ref={dropdownRef}>
              <div className="dropdown-section">
                <span className="dropdown-label">Current Project</span>
                <div className="dropdown-item current-project-item">
                  <span className="dot-indicator active" />
                  <span className="project-title">{projectName}</span>
                </div>
              </div>

              {recentProjects.length > 0 && (
                <div className="dropdown-section">
                  <span className="dropdown-label">Recent Projects</span>
                  {recentProjects.map(p => (
                    <div
                      key={p.id}
                      className="dropdown-item clickable"
                      onClick={() => handleSelect(p.id)}
                    >
                      <span className="dot-indicator idle" />
                      <span className="project-title">{p.name}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="dropdown-divider" />

              <div
                className="dropdown-item action clickable"
                onClick={() => {
                  onOpenProjectSwitcher();
                  setIsDropdownOpen(false);
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-action-icon">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Open Project...</span>
              </div>

              <div
                className="dropdown-item action clickable"
                onClick={() => {
                  onOpenCreateProject();
                  setIsDropdownOpen(false);
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-action-icon">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span>Create New Project...</span>
              </div>

              <div
                className="dropdown-item action clickable"
                onClick={() => {
                  onOpenProjectSwitcher();
                  setIsDropdownOpen(false);
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="dropdown-action-icon">
                  <path d="M12 20h9M3 20h9M3 12h18M3 4h18" />
                </svg>
                <span>Manage Projects...</span>
              </div>
            </div>
          )}

          <div className="branch-selector" title="Switch Git branch (mock)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="branch-icon">
              <line x1="6" y1="3" x2="6" y2="15" />
              <circle cx="18" cy="6" r="3" />
              <circle cx="6" cy="18" r="3" />
              <path d="M18 9a9 9 0 0 1-9 9" />
            </svg>
            <span className="branch-name">{currentBranch}</span>
          </div>

          <div className="project-status-badge">
            <span className="status-indicator-dot green" />
            <span className="status-text">{activeTasksCount} active task{activeTasksCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      <div className="header-right">
        {/* Search and core navigation tools */}
        <div className="header-actions">
          <div className="header-search-container">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="search-icon">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search workspace..."
              onClick={onFocusSearch}
            />
            <kbd className="search-kbd">Ctrl+K</kbd>
          </div>

          <button
            className={`btn-toggle-inspector ${isInspectorOpen ? "active" : ""}`}
            onClick={onToggleInspector}
            title="Toggle Bottom Inspector Panel"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
              <rect width="20" height="20" x="2" y="2" rx="2" />
              <path d="M2 14h20" />
            </svg>
            {isInspectorOpen ? "Hide Inspector" : "Show Inspector"}
          </button>

          <button className="btn-new-task" onClick={onOpenNewTask}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Task
          </button>
        </div>

        <div className="divider-vertical-dim" />

        {/* Profile area */}
        <div className="header-profile-section">
          <div className="user-profile">
            <div className="profile-avatar">AG</div>
            <div className="profile-details">
              <span className="profile-username">Aditya Gotra</span>
              <span className="profile-role">Lead Dev</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
