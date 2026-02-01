#!/bin/bash
# Local PDS Setup Script
# Ensures the local PDS Docker container and ngrok tunnel are running.
#
# This script is called by `pnpm dev` (via `pnpm setup:pds`).
# It starts ngrok (for Bluesky OAuth callbacks) and the PDS container.
#
# Fast path: if PDS is already healthy AND ngrok tunnel is running, exits in <1s.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PDS_DIR="$SCRIPT_DIR"
NGROK_PID_FILE="$SCRIPT_DIR/.ngrok.pid"
NGROK_LOG_FILE="$SCRIPT_DIR/.ngrok.log"

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
# ngrok helpers
# =============================================================================

# Read static domain from .env.ngrok
get_static_domain() {
  local ENV_NGROK="$REPO_ROOT/.env.ngrok"
  if [ -f "$ENV_NGROK" ]; then
    grep "^NGROK_STATIC_DOMAIN=" "$ENV_NGROK" 2>/dev/null | cut -d'=' -f2-
  fi
}

# Get the current ngrok tunnel URL from the local API
get_ngrok_url() {
  curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*"' | head -1 | cut -d'"' -f4
}

check_ngrok_installed() {
  if ! command -v ngrok &>/dev/null; then
    log_error "ngrok is not installed."
    echo ""
    echo "  Install ngrok:"
    echo "    brew install ngrok    # macOS"
    echo "    choco install ngrok   # Windows"
    echo "    snap install ngrok    # Linux"
    echo ""
    echo "  Then authenticate:"
    echo "    1. Sign up at https://ngrok.com"
    echo "    2. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "    3. Run: ngrok config add-authtoken <your-token>"
    echo ""
    exit 1
  fi
}

check_ngrok_auth() {
  if ! ngrok config check 2>/dev/null | grep -q "Valid"; then
    log_error "ngrok is not authenticated"
    echo ""
    echo "  To authenticate ngrok:"
    echo "    1. Sign up at https://ngrok.com"
    echo "    2. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "    3. Run: ngrok config add-authtoken <your-token>"
    echo ""
    exit 1
  fi
}

# =============================================================================
# Fast path: PDS healthy AND ngrok tunnel running
# =============================================================================
pds_healthy() {
  curl -s "http://localhost:3001/xrpc/_health" 2>/dev/null | grep -q "version"
}

ngrok_running() {
  local url
  url=$(get_ngrok_url)
  [ -n "$url" ]
}

if pds_healthy && ngrok_running; then
  log_success "PDS already running, ngrok tunnel active"
  exit 0
fi

# =============================================================================
# Check prerequisites
# =============================================================================
check_docker() {
  if ! docker info >/dev/null 2>&1; then
    log_error "Docker is not running. Please start Docker Desktop."
    exit 1
  fi
}

# =============================================================================
# Start ngrok tunnel (port 3000, web app)
# =============================================================================
start_ngrok() {
  # Already running? Skip.
  if ngrok_running; then
    log_success "ngrok tunnel already running: $(get_ngrok_url)"
    return
  fi

  log_info "Starting ngrok tunnel for web app (port 3000)..."

  # Kill any stale ngrok process from a previous run
  if [ -f "$NGROK_PID_FILE" ]; then
    kill "$(cat "$NGROK_PID_FILE")" 2>/dev/null || true
    rm -f "$NGROK_PID_FILE"
  fi

  # Check for static domain
  local NGROK_DOMAIN
  NGROK_DOMAIN=$(get_static_domain)

  if [ -n "$NGROK_DOMAIN" ] && [ "$NGROK_DOMAIN" != "your-domain.ngrok-free.app" ]; then
    log_info "Using static domain: $NGROK_DOMAIN"
    ngrok http --url="$NGROK_DOMAIN" 3000 --log=stdout > "$NGROK_LOG_FILE" 2>&1 &
  else
    log_warn "No static domain found in .env.ngrok — using random ngrok URL"
    log_warn "Copy .env.ngrok.example to .env.ngrok and set your static domain"
    ngrok http 3000 --log=stdout > "$NGROK_LOG_FILE" 2>&1 &
  fi
  echo $! > "$NGROK_PID_FILE"

  # Wait for ngrok to start
  log_info "Waiting for ngrok to initialize..."
  local NGROK_URL=""
  for _i in {1..30}; do
    sleep 1
    NGROK_URL=$(get_ngrok_url)
    if [ -n "$NGROK_URL" ]; then
      break
    fi
  done

  if [ -z "$NGROK_URL" ]; then
    log_error "Failed to start ngrok tunnel"
    cat "$NGROK_LOG_FILE" 2>/dev/null | tail -20 || true
    exit 1
  fi

  log_success "ngrok tunnel: $NGROK_URL"
}

# =============================================================================
# Update NEXT_PUBLIC_SITE_URL in .env.local
# =============================================================================
update_env_files() {
  local NGROK_URL
  NGROK_URL=$(get_ngrok_url)

  if [ -z "$NGROK_URL" ]; then
    log_warn "No ngrok URL available — skipping .env.local update"
    return
  fi

  local ENV_LOCAL="$REPO_ROOT/.env.local"

  if [ ! -f "$ENV_LOCAL" ]; then
    log_warn ".env.local not found — skipping update"
    return
  fi

  # Read current value
  local CURRENT_URL
  CURRENT_URL=$(grep "^NEXT_PUBLIC_SITE_URL=" "$ENV_LOCAL" 2>/dev/null | cut -d'=' -f2- || true)

  # Only update if the value has changed
  if [ "$CURRENT_URL" = "$NGROK_URL" ]; then
    log_info "NEXT_PUBLIC_SITE_URL already set to $NGROK_URL"
    return
  fi

  # Update or append the value
  if grep -q "^NEXT_PUBLIC_SITE_URL=" "$ENV_LOCAL" 2>/dev/null; then
    # Replace existing line (macOS-compatible sed)
    sed -i '' "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=$NGROK_URL|" "$ENV_LOCAL"
  else
    # Append to file
    echo "NEXT_PUBLIC_SITE_URL=$NGROK_URL" >> "$ENV_LOCAL"
  fi

  log_success "Updated NEXT_PUBLIC_SITE_URL=$NGROK_URL in .env.local"
}

# =============================================================================
# Start PDS container
# =============================================================================
start_pds() {
  # Already healthy? Skip.
  if pds_healthy; then
    log_success "PDS already running on http://localhost:3001"
    return
  fi

  local PDS_ENV_FILE="$PDS_DIR/.pds-local.env"

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
}

# =============================================================================
# Main
# =============================================================================
main() {
  log_info "Setting up local PDS + ngrok..."

  # Check prerequisites
  check_docker
  check_ngrok_installed
  check_ngrok_auth

  # Start services (each function skips if already running)
  start_ngrok
  start_pds
  update_env_files

  log_success "Local dev environment ready"
}

main "$@"
