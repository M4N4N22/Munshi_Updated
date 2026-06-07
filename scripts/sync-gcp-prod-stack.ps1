# Copy deploy/gcp-vm files to munshi-prod. Run from Munshi_Updated repo root.
param(
  [string]$HostIp = "34.14.139.96",
  [string]$User = "ubuntu",
  [string]$KeyFile = ".ssh/ssh",
  [string]$RemotePath = "/home/ubuntu/munshi-dada"
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$keyPath = Join-Path $repoRoot $KeyFile
$localDir = Join-Path $repoRoot "deploy\gcp-vm"

if (-not (Test-Path $keyPath)) {
  Write-Error "SSH key not found: $keyPath"
}
if (-not (Test-Path $localDir)) {
  Write-Error "Missing deploy folder: $localDir"
}

$sshTarget = "${User}@${HostIp}"
$sshCommon = @(
  "-i", $keyPath,
  "-o", "BatchMode=yes",
  "-o", "ConnectTimeout=15",
  "-o", "ConnectionAttempts=3",
  "-o", "ServerAliveInterval=5",
  "-o", "ServerAliveCountMax=3",
  "-o", "StrictHostKeyChecking=accept-new"
)

Write-Host "Testing SSH to $sshTarget ..."
& ssh @sshCommon $sshTarget "echo ok"
if ($LASTEXITCODE -ne 0) {
  Write-Error "SSH failed. Fix keys first (docs/p0-gcp-deploy-ssh.md)."
}

Write-Host "Creating $RemotePath ..."
& ssh @sshCommon $sshTarget "mkdir -p $RemotePath"
if ($LASTEXITCODE -ne 0) {
  Write-Error "mkdir on VM failed"
}

Write-Host "Uploading compose + env templates ..."
& scp @sshCommon `
  (Join-Path $localDir "docker-compose.yml") `
  (Join-Path $localDir ".env.example") `
  (Join-Path $localDir "ml.env.example") `
  "${sshTarget}:${RemotePath}/"
if ($LASTEXITCODE -ne 0) {
  Write-Error "scp failed"
}

Write-Host "Done. Next on VM:"
Write-Host "  ssh -i .ssh/ssh ubuntu@${HostIp}"
Write-Host "  cd $RemotePath && cp .env.example .env && cp ml.env.example ml.env"
Write-Host "  nano .env && nano ml.env && docker compose pull && docker compose up -d"
