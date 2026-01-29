#!/bin/bash
# Local PDS Setup Script
# Automatically starts ngrok + PDS and updates environment files
#
# This script is called by `pnpm dev` to ensure PDS is running

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PDS_DIR="$SCRIPT_DIR"

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

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker Desktop."
        exit 1
    fi
}

# Check if ngrok is installed
check_ngrok_installed() {
    if ! command -v ngrok &>/dev/null; then
        log_error "ngrok is not installed."
        echo ""
        echo "Install ngrok:"
        echo "  brew install ngrok    # macOS"
        echo "  choco install ngrok   # Windows"
        echo "  snap install ngrok    # Linux"
        echo ""
        exit 1
    fi
}

# Check if ngrok is authenticated
check_ngrok_auth() {
    if ! ngrok config check 2>/dev/null | grep -q "Valid"; then
        log_warn "ngrok is not authenticated."
        echo ""
        echo "To set up ngrok (one-time setup):"
        echo "  1. Sign up at https://ngrok.com (free)"
        echo "  2. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken"
        echo "  3. Run: ngrok config add-authtoken <your-token>"
        echo ""
        echo "Then run 'pnpm dev' again."
        exit 1
    fi
}

# Check if PDS is already running with correct hostname
check_pds_running() {
    if curl -s "http://localhost:3001/xrpc/_health" 2>/dev/null | grep -q "version"; then
        # PDS is running, check if ngrok is also running
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url // empty')
        if [ -n "$NGROK_URL" ]; then
            log_success "PDS already running at $NGROK_URL"
            update_env_files "$NGROK_URL"
            return 0
        fi
    fi
    return 1
}

# Start ngrok tunnel
start_ngrok() {
    local NGROK_PID_FILE="$PDS_DIR/.ngrok.pid"
    local NGROK_LOG_FILE="$PDS_DIR/.ngrok.log"
    
    # Kill any existing ngrok process
    if [ -f "$NGROK_PID_FILE" ]; then
        kill "$(cat "$NGROK_PID_FILE")" 2>/dev/null || true
        rm -f "$NGROK_PID_FILE"
    fi
    
    # Also kill any orphaned ngrok processes on port 3001
    pkill -f "ngrok http 3001" 2>/dev/null || true
    sleep 1
    
    log_info "Starting ngrok tunnel..."
    ngrok http 3001 --log=stdout > "$NGROK_LOG_FILE" 2>&1 &
    echo $! > "$NGROK_PID_FILE"
    
    # Wait for ngrok to start
    for i in {1..30}; do
        sleep 1
        NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url // empty')
        if [ -n "$NGROK_URL" ]; then
            break
        fi
    done
    
    if [ -z "$NGROK_URL" ]; then
        log_error "Failed to start ngrok tunnel"
        cat "$NGROK_LOG_FILE" 2>/dev/null || true
        exit 1
    fi
    
    log_success "ngrok tunnel: $NGROK_URL"
    
    # Save hostname for PDS
    NGROK_HOSTNAME="${NGROK_URL#https://}"
    echo "$NGROK_HOSTNAME" > "$PDS_DIR/.ngrok-hostname"
    echo "$NGROK_URL" > "$PDS_DIR/.ngrok-url"
}

# Start PDS container
start_pds() {
    local NGROK_HOSTNAME=$(cat "$PDS_DIR/.ngrok-hostname" 2>/dev/null)
    local PDS_ENV_FILE="$PDS_DIR/.pds-local.env"
    
    if [ -z "$NGROK_HOSTNAME" ]; then
        log_error "No ngrok hostname found"
        exit 1
    fi
    
    log_info "Starting PDS with hostname: $NGROK_HOSTNAME"
    
    # Stop any existing PDS container
    docker compose -f "$PDS_DIR/docker-compose.yml" down 2>/dev/null || true
    
    # Create environment file
    cat > "$PDS_ENV_FILE" << EOF
PDS_HOSTNAME=$NGROK_HOSTNAME
PDS_PORT=3000
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
EOF
    
    # Start PDS
    docker compose -f "$PDS_DIR/docker-compose.yml" --env-file "$PDS_ENV_FILE" up -d
    
    # Wait for PDS to be healthy
    log_info "Waiting for PDS to start..."
    for i in {1..30}; do
        sleep 1
        if curl -s "http://localhost:3001/xrpc/_health" 2>/dev/null | grep -q "version"; then
            break
        fi
    done
    
    if curl -s "http://localhost:3001/xrpc/_health" 2>/dev/null | grep -q "version"; then
        log_success "PDS is running!"
    else
        log_error "PDS failed to start"
        docker logs trainers-pds-local 2>&1 | tail -20
        exit 1
    fi
}

# Update environment files with ngrok URL
update_env_files() {
    local NGROK_URL="$1"
    
    # Update edge function .env
    local EDGE_ENV="$REPO_ROOT/packages/supabase/supabase/.env"
    if [ -f "$EDGE_ENV" ]; then
        # Update PDS_HOST line
        if grep -q "^PDS_HOST=" "$EDGE_ENV"; then
            sed -i.bak "s|^PDS_HOST=.*|PDS_HOST=$NGROK_URL|" "$EDGE_ENV"
            rm -f "${EDGE_ENV}.bak"
        fi
    else
        # Create the file
        cat > "$EDGE_ENV" << EOF
# Edge Function Secrets for Local Development
# Auto-generated by PDS setup script

PDS_HOST=$NGROK_URL
PDS_ADMIN_PASSWORD=localdevpassword
EOF
    fi
    
    # Update web app .env.local (only PDS_HOST line)
    local WEB_ENV="$REPO_ROOT/apps/web/.env.local"
    # Resolve symlink if it exists
    if [ -L "$WEB_ENV" ]; then
        WEB_ENV=$(readlink -f "$WEB_ENV" 2>/dev/null || readlink "$WEB_ENV")
        # Handle relative symlinks
        if [[ ! "$WEB_ENV" = /* ]]; then
            WEB_ENV="$REPO_ROOT/apps/web/$WEB_ENV"
        fi
    fi
    if [ -f "$WEB_ENV" ]; then
        if grep -q "^PDS_HOST=" "$WEB_ENV"; then
            sed -i.bak "s|^PDS_HOST=.*|PDS_HOST=$NGROK_URL|" "$WEB_ENV"
            rm -f "${WEB_ENV}.bak"
        fi
    fi
    
    log_success "Updated env files with PDS_HOST=$NGROK_URL"
}

# Main
main() {
    log_info "Setting up local PDS..."
    
    check_docker
    check_ngrok_installed
    check_ngrok_auth
    
    # Check if already running
    if check_pds_running; then
        return 0
    fi
    
    # Start ngrok and PDS
    start_ngrok
    start_pds
    
    # Update env files
    NGROK_URL=$(cat "$PDS_DIR/.ngrok-url")
    update_env_files "$NGROK_URL"

    # Setup OAuth credentials
    echo ""
    log_info "Setting up AT Protocol OAuth credentials..."
    if command -v node &>/dev/null; then
        # Run from repo root so Node can resolve @atproto/jwk-jose
        (cd "$REPO_ROOT" && node "$PDS_DIR/scripts/setup-oauth.mjs")
        if [ $? -ne 0 ]; then
            log_warn "OAuth setup failed, but PDS is running"
            log_warn "Bluesky login will not work until OAuth is configured"
        fi
    else
        log_warn "Node.js not found, skipping OAuth setup"
        log_warn "Bluesky login will not work without OAuth credentials"
    fi

    echo ""
    log_success "Local PDS ready at $NGROK_URL"
    echo ""
}

main "$@"
