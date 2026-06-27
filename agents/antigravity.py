import sys
import json
import time

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
    print("[RUN] Implementing auth session middleware JWT handlers...")
    print("[RUN] Binding token verification logic to FastAPIs lifespan context decorator...")
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
