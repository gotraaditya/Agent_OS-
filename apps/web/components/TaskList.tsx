import React from "react";
import { Task, TaskStatus } from "../types";

interface TaskListProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (task: Task) => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  selectedTaskId,
  onSelectTask
}) => {
  const groups: { label: string; status: TaskStatus; accentClass: string }[] = [
    { label: "Assigned", status: "assigned", accentClass: "accent-blue" },
    { label: "Working", status: "working", accentClass: "accent-orange" },
    { label: "Active", status: "active", accentClass: "accent-orange" },
    { label: "In Review", status: "review", accentClass: "accent-yellow" },
    { label: "Completed", status: "completed", accentClass: "accent-green" },
    { label: "Blocked", status: "blocked", accentClass: "accent-red" }
  ];

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case "critical":
        return "badge-priority critical";
      case "high":
        return "badge-priority high";
      case "medium":
        return "badge-priority medium";
      default:
        return "badge-priority low";
    }
  };

  return (
    <div className="task-list-container">
      {groups.map((group) => {
        const groupTasks = tasks.filter((t) => t.status === group.status);
        return (
          <div key={group.status} className="task-group">
            <div className={`task-group-header ${group.accentClass}`}>
              <span className="task-group-bullet" />
              <span className="task-group-label">{group.label}</span>
              <span className="task-group-count">{groupTasks.length}</span>
            </div>

            <div className="task-group-items">
              {groupTasks.length === 0 ? (
                <div className="task-item-empty">No tasks in this group</div>
              ) : (
                groupTasks.map((task) => {
                  const isSelected = selectedTaskId === task.id;
                  return (
                    <div
                      key={task.id}
                      className={`task-list-item ${isSelected ? "selected" : ""}`}
                      onClick={() => onSelectTask(task)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="task-item-meta">
                        <span className="task-item-id">{task.id}</span>
                        <span className={getPriorityBadgeClass(task.priority)}>
                          {task.priority}
                        </span>
                      </div>
                      <h4 className="task-item-title">{task.title}</h4>

                      <div className="task-item-footer">
                        <div className="task-item-assigned">
                          <div className="mini-avatar" title={`Assigned: ${task.agentName}`}>
                            {task.agentName.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="assigned-name">{task.agentName}</span>
                        </div>
                        <div className="task-item-progress-group">
                          <span className="progress-text">{task.progress}%</span>
                          <div className="mini-progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${task.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
