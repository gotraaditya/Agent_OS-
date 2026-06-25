$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $ProjectRoot

Write-Host "Installing JavaScript dependencies..."
npm install

if (-not (Test-Path -LiteralPath ".venv\Scripts\python.exe")) {
    Write-Host "Creating the local Python environment..."
    python -m venv .venv
}

Write-Host "Installing Python backend dependencies..."
& ".venv\Scripts\python.exe" -m pip install --upgrade pip
& ".venv\Scripts\python.exe" -m pip install -r "backend\requirements.txt"

Write-Host ""
Write-Host "Setup complete. Start the app with: npm run dev"

