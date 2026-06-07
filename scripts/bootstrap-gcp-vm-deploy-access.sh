#!/usr/bin/env bash
# Run ONCE on munshi-prod via GCP Console → SSH (browser).
# Installs the GitHub Actions deploy public key for user ubuntu.
set -euo pipefail

PUB='ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMc96iDIAZMHxKkYtPvhQxyKCqtdgcFb1zxQDr7VGmFG github-actions-gcp'

mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
if ! grep -qF "$PUB" ~/.ssh/authorized_keys; then
  echo "$PUB" >> ~/.ssh/authorized_keys
  echo "Added deploy key to ~/.ssh/authorized_keys"
else
  echo "Deploy key already present in authorized_keys"
fi

if groups | grep -q docker; then
  echo "ubuntu is in docker group"
else
  echo "WARN: ubuntu not in docker group. Run: sudo usermod -aG docker ubuntu && re-login"
fi

if [ -d /home/ubuntu/munshi-dada ]; then
  echo "Deploy path OK: /home/ubuntu/munshi-dada"
else
  echo "WARN: /home/ubuntu/munshi-dada missing — create and add docker-compose.yml"
fi

echo "Done. Test from laptop: ssh -i <private_key> ubuntu@<VM_IP>"
