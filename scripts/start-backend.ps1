$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $Python)) {
    throw "Python environment not found. Run 'npm run setup' first."
}

& $Python -m uvicorn backend.app.main:app --reload --reload-dir backend --host 127.0.0.1 --port 8000
