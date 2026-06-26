import React, { useState } from "react";
import { FileNode } from "../types";

interface FileTreeProps {
  node: FileNode;
  selectedFilePath: string | null;
  onSelectFile: (file: FileNode) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  node,
  selectedFilePath,
  onSelectFile
}) => {
  const [isExpanded, setIsExpanded] = useState<Record<string, boolean>>({
    "/": true,
    "/backend": true,
    "/backend/app": true,
    "/src": true,
    "/src/components": true
  });

  const toggleExpand = (path: string) => {
    setIsExpanded((prev) => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  const renderNode = (n: FileNode, depth = 0) => {
    const isDir = n.isDir;
    const path = n.path;
    const expanded = isExpanded[path] || false;
    const isSelected = selectedFilePath === path;

    // Set indentation margin
    const indentStyle = { paddingLeft: `${depth * 12 + 6}px` };

    if (isDir) {
      return (
        <div key={path} className="file-tree-directory-group">
          <div
            className={`file-tree-item directory ${expanded ? "expanded" : ""}`}
            style={indentStyle}
            onClick={() => toggleExpand(path)}
            role="button"
            tabIndex={0}
            aria-expanded={expanded}
            title={path}
          >
            <span className="arrow-icon">
              {expanded ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6"/></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
              )}
            </span>
            <span className="node-icon folder-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </span>
            <span className="node-name">{n.name}</span>
          </div>

          {expanded && n.children && (
            <div className="file-tree-children">
              {n.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div
          key={path}
          className={`file-tree-item file ${isSelected ? "selected" : ""}`}
          style={indentStyle}
          onClick={() => onSelectFile(n)}
          role="button"
          tabIndex={0}
          title={path}
        >
          <span className="node-icon file-code-icon">
            {getFileIcon(n.name)}
          </span>
          <span className="node-name">{n.name}</span>
        </div>
      );
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop();
    switch (ext) {
      case "py":
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ecc94b" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        );
      case "json":
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4299e1" strokeWidth="2">
            <path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z" />
            <path d="M15 3v5h5" />
          </svg>
        );
      case "md":
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9f7aea" strokeWidth="2">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            <path d="M8 13h8M8 17h8" />
          </svg>
        );
      case "tsx":
      case "ts":
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#319795" strokeWidth="2">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
          </svg>
        );
      default:
        return (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0aec0" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16c0 1.1.9 2 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
            <path d="M14 3v5h5" />
          </svg>
        );
    }
  };

  return <div className="file-tree-container">{renderNode(node)}</div>;
};
