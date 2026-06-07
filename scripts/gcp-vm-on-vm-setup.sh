#!/usr/bin/env bash
# Run on munshi-prod as ubuntu (after scp upload). Fixes permissions + guides docker pull.
set -euo pipefail

DEPLOY_DIR=/home/ubuntu/munshi-dada
cd "$DEPLOY_DIR"

echo "==> Fixing ownership (ubuntu must own deploy files) ..."
if [ "$(id -un)" != "ubuntu" ]; then
  echo "Re-run as ubuntu or: sudo bash $0"
  exit 1
fi

# Files created via browser SSH as m4online1219 block ubuntu from editing
if ls -la .env ml.env 2>/dev/null | grep -qv ' ubuntu '; then
  sudo chown -R ubuntu:ubuntu "$DEPLOY_DIR"
fi

if [ ! -f .env ]; then cp .env.example .env; fi
if [ ! -f ml.env ]; then cp ml.env.example ml.env; fi

echo "==> Edit secrets (use vi if nano missing):"
echo "    vi .env      # Supabase, Olli, MUNSHI_PUBLIC_API_HOST"
echo "    vi ml.env    # OPENAI_API_KEY"

if ! command -v nano >/dev/null 2>&1; then
  echo "    (optional) sudo apt-get update && sudo apt-get install -y nano"
fi

echo ""
echo "==> Docker Hub login (required if repos are private):"
echo "    docker login -u shantanugarg2004"
echo ""
echo "==> Images must exist on Docker Hub. If pull fails with 'not exist':"
echo "    1. GitHub Actions -> CI/CD Pipeline on main -> wait for build-and-push"
echo "    2. Or temporarily use ML image: shantanugarg2004/munshi_intent_classifier:latest"
echo ""
echo "==> Then:"
echo "    docker compose pull"
echo "    docker compose up -d"
echo "    docker compose ps"
