$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $Python)) {
    throw "Python environment not found. Run 'npm run setup' first."
}

Set-Location -LiteralPath $ProjectRoot
& $Python -c "from backend.app.database import initialize_database, database_is_ready; initialize_database(); assert database_is_ready(); print('Backend database check passed.')"

