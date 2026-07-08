param(
    [string]$ProjectRoot = (Resolve-Path "$PSScriptRoot\..").Path
)

$packageJsonPath = Join-Path $ProjectRoot "package.json"

if (-not (Test-Path -LiteralPath $packageJsonPath)) {
    Write-Error "package.json was not found at $packageJsonPath"
    exit 1
}

$package = Get-Content -LiteralPath $packageJsonPath -Raw | ConvertFrom-Json

if ($package.name -ne "ai-team-manager") {
    Write-Error "Unexpected package name: $($package.name)"
    exit 1
}

Write-Host "Smoke test passed for $($package.name) v$($package.version)"
