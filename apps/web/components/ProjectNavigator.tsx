import React, { useState } from "react";
import { FileNode, Task } from "../types";
import { FileTree } from "./FileTree";
import { TaskList } from "./TaskList";
import { mockKnowledge } from "./mockData";

interface ProjectNavigatorProps {
  activeTab: "files" | "tasks" | "knowledge";
  onTabChange: (tab: "files" | "tasks" | "knowledge") => void;
  files: FileNode;
  selectedFilePath: string | null;
  onSelectFile: (file: FileNode) => void;
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (task: Task) => void;
  selectedKnowledgeName: string | null;
  onSelectKnowledge: (name: string, content: string) => void;
}

export const ProjectNavigator: React.FC<ProjectNavigatorProps> = ({
  activeTab,
  onTabChange,
  files,
  selectedFilePath,
  onSelectFile,
  tasks,
  selectedTaskId,
  onSelectTask,
  selectedKnowledgeName,
  onSelectKnowledge
}) => {
  const [filterQuery, setFilterQuery] = useState("");

  const knowledgeFiles = Object.keys(mockKnowledge);

  return (
    <aside className="project-navigator" aria-label="Project Navigator">
      {/* Tabs list */}
      <div className="navigator-tabs" role="tablist">
        <button
          className={`tab-btn ${activeTab === "files" ? "active" : ""}`}
          onClick={() => onTabChange("files")}
          role="tab"
          aria-selected={activeTab === "files"}
        >
          Files
        </button>
        <button
          className={`tab-btn ${activeTab === "tasks" ? "active" : ""}`}
          onClick={() => onTabChange("tasks")}
          role="tab"
          aria-selected={activeTab === "tasks"}
        >
          Tasks
        </button>
        <button
          className={`tab-btn ${activeTab === "knowledge" ? "active" : ""}`}
          onClick={() => onTabChange("knowledge")}
          role="tab"
          aria-selected={activeTab === "knowledge"}
        >
          Knowledge
        </button>
      </div>

      {/* Filter search bar inside navigator */}
      <div className="navigator-filter">
        <input
          type="text"
          className="filter-input"
          placeholder={`Filter ${activeTab}...`}
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value)}
        />
        {filterQuery && (
          <button className="clear-filter-btn" onClick={() => setFilterQuery("")}>
            &times;
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="navigator-content">
        {activeTab === "files" && (
          <FileTree
            node={files}
            selectedFilePath={selectedFilePath}
            onSelectFile={onSelectFile}
          />
        )}

        {activeTab === "tasks" && (
          <TaskList
            tasks={tasks.filter((t) =>
              t.title.toLowerCase().includes(filterQuery.toLowerCase()) ||
              t.id.toLowerCase().includes(filterQuery.toLowerCase())
            )}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
          />
        )}

        {activeTab === "knowledge" && (
          <div className="knowledge-list">
            {knowledgeFiles
              .filter((name) => name.toLowerCase().includes(filterQuery.toLowerCase()))
              .map((name) => {
                const isSelected = selectedKnowledgeName === name;
                return (
                  <div
                    key={name}
                    className={`knowledge-item ${isSelected ? "selected" : ""}`}
                    onClick={() => onSelectKnowledge(name, mockKnowledge[name])}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="knowledge-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7f5af0" strokeWidth="2">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5v-15z" />
                      </svg>
                    </span>
                    <span className="knowledge-name">{name}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </aside>
  );
};
