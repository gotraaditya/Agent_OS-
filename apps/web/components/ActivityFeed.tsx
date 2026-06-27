import React, { useState, useRef, useEffect } from "react";
import { Message } from "../types";

interface ActivityFeedProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onOpenFileByPath?: (path: string) => void;
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  messages,
  onSendMessage,
  inputRef,
  onOpenFileByPath
}) => {
  const [inputText, setInputText] = useState("");
  const feedEndRef = useRef<HTMLDivElement | null>(null);

  const handleSend = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText);
    setInputText("");
  };

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getSenderColorClass = (type: string, name: string) => {
    if (type === "codex") return "sender-codex";
    if (type === "user") return "sender-user";
    if (type === "system") return "sender-system";
    
    // Workers custom color
    switch (name) {
      case "AntiGravity":
        return "sender-antigravity";
      case "OpenCode":
        return "sender-opencode";
      case "Blackbox":
        return "sender-blackbox";
      case "Kilocode":
        return "sender-kilocode";
      default:
        return "sender-worker";
    }
  };

  const getTaskBadgeClass = (status: string) => {
    switch (status) {
      case "completed":
        return "task-card-badge status-completed";
      case "review":
        return "task-card-badge status-review";
      case "blocked":
        return "task-card-badge status-blocked";
      case "assigned":
        return "task-card-badge status-assigned";
      case "working":
        return "task-card-badge status-working";
      default:
        return "task-card-badge status-active";
    }
  };

  return (
    <section className="activity-feed-panel" aria-label="Codex Activity Feed">
      {/* Feed Header */}
      <div className="feed-header">
        <h3 className="feed-channel-name">
          <span className="hash-symbol">#</span> project-dev
        </h3>
        <span className="feed-metadata">Codex Online · 5 worker agents standby</span>
      </div>

      {/* Messages Timeline */}
      <div className="feed-timeline">
        {messages.map((msg) => {
          const isSystem = msg.senderType === "system";
          const senderClass = getSenderColorClass(msg.senderType, msg.sender);

          if (isSystem) {
            return (
              <div key={msg.id} className="feed-message system-event">
                <span className="system-event-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
                </span>
                <span className="system-event-text">{msg.text}</span>
                <span className="system-event-time">{msg.timestamp}</span>

                {/* Sub Task Card */}
                {msg.taskCard && (
                  <div className="feed-task-card">
                    <div className="task-card-header">
                      <span className={getTaskBadgeClass(msg.taskCard.status)}>
                        {msg.taskCard.status.toUpperCase()}
                      </span>
                      <span className="task-card-id">{msg.taskCard.id}</span>
                      <span className="task-card-title">{msg.taskCard.title}</span>
                    </div>
                    <div className="task-card-body">
                      Assigned to: <strong>{msg.taskCard.agentName}</strong>
                    </div>
                  </div>
                )}

                {/* File Changes Card */}
                {msg.fileChanges && (
                  <div className="feed-diff-card">
                    <div className="diff-card-summary">{msg.fileChanges.summary}</div>
                    <div className="diff-card-files">
                      {msg.fileChanges.files.map((file, idx) => (
                        <div
                          key={idx}
                          className="diff-file-item clickable"
                          onClick={() => onOpenFileByPath && onOpenFileByPath(file.path)}
                          title="Click to open file in editor"
                        >
                          <span className={`diff-status-dot ${file.status}`}>
                            {file.status === "added" ? "A" : file.status === "deleted" ? "D" : "M"}
                          </span>
                          <span className="diff-file-path">{file.path}</span>
                          <span className="diff-lines-add">+{file.additions}</span>
                          <span className="diff-lines-del">-{file.deletions}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          }

          return (
            <div key={msg.id} className={`feed-message chat-msg ${senderClass}`}>
              <div className="msg-avatar">
                {msg.avatar || msg.sender.substring(0, 2).toUpperCase()}
              </div>
              <div className="msg-bubble">
                <div className="msg-meta">
                  <span className="msg-sender-name">{msg.sender}</span>
                  {msg.senderType === "codex" && <span className="role-label codex">LEAD</span>}
                  {msg.senderType === "worker" && <span className="role-label worker">AGENT</span>}
                  <span className="msg-timestamp">{msg.timestamp}</span>
                </div>
                <div className="msg-text">{msg.text}</div>

                {/* Review Card */}
                {msg.reviewCard && (
                  <div className={`feed-review-card ${msg.reviewCard.status}`}>
                    <div className="review-card-header">
                      <span className={`review-status-badge ${msg.reviewCard.status}`}>
                        {msg.reviewCard.status === "approved" ? "APPROVED" : "REVISION REQUIRED"}
                      </span>
                      <span className="review-task-title">{msg.reviewCard.taskTitle}</span>
                    </div>
                    <div className="review-feedback">
                      &ldquo;{msg.reviewCard.feedback}&rdquo;
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={feedEndRef} />
      </div>

      {/* Input Composer */}
      <div className="feed-input-composer">
        {/* Editor controls */}
        <div className="composer-toolbar">
          <button className="toolbar-btn" title="Bold (mock)" aria-label="Bold">
            <strong>B</strong>
          </button>
          <button className="toolbar-btn" title="Italic (mock)" aria-label="Italic">
            <em>I</em>
          </button>
          <button className="toolbar-btn text-strike" title="Strikethrough (mock)" aria-label="Strikethrough">
            S
          </button>
          <div className="toolbar-divider" />
          <button className="toolbar-btn" title="Insert Link (mock)" aria-label="Link">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          </button>
          <button className="toolbar-btn" title="Bullet List (mock)" aria-label="Bullet list">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button className="toolbar-btn" title="Code block (mock)" aria-label="Code block">
            &lt;/&gt;
          </button>
          <div className="toolbar-divider" />
          <button className="toolbar-btn" title="Emoji (mock)" aria-label="Emoji">
            ☺
          </button>
        </div>

        {/* Form Input */}
        <form onSubmit={handleSend} className="composer-form">
          <input
            ref={inputRef}
            type="text"
            className="composer-input"
            placeholder="Message Codex..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSend(e);
              }
            }}
          />
          <button
            type="button"
            className="composer-send-btn"
            disabled={!inputText.trim()}
            aria-label="Send message"
            onClick={handleSend}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </div>
    </section>
  );
};
