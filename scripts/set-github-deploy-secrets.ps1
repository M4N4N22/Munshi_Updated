# Sets GitHub Actions deploy secrets from local key (run from repo root).
# Requires: gh CLI authenticated (gh auth login)
param(
  [string]$HostIp = "34.14.139.96",
  [string]$KeyFile = ".ssh/ssh"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$keyPath = Join-Path $repoRoot $KeyFile

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Error "Install GitHub CLI: https://cli.github.com/ then gh auth login"
}
if (-not (Test-Path $keyPath)) {
  Write-Error "Private key not found: $keyPath"
}

gh secret set EC2_HOST --body $HostIp --repo ShantanuGarg2004/Munshi_Updated
Get-Content -Raw $keyPath | gh secret set EC2_SSH_KEY --repo ShantanuGarg2004/Munshi_Updated
Write-Host "Set EC2_HOST=$HostIp and EC2_SSH_KEY from $KeyFile"
