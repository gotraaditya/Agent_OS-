import sys
import json
import time
from datetime import datetime
from pathlib import Path


def safe_file_stem(value):
    return "".join(ch if ch.isalnum() or ch in {"-", "_"} else "_" for ch in value).strip("_") or "task"


def write_task_report(task):
    task_id = task.get("task_id", "T-X")
    title = task.get("title", "Updates")
    description = task.get("description", "")
    expected = task.get("expected_output", "")
    related_files = task.get("related_files", [])
    report_path = Path.cwd() / f"ANTIGRAVITY_TASK_{safe_file_stem(task_id)}.md"

    report_path.write_text(
        "\n".join([
            f"# AntiGravity Task Report: {task_id}",
            "",
            f"Generated: {datetime.now().isoformat(timespec='seconds')}",
            f"Title: {title}",
            "",
            "## Description",
            description or "No description provided.",
            "",
            "## Expected Output",
            expected or "No expected output provided.",
            "",
            "## Related Files",
            *(f"- {path}" for path in related_files),
            *([] if related_files else ["- None"]),
            "",
            "## Result",
            "AntiGravity received the task, processed the project context, and produced this report as a visible workspace artifact for adapter testing.",
            "",
        ]),
        encoding="utf-8",
    )
    return report_path.name

def main():
    # Read task package from stdin
    try:
        input_data = sys.stdin.readline().strip()
        task = json.loads(input_data)
    except Exception as e:
        print("[ERROR] Failed to parse input task package:", e)
        sys.exit(1)

    t_id = task.get("task_id", "T-X")
    title = task.get("title", "Updates")
    expected = task.get("expected_output", "")

    # Simulate execution steps
    print(f"[INFO] AntiGravity CLI executing task {t_id}: {title}")
    sys.stdout.flush()
    time.sleep(1)

    print("[PROGRESS] 25%")
    print("[LOAD] Reading project dependencies and analyzing database schema layout...")
    sys.stdout.flush()
    time.sleep(1)

    print("[PROGRESS] 60%")
    print("[RUN] Preparing visible AntiGravity workspace artifact...")
    report_name = write_task_report(task)
    print(f"[RUN] Wrote {report_name} in the project workspace.")
    sys.stdout.flush()
    time.sleep(1.5)

    print("[PROGRESS] 85%")
    print("[TEST] Running automated test suites for authentication middlewares...")
    print("[SUCCESS] All JWT validation assertions completed successfully.")
    sys.stdout.flush()
    time.sleep(1)

    print("[SUCCESS] 100%")
    print(f"[RESULT] Completed task {t_id}. Expected output: '{expected}' successfully generated.")
    sys.stdout.flush()

if __name__ == "__main__":
    main()
