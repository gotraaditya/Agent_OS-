import json
import shlex
import subprocess
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_CODEX_LAUNCH_COMMAND = "node backend/app/agents/codex_cli_stub.js"
ALLOWED_NODE_SCRIPTS = {
    (PROJECT_ROOT / "backend" / "app" / "agents" / "codex_cli_stub.js").resolve()
}
ALLOWED_EXECUTABLES = {"node", "node.exe", "codex", "codex.exe"}


class CodexCLIAdapter:
    def __init__(self, launch_command: str = DEFAULT_CODEX_LAUNCH_COMMAND):
        self.launch_command = launch_command or DEFAULT_CODEX_LAUNCH_COMMAND

    def _build_command(self) -> list[str]:
        """Parse and validate the configured Codex command before execution."""
        parts = [part.strip("\"'") for part in shlex.split(self.launch_command, posix=False)]
        if not parts:
            raise ValueError("Codex launch command is empty.")

        executable_name = Path(parts[0]).name.lower()
        if executable_name not in ALLOWED_EXECUTABLES:
            raise ValueError(f"Unsupported Codex executable: {parts[0]}")

        if executable_name in {"node", "node.exe"}:
            if len(parts) < 2:
                raise ValueError("Node-based Codex adapter requires a script path.")
            script_path = Path(parts[1])
            if not script_path.is_absolute():
                script_path = PROJECT_ROOT / script_path
            script_path = script_path.resolve()
            if script_path not in ALLOWED_NODE_SCRIPTS:
                raise ValueError(f"Unsupported Codex node script: {script_path}")
            return [parts[0], str(script_path), *parts[2:]]

        # Future real Codex CLI integration path. Keep shell=False and pass args as a list.
        return parts

    def send_query(self, query: str, timeout: float = 5.0) -> dict:
        """
        Launches the Codex CLI subprocess, transmits the query,
        and captures the output.
        """
        process = None
        try:
            cmd = self._build_command()
            process = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=str(PROJECT_ROOT)
            )

            stdout, stderr = process.communicate(input=query, timeout=timeout)

            if process.returncode != 0:
                return {
                    "status": "error",
                    "error": f"CLI return code {process.returncode}: {stderr.strip()}"
                }

            output = stdout.strip()
            if not output:
                return {
                    "status": "error",
                    "error": "CLI returned an empty response."
                }

            data = json.loads(output)
            return {
                "status": "success",
                "response": data.get("response", ""),
                "timestamp": data.get("timestamp", "")
            }

        except subprocess.TimeoutExpired:
            if process is not None:
                process.kill()
                process.communicate()
            return {
                "status": "timeout",
                "error": f"CLI execution timed out after {timeout} seconds."
            }
        except Exception as e:
            return {
                "status": "failure",
                "error": f"Failed to execute CLI command '{self.launch_command}': {str(e)}"
            }
