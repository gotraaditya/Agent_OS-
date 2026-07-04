$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $Python)) {
    throw "Python environment not found. Run 'npm run setup' first."
}

Set-Location -LiteralPath $ProjectRoot
& $Python -m pytest backend/tests
