#!/bin/bash
# PDS Local Development Server
#
# Starts the Bluesky PDS Docker container and tails its logs.
# Runs as a persistent Turbo TUI panel.
#
# This script is called by `turbo run dev` via the @trainers/pds workspace.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PDS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[PDS]${NC} $1"; }
log_success() { echo -e "${GREEN}[PDS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[PDS]${NC} $1"; }
log_error() { echo -e "${RED}[PDS]${NC} $1"; }

# =============================================================================
# Skip in CI/Production environments
# =============================================================================
if [ -n "$CI" ] || [ -n "$VERCEL" ] || [ -n "$NETLIFY" ] || [ -n "$GITHUB_ACTIONS" ]; then
  exit 0
fi

# =============================================================================
# Helpers
# =============================================================================
pds_healthy() {
  curl -s "http://localhost:3001/xrpc/_health" 2>/dev/null | grep -q "version"
}

check_docker() {
  if ! docker info >/dev/null 2>&1; then
    log_warn "Docker is not running — skipping PDS"
    log_warn "Start Docker Desktop and re-run pnpm dev to enable PDS"
    exit 0
  fi
}

# =============================================================================
# Check prerequisites
# =============================================================================
check_docker

# =============================================================================
# If PDS is already healthy, just tail logs
# =============================================================================
if pds_healthy; then
  log_success "PDS already running on http://localhost:3001"
  exec docker logs -f trainers-pds-local 2>&1
fi

# =============================================================================
# Start PDS container
# =============================================================================
PDS_ENV_FILE="$PDS_DIR/.pds-local.env"

log_info "Starting local PDS..."

# Stop any existing PDS container
docker compose -f "$PDS_DIR/docker-compose.yml" down 2>/dev/null || true

# Create environment file for docker-compose
# PDS_DEV_MODE=true bypasses HTTPS requirement for localhost
cat > "$PDS_ENV_FILE" << EOF
PDS_HOSTNAME=localhost
PDS_PORT=3000
PDS_DEV_MODE=true
PDS_ADMIN_PASSWORD=localdevpassword
PDS_JWT_SECRET=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef
PDS_PLC_ROTATION_KEY_K256_PRIVATE_KEY_HEX=cafebabecafebabecafebabecafebabecafebabecafebabecafebabecafebabe
PDS_DATA_DIRECTORY=/pds
PDS_BLOBSTORE_DISK_LOCATION=/pds/blobs
PDS_DID_PLC_URL=https://plc.directory
PDS_BSKY_APP_VIEW_URL=https://api.bsky.app
PDS_BSKY_APP_VIEW_DID=did:web:api.bsky.app
PDS_REPORT_SERVICE_URL=https://mod.bsky.app
PDS_REPORT_SERVICE_DID=did:plc:ar7c4by46qjdydhdevvrndac
PDS_CRAWLERS=https://bsky.network
PDS_INVITE_REQUIRED=true
PDS_INVITE_INTERVAL=604800000
PDS_HANDLE_DOMAINS=.trainers.gg,.bsky.social
EOF

# Start PDS
docker compose -f "$PDS_DIR/docker-compose.yml" --env-file "$PDS_ENV_FILE" up -d

# Wait for PDS to be healthy
log_info "Waiting for PDS to start..."
for _i in {1..30}; do
  sleep 1
  if pds_healthy; then
    break
  fi
done

if pds_healthy; then
  log_success "PDS is running on http://localhost:3001"
else
  log_error "PDS failed to start"
  docker logs trainers-pds-local 2>&1 | tail -20
  exit 1
fi

# Tail container logs (keeps panel alive and useful for debugging)
exec docker logs -f trainers-pds-local 2>&1
