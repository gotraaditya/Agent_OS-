$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $Python)) {
    throw "Python environment not found. Run 'npm run setup' first."
}

$HealthUrl = "http://127.0.0.1:8000/api/health"
try {
    $Health = Invoke-RestMethod -Uri $HealthUrl -Method Get -TimeoutSec 2
    if ($Health.status -eq "ok" -and $Health.service -eq "ai-team-manager-backend") {
        Write-Host "AI Team Manager backend is already running at $HealthUrl. Reusing it for this session."
        while ($true) {
            Start-Sleep -Seconds 3600
        }
    }
} catch {
    # No compatible backend is running; start a fresh one below.
}

# Production mode: no --reload file watcher, faster startup
& $Python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
