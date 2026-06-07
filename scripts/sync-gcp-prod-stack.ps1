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
Write-Host "Creating $RemotePath on $sshTarget ..."
ssh -i $keyPath -o StrictHostKeyChecking=accept-new $sshTarget "mkdir -p $RemotePath"

Write-Host "Uploading docker-compose.yml and .env.example ..."
scp -i $keyPath (Join-Path $localDir "docker-compose.yml") "${sshTarget}:${RemotePath}/"
scp -i $keyPath (Join-Path $localDir ".env.example") "${sshTarget}:${RemotePath}/"

Write-Host "Done. SSH in and run: cd $RemotePath && cp .env.example .env && nano .env && docker compose up -d"
