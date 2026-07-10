import os
import tempfile
import json
import subprocess
import pytest
from fastapi.testclient import TestClient
import backend.app.main as main_module
from backend.app.database import get_db_connection
from backend.app.agents.manager import agent_manager
from backend.app.agents.antigravity_adapter import AntiGravityAdapter
from backend.app.agents.cli_worker_adapter import CLIWorkerAdapter
from backend.app.agents.real_codex_adapter import CodexExecFallbackClient, CodexRunResult, RealCodexAdapter

def test_health_endpoint(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["database_ready"] is True

def test_database_initialization():
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM schema_metadata WHERE key = 'schema_version'")
        row = cursor.fetchone()
        assert row is not None
        assert row["value"] == "1"

        # Verify tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='projects'")
        assert cursor.fetchone() is not None
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='agents'")
        assert cursor.fetchone() is not None
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'")
        assert cursor.fetchone() is not None
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='messages'")
        assert cursor.fetchone() is not None
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='reviews'")
        assert cursor.fetchone() is not None
    finally:
        conn.close()

def test_project_crud(client: TestClient):
    # 1. List projects (mock seed has projects)
    response = client.get("/api/projects")
    assert response.status_code == 200
    projects = response.json()
    assert len(projects) > 0

    # 2. Create project
    payload = {
        "name": "Test Project Alpha",
        "localPath": "/tmp/test-project-alpha",
        "branch": "main"
    }
    response = client.post("/api/projects", json=payload)
    assert response.status_code == 200
    new_proj = response.json()
    assert new_proj["name"] == "Test Project Alpha"
    assert new_proj["branch"] == "main"
    assert "id" in new_proj

    # Verify default agents were created for this project
    assert new_proj["agentCount"] == 3
    agents = new_proj["agents"]
    names = [a["name"] for a in agents]
    assert "Codex" in names
    assert "AntiGravity" in names
    assert "Codex Worker" in names

    # Verify initialization message exists
    assert len(new_proj["messages"]) == 1
    assert "initialized at /tmp/test-project-alpha" in new_proj["messages"][0]["text"]

    # 3. Delete project
    p_id = new_proj["id"]
    response = client.delete(f"/api/projects/{p_id}")
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify it is deleted
    response = client.get("/api/projects")
    projects_after = response.json()
    assert not any(p["id"] == p_id for p in projects_after)

def test_task_creation_and_review_constraints(client: TestClient):
    # Create project first
    payload = {
        "name": "Task Test Project",
        "localPath": "/tmp/task-test-project",
        "branch": "dev"
    }
    proj = client.post("/api/projects", json=payload).json()
    p_id = proj["id"]

    # 1. Create a task
    task_payload = {
        "id": "T-101",
        "title": "Build user auth",
        "agentName": "AntiGravity",
        "status": "assigned",
        "priority": "high",
        "progress": 0,
        "description": "Create JWT authentication",
        "relatedFiles": ["/src/auth.py"],
        "expectedOutput": "Compiling auth module"
    }
    response = client.post(f"/api/projects/{p_id}/tasks", json=task_payload)
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # 2. Try to complete the task directly without approved review -> should raise HTTP 400
    update_payload = {
        "status": "completed",
        "progress": 100
    }
    response = client.put(f"/api/projects/{p_id}/tasks/T-101", json=update_payload)
    assert response.status_code == 400
    assert "Tasks cannot bypass Codex review" in response.json()["detail"]

    # 3. Create an approved review for this task
    review_payload = {
        "taskId": "T-101",
        "reviewer": "Codex",
        "status": "approved",
        "feedback": "Perfect auth implementation",
        "timestamp": "12:00 PM"
    }
    response = client.post(f"/api/projects/{p_id}/reviews", json=review_payload)
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # 4. Now updating to completed should succeed
    response = client.put(f"/api/projects/{p_id}/tasks/T-101", json=update_payload)
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Clean up project
    client.delete(f"/api/projects/{p_id}")

def test_agent_manager_auto_reviews_submitted_tasks(client: TestClient):
    payload = {
        "name": "Auto Review Project",
        "localPath": "/tmp/auto-review-project",
        "branch": "main"
    }
    proj = client.post("/api/projects", json=payload).json()
    p_id = proj["id"]

    task_payload = {
        "id": "T-201",
        "title": "Polish generated dashboard",
        "agentName": "AntiGravity",
        "status": "review",
        "priority": "medium",
        "progress": 90,
        "description": "Review-ready worker output",
        "relatedFiles": ["/src/Dashboard.tsx"],
        "expectedOutput": "Reviewed task"
    }
    response = client.post(f"/api/projects/{p_id}/tasks", json=task_payload)
    assert response.status_code == 200

    agent_manager.tick()

    refreshed = client.get("/api/projects").json()
    project = next(p for p in refreshed if p["id"] == p_id)
    task = next(t for t in project["tasks"] if t["id"] == "T-201")

    assert task["status"] == "completed"
    assert task["progress"] == 100
    assert task["reviewHistory"][0]["reviewer"] == "Codex"
    assert task["reviewHistory"][0]["status"] == "approved"
    assert any("review complete: APPROVED by Codex" in m["text"] for m in project["messages"])

    client.delete(f"/api/projects/{p_id}")

def test_codex_sdk_worker_completes_with_real_diff_and_review(client: TestClient, tmp_path):
    project_dir = tmp_path / "codex-worker-project"
    project_dir.mkdir()
    tracked_file = project_dir / "tracked.txt"
    tracked_file.write_text("before\n", encoding="utf-8")

    import subprocess
    subprocess.run(["git", "init"], cwd=project_dir, check=True, capture_output=True)
    subprocess.run(["git", "add", "tracked.txt"], cwd=project_dir, check=True, capture_output=True)
    subprocess.run(
        ["git", "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "seed"],
        cwd=project_dir,
        check=True,
        capture_output=True,
    )

    class FakeCodexClient:
        def run(self, prompt: str, cwd: str, sandbox: str) -> CodexRunResult:
            if sandbox == "danger-full-access":
                (project_dir / "tracked.txt").write_text("after\n", encoding="utf-8")
                return CodexRunResult("Implemented the requested edit.")
            return CodexRunResult("APPROVED\nThe diff is small and correct.")

    proj = client.post("/api/projects", json={
        "name": "Codex Worker Test",
        "localPath": str(project_dir),
        "branch": "main"
    }).json()
    p_id = proj["id"]

    adapter_key = (p_id, "Codex Worker")
    adapter = RealCodexAdapter(str(project_dir), FakeCodexClient())
    adapter.start()
    agent_manager.adapters[adapter_key] = adapter

    try:
        task_payload = {
            "id": "T-301",
            "title": "Edit tracked file",
            "agentName": "Codex Worker",
            "status": "assigned",
            "priority": "medium",
            "progress": 0,
            "description": "Update tracked.txt",
            "relatedFiles": ["tracked.txt"],
            "expectedOutput": "tracked.txt changes"
        }
        assert client.post(f"/api/projects/{p_id}/tasks", json=task_payload).status_code == 200

        agent_manager.tick()
        assert adapter.thread is not None
        adapter.thread.join(timeout=10)
        agent_manager.tick()

        project = next(p for p in client.get("/api/projects").json() if p["id"] == p_id)
        task = next(t for t in project["tasks"] if t["id"] == "T-301")

        assert task["status"] == "completed"
        assert task["progress"] == 100
        assert task["reviewHistory"][0]["status"] == "approved"
        assert len(project["fileChanges"]) == 1
        assert project["fileChanges"][0]["path"] == "tracked.txt"
        assert "-before" in project["fileChanges"][0]["diffContent"]
        assert "+after" in project["fileChanges"][0]["diffContent"]
    finally:
        agent_manager.adapters.pop(adapter_key, None)
        client.delete(f"/api/projects/{p_id}")

def test_antigravity_worker_records_real_diff_for_review(client: TestClient, tmp_path):
    project_dir = tmp_path / "antigravity-worker-project"
    project_dir.mkdir()
    tracked_file = project_dir / "service.py"
    tracked_file.write_text("def handler():\n    return 'before'\n", encoding="utf-8")

    subprocess.run(["git", "init"], cwd=project_dir, check=True, capture_output=True)
    subprocess.run(["git", "add", "service.py"], cwd=project_dir, check=True, capture_output=True)
    subprocess.run(
        ["git", "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "seed"],
        cwd=project_dir,
        check=True,
        capture_output=True,
    )

    proj = client.post("/api/projects", json={
        "name": "AntiGravity Worker Test",
        "localPath": str(project_dir),
        "branch": "main"
    }).json()
    p_id = proj["id"]

    adapter_key = (p_id, "AntiGravity")
    adapter = AntiGravityAdapter(project_path=str(project_dir))
    adapter.start()
    agent_manager.adapters[adapter_key] = adapter

    try:
        task_payload = {
            "id": "T-401",
            "title": "Create AntiGravity test artifact",
            "agentName": "AntiGravity",
            "status": "assigned",
            "priority": "medium",
            "progress": 0,
            "description": "Write a visible AntiGravity smoke-test report.",
            "relatedFiles": [],
            "expectedOutput": "AntiGravity smoke-test report"
        }
        assert client.post(f"/api/projects/{p_id}/tasks", json=task_payload).status_code == 200

        agent_manager.tick()
        assert adapter.thread is not None, adapter.get_logs()
        adapter.thread.join(timeout=10)
        agent_manager.tick()

        project = next(p for p in client.get("/api/projects").json() if p["id"] == p_id)
        task = next(t for t in project["tasks"] if t["id"] == "T-401")

        assert task["status"] == "completed"
        assert task["progress"] == 100
        assert task["relatedFiles"] == ["ANTIGRAVITY_TASK_T-401.md"]
        assert len(project["fileChanges"]) == 1
        assert project["fileChanges"][0]["path"] == "ANTIGRAVITY_TASK_T-401.md"
        assert "AntiGravity Task Report: T-401" in project["fileChanges"][0]["diffContent"]
        assert "visible workspace artifact" in project["fileChanges"][0]["diffContent"]
    finally:
        agent_manager.adapters.pop(adapter_key, None)
        client.delete(f"/api/projects/{p_id}")

def test_antigravity_real_agy_command_uses_print_prompt():
    adapter = AntiGravityAdapter(launch_command="agy --print-timeout 10m")
    base_cmd = adapter._build_command()
    prompt = "Implement task T-1"

    cmd = adapter._build_agy_command(base_cmd, prompt)

    assert cmd == ["agy", "--print-timeout", "10m", "--print", prompt]

def test_antigravity_real_agy_command_respects_existing_prompt_flag():
    adapter = AntiGravityAdapter(launch_command="agy --print")
    base_cmd = adapter._build_command()
    prompt = "Implement task T-1"

    cmd = adapter._build_agy_command(base_cmd, prompt)

    assert cmd == ["agy", "--print", prompt]


def test_generic_cli_worker_builds_known_noninteractive_commands(monkeypatch):
    monkeypatch.setattr("backend.app.agents.cli_worker_adapter.shutil.which", lambda command: command)
    prompt = "Implement task T-1"

    assert CLIWorkerAdapter("OpenCode", "opencode", "C:/tmp")._build_command(prompt) == ["opencode", "run", prompt]
    assert CLIWorkerAdapter("Kilocode", "kilocode", "C:/tmp")._build_command(prompt) == ["kilocode", "run", prompt]
    assert CLIWorkerAdapter("Mimo Code", "mimo", "C:/tmp")._build_command(prompt) == ["mimo", "run", prompt, "--trust", "--never-ask"]
    assert CLIWorkerAdapter("Blackbox", "blackbox", "C:/tmp")._build_command(prompt) == ["blackbox", "--prompt", prompt, "--yolo", "--skip-update"]

def test_codex_sdk_worker_blocks_on_runtime_failure(client: TestClient, tmp_path):
    project_dir = tmp_path / "codex-worker-fail"
    project_dir.mkdir()
    (project_dir / "tracked.txt").write_text("before\n", encoding="utf-8")
    subprocess.run(["git", "init"], cwd=project_dir, check=True, capture_output=True)
    subprocess.run(["git", "add", "tracked.txt"], cwd=project_dir, check=True, capture_output=True)
    subprocess.run(
        ["git", "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "seed"],
        cwd=project_dir,
        check=True,
        capture_output=True,
    )

    class FailingCodexClient:
        def run(self, prompt: str, cwd: str, sandbox: str) -> CodexRunResult:
            raise RuntimeError("Codex auth unavailable")

    proj = client.post("/api/projects", json={
        "name": "Codex Worker Failure",
        "localPath": str(project_dir),
        "branch": "main"
    }).json()
    p_id = proj["id"]

    adapter_key = (p_id, "Codex Worker")
    adapter = RealCodexAdapter(str(project_dir), FailingCodexClient())
    adapter.start()
    agent_manager.adapters[adapter_key] = adapter

    try:
        task_payload = {
            "id": "T-302",
            "title": "Fail worker",
            "agentName": "Codex Worker",
            "status": "assigned",
            "priority": "medium",
            "progress": 0,
            "description": "Trigger fake failure",
            "relatedFiles": [],
            "expectedOutput": "blocked task"
        }
        assert client.post(f"/api/projects/{p_id}/tasks", json=task_payload).status_code == 200

        agent_manager.tick()
        assert adapter.thread is not None
        adapter.thread.join(timeout=10)
        agent_manager.tick()

        project = next(p for p in client.get("/api/projects").json() if p["id"] == p_id)
        task = next(t for t in project["tasks"] if t["id"] == "T-302")
        worker = next(a for a in project["agents"] if a["name"] == "Codex Worker")

        assert task["status"] == "blocked"
        assert worker["status"] == "blocked"
        assert any("Codex auth unavailable" in log for log in worker["logs"])
    finally:
        agent_manager.adapters.pop(adapter_key, None)
        client.delete(f"/api/projects/{p_id}")

def test_codex_exec_fallback_places_approval_flag_before_exec(monkeypatch):
    captured = {}

    monkeypatch.setattr("backend.app.agents.real_codex_adapter.shutil.which", lambda _: "codex")

    class FakeProcess:
        returncode = 0

        def communicate(self, input=None, timeout=None):
            return (
                '{"type":"item.completed","item":{"type":"agent_message","text":"done"}}\n',
                "",
            )

    def fake_popen(cmd, cwd, stdin, stdout, stderr, text):
        captured["cmd"] = cmd
        captured["stdin"] = stdin
        return FakeProcess()

    monkeypatch.setattr("backend.app.agents.real_codex_adapter.subprocess.Popen", fake_popen)

    result = CodexExecFallbackClient().run("Do work", "C:/tmp", "danger-full-access")

    assert result.final_response == "done"
    assert captured["cmd"][:4] == ["codex", "-a", "never", "exec"]
    assert captured["cmd"][-1] == "-"
    assert captured["stdin"] == subprocess.PIPE

def test_codex_exec_fallback_times_out_and_kills_process(monkeypatch):
    monkeypatch.setattr("backend.app.agents.real_codex_adapter.shutil.which", lambda _: "codex")
    monkeypatch.setenv("AI_TEAM_CODEX_TIMEOUT_SECONDS", "1")

    class FakeProcess:
        returncode = None

        def __init__(self):
            self.killed = False

        def communicate(self, input=None, timeout=None):
            if timeout is not None:
                raise subprocess.TimeoutExpired(cmd="codex", timeout=timeout)
            return ("partial stdout", "partial stderr")

        def kill(self):
            self.killed = True

    fake_process = FakeProcess()
    monkeypatch.setattr(
        "backend.app.agents.real_codex_adapter.subprocess.Popen",
        lambda *args, **kwargs: fake_process,
    )

    with pytest.raises(RuntimeError, match="codex exec timed out after 1 seconds"):
        CodexExecFallbackClient().run("Do work", "C:/tmp", "danger-full-access")

    assert fake_process.killed is True

def test_codex_exec_fallback_reports_empty_output(monkeypatch):
    monkeypatch.setattr("backend.app.agents.real_codex_adapter.shutil.which", lambda _: "codex")

    class FakeProcess:
        returncode = 0

        def communicate(self, input=None, timeout=None):
            return (None, None)

    monkeypatch.setattr(
        "backend.app.agents.real_codex_adapter.subprocess.Popen",
        lambda *args, **kwargs: FakeProcess(),
    )

    with pytest.raises(RuntimeError, match="codex exec returned no JSON output"):
        CodexExecFallbackClient().run("Do work", "C:/tmp", "danger-full-access")

def test_codex_worker_records_only_diff_changes_since_task_start(client: TestClient, tmp_path):
    project_dir = tmp_path / "codex-worker-baseline"
    project_dir.mkdir()
    tracked_file = project_dir / "tracked.txt"
    tracked_file.write_text("before\n", encoding="utf-8")

    subprocess.run(["git", "init"], cwd=project_dir, check=True, capture_output=True)
    subprocess.run(["git", "add", "tracked.txt"], cwd=project_dir, check=True, capture_output=True)
    subprocess.run(
        ["git", "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "seed"],
        cwd=project_dir,
        check=True,
        capture_output=True,
    )
    tracked_file.write_text("preexisting dirty edit\n", encoding="utf-8")

    class FakeCodexClient:
        def run(self, prompt: str, cwd: str, sandbox: str) -> CodexRunResult:
            if sandbox == "danger-full-access":
                (project_dir / "APP_REPORT.md").write_text("# Report\n", encoding="utf-8")
                return CodexRunResult("Wrote the report.")
            return CodexRunResult("APPROVED\nReport diff is scoped.")

    proj = client.post("/api/projects", json={
        "name": "Codex Worker Baseline",
        "localPath": str(project_dir),
        "branch": "main"
    }).json()
    p_id = proj["id"]

    adapter_key = (p_id, "Codex Worker")
    adapter = RealCodexAdapter(str(project_dir), FakeCodexClient())
    adapter.start()
    agent_manager.adapters[adapter_key] = adapter

    try:
        task_payload = {
            "id": "T-304",
            "title": "Write app report",
            "agentName": "Codex Worker",
            "status": "assigned",
            "priority": "medium",
            "progress": 0,
            "description": "Write APP_REPORT.md",
            "relatedFiles": [],
            "expectedOutput": "APP_REPORT.md"
        }
        assert client.post(f"/api/projects/{p_id}/tasks", json=task_payload).status_code == 200

        agent_manager.tick()
        assert adapter.thread is not None
        adapter.thread.join(timeout=10)
        agent_manager.tick()

        project = next(p for p in client.get("/api/projects").json() if p["id"] == p_id)
        task = next(t for t in project["tasks"] if t["id"] == "T-304")

        assert task["status"] == "completed"
        assert task["relatedFiles"] == ["APP_REPORT.md"]
        assert [change["path"] for change in project["fileChanges"]] == ["APP_REPORT.md"]
    finally:
        agent_manager.adapters.pop(adapter_key, None)
        client.delete(f"/api/projects/{p_id}")

def test_codex_worker_redispatches_orphaned_working_task(client: TestClient, tmp_path):
    project_dir = tmp_path / "codex-worker-orphan"
    project_dir.mkdir()
    (project_dir / "tracked.txt").write_text("before\n", encoding="utf-8")

    subprocess.run(["git", "init"], cwd=project_dir, check=True, capture_output=True)
    subprocess.run(["git", "add", "tracked.txt"], cwd=project_dir, check=True, capture_output=True)
    subprocess.run(
        ["git", "-c", "user.name=Test", "-c", "user.email=test@example.com", "commit", "-m", "seed"],
        cwd=project_dir,
        check=True,
        capture_output=True,
    )

    class FakeCodexClient:
        def run(self, prompt: str, cwd: str, sandbox: str) -> CodexRunResult:
            if sandbox == "danger-full-access":
                (project_dir / "tracked.txt").write_text("after\n", encoding="utf-8")
                return CodexRunResult("Recovered the orphaned task.")
            return CodexRunResult("APPROVED\nRecovery diff is correct.")

    proj = client.post("/api/projects", json={
        "name": "Codex Worker Orphan",
        "localPath": str(project_dir),
        "branch": "main"
    }).json()
    p_id = proj["id"]

    task_payload = {
        "id": "T-303",
        "title": "Recover orphaned worker",
        "agentName": "Codex Worker",
        "status": "working",
        "priority": "medium",
        "progress": 10,
        "description": "This task was already working before restart.",
        "relatedFiles": ["tracked.txt"],
        "expectedOutput": "tracked.txt changes"
    }

    adapter_key = (p_id, "Codex Worker")
    adapter = RealCodexAdapter(str(project_dir), FakeCodexClient())
    adapter.start()
    agent_manager.adapters[adapter_key] = adapter

    try:
        assert client.post(f"/api/projects/{p_id}/tasks", json=task_payload).status_code == 200

        agent_manager.tick()
        assert adapter.thread is not None
        adapter.thread.join(timeout=10)
        agent_manager.tick()

        project = next(p for p in client.get("/api/projects").json() if p["id"] == p_id)
        task = next(t for t in project["tasks"] if t["id"] == "T-303")

        assert task["status"] == "completed"
        assert task["progress"] == 100
        assert project["fileChanges"][0]["path"] == "tracked.txt"
    finally:
        agent_manager.adapters.pop(adapter_key, None)
        client.delete(f"/api/projects/{p_id}")

def test_agent_management_constraints(client: TestClient):
    payload = {
        "name": "Agent constraints project",
        "localPath": "/tmp/agent-constraints-project",
        "branch": "main"
    }
    proj = client.post("/api/projects", json=payload).json()
    p_id = proj["id"]

    # 1. Create agent
    agent_payload = {
        "name": "OpenCode",
        "role": "Frontend Specialist",
        "status": "online",
        "currentTask": "None",
        "progress": 0,
        "lastActive": "Just now",
        "avatar": "OC",
        "logs": [],
        "description": "Mock frontend developer",
        "capabilities": ["React", "CSS"],
        "intelligenceLevel": "Medium",
        "adapterType": "Mock",
        "launchCommand": "",
        "isEnabled": True
    }
    response = client.post(f"/api/projects/{p_id}/agents", json=agent_payload)
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # 2. Update agent
    update_payload = {
        "role": "Lead Frontend Specialist",
        "progress": 50
    }
    response = client.put(f"/api/projects/{p_id}/agents/OpenCode", json=update_payload)
    assert response.status_code == 200
    assert response.json() == {"status": "success"}

    # Verify deletion of worker agent works
    response = client.delete(f"/api/projects/{p_id}/agents/OpenCode")
    assert response.status_code == 200

    # 3. Try to delete Codex -> should raise HTTP 400
    response = client.delete(f"/api/projects/{p_id}/agents/Codex")
    assert response.status_code == 400
    assert "Codex cannot be deleted" in response.json()["detail"]

    # Clean up project
    client.delete(f"/api/projects/{p_id}")


def test_task_package_generation_includes_workspace_and_review_rules(client: TestClient, tmp_path):
    project_dir = tmp_path / "package-project"
    project_dir.mkdir()
    proj = client.post("/api/projects", json={
        "name": "Task Package Project",
        "localPath": str(project_dir),
        "branch": "feature/test-packages",
    }).json()
    p_id = proj["id"]

    task_payload = {
        "id": "T-501",
        "title": "Package task",
        "agentName": "AntiGravity",
        "status": "assigned",
        "priority": "medium",
        "progress": 0,
        "description": "Verify structured task package.",
        "relatedFiles": ["README.md"],
        "expectedOutput": "structured package",
    }
    assert client.post(f"/api/projects/{p_id}/tasks", json=task_payload).status_code == 200

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tasks WHERE project_id = ? AND id = ?", (p_id, "T-501"))
        task = cursor.fetchone()
        package = agent_manager.build_task_package(task)
    finally:
        conn.close()
        client.delete(f"/api/projects/{p_id}")

    data = package.to_dict()
    assert data["taskId"] == "T-501"
    assert data["assignedAgent"] == "AntiGravity"
    assert data["projectPath"] == str(project_dir)
    assert data["branch"] == "feature/test-packages"
    assert data["relatedFiles"] == ["README.md"]
    assert any("Codex review" in rule for rule in data["constraints"])


def test_unavailable_worker_blocks_task_instead_of_simulating_success(client: TestClient, tmp_path):
    project_dir = tmp_path / "unavailable-worker-project"
    project_dir.mkdir()
    proj = client.post("/api/projects", json={
        "name": "Unavailable Worker Project",
        "localPath": str(project_dir),
        "branch": "main",
    }).json()
    p_id = proj["id"]

    agent_payload = {
        "name": "OpenCode",
        "role": "Frontend Specialist",
        "status": "idle",
        "currentTask": "None",
        "progress": 0,
        "lastActive": "Just now",
        "avatar": "OC",
        "logs": [],
        "description": "Configured without a verified adapter",
        "capabilities": ["frontend"],
        "intelligenceLevel": "High",
        "adapterType": "API",
        "launchCommand": "",
        "isEnabled": True,
    }
    assert client.post(f"/api/projects/{p_id}/agents", json=agent_payload).status_code == 200

    task_payload = {
        "id": "T-502",
        "title": "Unsupported worker task",
        "agentName": "OpenCode",
        "status": "assigned",
        "priority": "medium",
        "progress": 0,
        "description": "This should not be simulated.",
        "relatedFiles": [],
        "expectedOutput": "blocked state",
    }
    assert client.post(f"/api/projects/{p_id}/tasks", json=task_payload).status_code == 200

    adapter_key = (p_id, "OpenCode")
    agent_manager.adapters.pop(adapter_key, None)
    try:
        agent_manager.tick()
        agent_manager.tick()
        project = next(p for p in client.get("/api/projects").json() if p["id"] == p_id)
        task = next(t for t in project["tasks"] if t["id"] == "T-502")
        agent = next(a for a in project["agents"] if a["name"] == "OpenCode")

        assert task["status"] == "blocked"
        assert agent["status"] == "blocked"
        assert any("unsupported or misconfigured" in log.lower() for log in agent["logs"])
        assert any("could not run task T-502" in message["text"] for message in project["messages"])
    finally:
        agent_manager.adapters.pop(adapter_key, None)
        client.delete(f"/api/projects/{p_id}")

def test_messages_and_codex_routing(client: TestClient, monkeypatch):
    class FakeChatCodexClient:
        def __init__(self):
            self.calls = []

        def run(self, prompt: str, cwd: str, sandbox: str) -> CodexRunResult:
            self.calls.append((prompt, cwd, sandbox))
            return CodexRunResult(final_response="Real Codex response about project progress.")

    fake_chat_client = FakeChatCodexClient()
    monkeypatch.setattr(main_module, "codex_chat_client", fake_chat_client)

    workspace = tempfile.mkdtemp()
    payload = {
        "name": "Routing Project",
        "localPath": workspace,
        "branch": "main"
    }
    proj = client.post("/api/projects", json=payload).json()
    p_id = proj["id"]

    # 1. Send normal user query -> Codex should reply
    msg_payload = {
        "id": "msg-101",
        "sender": "Aditya Gotra",
        "senderType": "user",
        "text": "Hello Codex, show me the plan.",
        "timestamp": "12:00 PM"
    }
    response = client.post(f"/api/projects/{p_id}/messages", json=msg_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["userMessage"]["id"] == "msg-101"
    assert data["codexMessage"] is not None
    assert data["codexMessage"]["sender"] == "Codex"
    assert data["codexMessage"]["text"] == "Real Codex response about project progress."
    assert fake_chat_client.calls[-1][1] == os.path.normcase(os.path.realpath(workspace))
    assert fake_chat_client.calls[-1][2] == "read-only"
    assert "Hello Codex, show me the plan." in fake_chat_client.calls[-1][0]

    # 2. Direct agent mentions should also receive a real Codex response
    msg_payload = {
        "id": "msg-102",
        "sender": "Aditya Gotra",
        "senderType": "user",
        "text": "Please help @antigravity clean the databases.",
        "timestamp": "12:01 PM"
    }
    response = client.post(f"/api/projects/{p_id}/messages", json=msg_payload)
    assert response.status_code == 200
    data = response.json()
    assert data["codexMessage"]["text"] == "Real Codex response about project progress."
    assert "@antigravity" in fake_chat_client.calls[-1][0]

    # 3. Implementation request should route to Codex Worker without old stub text
    msg_payload = {
        "id": "msg-103",
        "sender": "Aditya Gotra",
        "senderType": "user",
        "text": "Build a small status widget",
        "timestamp": "12:02 PM"
    }
    response = client.post(f"/api/projects/{p_id}/messages", json=msg_payload)
    assert response.status_code == 200
    data = response.json()
    assert "CODEX CLI STUB" not in data["codexMessage"]["text"]
    assert "Codex Worker" in data["codexMessage"]["text"]

    project = next(p for p in client.get("/api/projects").json() if p["id"] == p_id)
    created_task = next(t for t in project["tasks"] if t["title"] == "Build a small status widget")
    assert created_task["agentName"] == "Codex Worker"

    # 4. Natural artifact request should create a task without requiring a magic keyword
    msg_payload = {
        "id": "msg-104",
        "sender": "Aditya Gotra",
        "senderType": "user",
        "text": "I need a report about what this app does in a markdown file inside the project folder",
        "timestamp": "12:03 PM"
    }
    response = client.post(f"/api/projects/{p_id}/messages", json=msg_payload)
    assert response.status_code == 200
    data = response.json()
    assert "created task" in data["codexMessage"]["text"].lower()
    assert "Codex Worker" in data["codexMessage"]["text"]

    project = next(p for p in client.get("/api/projects").json() if p["id"] == p_id)
    report_task = next(t for t in project["tasks"] if "report about what this app does" in t["title"].lower())
    assert report_task["agentName"] == "Codex Worker"

    # 5. AntiGravity test requests should route to AntiGravity instead of the default worker
    msg_payload = {
        "id": "msg-105",
        "sender": "Aditya Gotra",
        "senderType": "user",
        "text": "I want to test antigravity so i want you to assign a testing task to it so that i can check if its working or not",
        "timestamp": "12:04 PM"
    }
    response = client.post(f"/api/projects/{p_id}/messages", json=msg_payload)
    assert response.status_code == 200
    data = response.json()
    assert "AntiGravity" in data["codexMessage"]["text"]

    project = next(p for p in client.get("/api/projects").json() if p["id"] == p_id)
    antigravity_task = next(t for t in project["tasks"] if "test antigravity" in t["description"].lower())
    assert antigravity_task["agentName"] == "AntiGravity"
    assert antigravity_task["expectedOutput"] == "AntiGravity worker test task with uncommitted git diff."

    # 6. Status questions should remain conversational and not create another task
    before_count = len(project["tasks"])
    msg_payload = {
        "id": "msg-106",
        "sender": "Aditya Gotra",
        "senderType": "user",
        "text": "What is the current progress of the agents?",
        "timestamp": "12:05 PM"
    }
    response = client.post(f"/api/projects/{p_id}/messages", json=msg_payload)
    assert response.status_code == 200
    data = response.json()
    assert "progress" in data["codexMessage"]["text"].lower()

    project = next(p for p in client.get("/api/projects").json() if p["id"] == p_id)
    assert len(project["tasks"]) == before_count

    # Clean up project
    client.delete(f"/api/projects/{p_id}")
    os.rmdir(workspace)


def test_codex_chat_failure_is_explicit_and_keeps_user_message(client: TestClient, monkeypatch, tmp_path):
    class FailingChatCodexClient:
        def run(self, prompt: str, cwd: str, sandbox: str) -> CodexRunResult:
            raise RuntimeError("Codex CLI is not signed in")

    monkeypatch.setattr(main_module, "codex_chat_client", FailingChatCodexClient())
    project = client.post("/api/projects", json={
        "name": "Codex Chat Failure",
        "localPath": str(tmp_path),
        "branch": "main",
    }).json()
    project_id = project["id"]

    response = client.post(f"/api/projects/{project_id}/messages", json={
        "id": "msg-codex-failure",
        "sender": "Aditya Gotra",
        "senderType": "user",
        "text": "Tell me what this project does.",
        "timestamp": "12:10 PM",
    })

    assert response.status_code == 503
    assert "Codex chat is unavailable" in response.json()["detail"]
    stored_project = next(p for p in client.get("/api/projects").json() if p["id"] == project_id)
    assert any(message["id"] == "msg-codex-failure" for message in stored_project["messages"])
    assert not any(
        message["senderType"] == "codex" and "Understood. If you want me" in message["text"]
        for message in stored_project["messages"]
    )

    client.delete(f"/api/projects/{project_id}")

def test_workspace_scanning_rules(client: TestClient):
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create standard file and ignored folder
        node_modules = os.path.join(temp_dir, "node_modules")
        os.makedirs(node_modules, exist_ok=True)
        with open(os.path.join(node_modules, "some_lib.js"), "w") as f:
            f.write("console.log(123);")

        src_dir = os.path.join(temp_dir, "src")
        os.makedirs(src_dir, exist_ok=True)
        with open(os.path.join(src_dir, "index.js"), "w") as f:
            f.write("console.log('src file');")

        # Scan
        response = client.get(f"/api/workspace/scan?path={temp_dir}")
        assert response.status_code == 200
        data = response.json()
        assert data["isDir"] is True
        
        # Verify node_modules is ignored and src is kept
        children_names = [child["name"] for child in data["children"]]
        assert "node_modules" not in children_names
        assert "src" in children_names

def test_path_traversal_protection(client: TestClient):
    with tempfile.TemporaryDirectory() as temp_dir:
        # Resolve real path format
        resolved_temp_dir = os.path.normcase(os.path.realpath(temp_dir))
        
        # Create a file inside workspace
        allowed_file = os.path.join(resolved_temp_dir, "allowed.txt")
        with open(allowed_file, "w") as f:
            f.write("Allowed Content")

        # Try to read file inside root workspace -> should succeed
        response = client.get(f"/api/workspace/file?path={allowed_file}&root={resolved_temp_dir}")
        assert response.status_code == 200
        assert response.json()["content"] == "Allowed Content"

        # Try to read file outside root workspace using absolute path -> should fail with HTTP 400
        # Create a temp file outside
        with tempfile.NamedTemporaryFile(delete=False) as outside_file:
            outside_file.write(b"Secret Content")
            outside_file_path = os.path.normcase(os.path.realpath(outside_file.name))

        try:
            response = client.get(f"/api/workspace/file?path={outside_file_path}&root={resolved_temp_dir}")
            assert response.status_code == 400
            assert "File path must be inside the selected workspace" in response.json()["detail"]
        finally:
            os.unlink(outside_file_path)

        # Try to read path traversal (e.g. using '..')
        traversal_path = os.path.join(resolved_temp_dir, "..", "secret.txt")
        response = client.get(f"/api/workspace/file?path={traversal_path}&root={resolved_temp_dir}")
        assert response.status_code == 400
