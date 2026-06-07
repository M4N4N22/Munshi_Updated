#!/usr/bin/env bash
# Run on munshi-prod (browser SSH) when you cannot scp from laptop.
# Fetches compose files from GitHub main branch.
set -euo pipefail

DEPLOY_DIR=/home/ubuntu/munshi-dada
REPO_RAW=https://raw.githubusercontent.com/ShantanuGarg2004/Munshi_Updated/main

sudo mkdir -p "$DEPLOY_DIR"
sudo chown ubuntu:ubuntu "$DEPLOY_DIR"

sudo -u ubuntu curl -fsSL "$REPO_RAW/deploy/gcp-vm/docker-compose.yml" -o "$DEPLOY_DIR/docker-compose.yml"
sudo -u ubuntu curl -fsSL "$REPO_RAW/deploy/gcp-vm/.env.example" -o "$DEPLOY_DIR/.env.example"

if [ ! -f "$DEPLOY_DIR/.env" ]; then
  sudo -u ubuntu cp "$DEPLOY_DIR/.env.example" "$DEPLOY_DIR/.env"
  echo "Created $DEPLOY_DIR/.env — edit with nano before docker compose up"
else
  echo ".env already exists — not overwritten"
fi

echo "Next: nano $DEPLOY_DIR/.env"
echo "Then:  cd $DEPLOY_DIR && docker compose pull && docker compose up -d"
