#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$REPO_ROOT/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env.local not found at $ENV_FILE"
  echo "Add PENPOT_SECRET_KEY to root .env.local (see infra/penpot/.env.example)"
  exit 1
fi

echo "🎨 Starting Penpot..."
docker compose --env-file "$ENV_FILE" -f "$SCRIPT_DIR/docker-compose.yml" up -d

echo ""
echo "✅ Penpot is running:"
echo "   Design:  http://localhost:9001"
echo "   Email:   http://localhost:1080"
echo ""
echo "First time? Register at http://localhost:9001/auth/register"
echo "Email verification is disabled — registration completes immediately."
