#!/bin/bash
# Local PDS Development with ngrok
#
# This script manages the local PDS Docker container and optional ngrok tunnels.
# The PDS runs on localhost:3001. ngrok is only needed for OAuth testing.
#
# Prerequisites:
#   - Docker running
#   - ngrok installed and authenticated (for tunnel command)
#
# Usage:
#   ./local-dev.sh start    # Start PDS (Docker only, no ngrok)
#   ./local-dev.sh stop     # Stop everything
#   ./local-dev.sh status   # Show current status
#   ./local-dev.sh url      # Show the current ngrok URL
#   ./local-dev.sh logs     # Follow PDS container logs
#   ./local-dev.sh tunnel   # Start ngrok tunnel with static domain for web app

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
NGROK_PID_FILE="$SCRIPT_DIR/.ngrok.pid"
NGROK_LOG_FILE="$SCRIPT_DIR/.ngrok.log"
PDS_ENV_FILE="$SCRIPT_DIR/.pds-local.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[PDS]${NC} $1"; }
log_success() { echo -e "${GREEN}[PDS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[PDS]${NC} $1"; }
log_error() { echo -e "${RED}[PDS]${NC} $1"; }

check_ngrok_auth() {
    if ! ngrok config check 2>/dev/null | grep -q "Valid"; then
        log_error "ngrok is not authenticated"
        echo ""
        echo "To authenticate ngrok:"
        echo "  1. Sign up at https://ngrok.com"
        echo "  2. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken"
        echo "  3. Run: ngrok config add-authtoken <your-token>"
        echo ""
        exit 1
    fi
}

get_ngrok_url() {
    curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url // empty'
}

# Read static domain from .env.ngrok
get_static_domain() {
    local ENV_NGROK="$REPO_ROOT/.env.ngrok"
    if [ -f "$ENV_NGROK" ]; then
        grep "^NGROK_STATIC_DOMAIN=" "$ENV_NGROK" 2>/dev/null | cut -d'=' -f2-
    fi
}

start_ngrok() {
    log_info "Starting ngrok tunnel for web app (port 3000)..."

    # Kill any existing ngrok process
    if [ -f "$NGROK_PID_FILE" ]; then
        kill "$(cat "$NGROK_PID_FILE")" 2>/dev/null || true
        rm "$NGROK_PID_FILE"
    fi

    # Check for static domain
    local NGROK_DOMAIN
    NGROK_DOMAIN=$(get_static_domain)

    if [ -n "$NGROK_DOMAIN" ]; then
        log_info "Using static domain: $NGROK_DOMAIN"
        ngrok http --url="$NGROK_DOMAIN" 3000 --log=stdout > "$NGROK_LOG_FILE" 2>&1 &
    else
        log_warn "No static domain found in .env.ngrok, using random ngrok URL"
        log_warn "Copy .env.ngrok.example to .env.ngrok and set your static domain"
        ngrok http 3000 --log=stdout > "$NGROK_LOG_FILE" 2>&1 &
    fi
    echo $! > "$NGROK_PID_FILE"

    # Wait for ngrok to start and get URL
    log_info "Waiting for ngrok to initialize..."
    local NGROK_URL=""
    for i in {1..30}; do
        sleep 1
        NGROK_URL=$(get_ngrok_url)
        if [ -n "$NGROK_URL" ]; then
            break
        fi
    done

    if [ -z "$NGROK_URL" ]; then
        log_error "Failed to get ngrok URL"
        cat "$NGROK_LOG_FILE" 2>/dev/null || true
        exit 1
    fi

    log_success "Web tunnel: $NGROK_URL"

    # Save URL for reference
    echo "$NGROK_URL" > "$SCRIPT_DIR/.ngrok-web-url"
}

start_pds() {
    log_info "Starting PDS (Docker)..."

    # Stop any existing PDS container
    docker compose -f "$SCRIPT_DIR/docker-compose.yml" down 2>/dev/null || true

    # Create environment file for docker-compose
    cat > "$PDS_ENV_FILE" << EOF
PDS_HOSTNAME=localhost
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
PDS_HANDLE_DOMAINS=.trainers.gg,.bsky.social
EOF

    # Start PDS with the env file
    docker compose -f "$SCRIPT_DIR/docker-compose.yml" --env-file "$PDS_ENV_FILE" up -d

    log_info "Waiting for PDS to start..."
    for i in {1..30}; do
        sleep 1
        if curl -s "http://localhost:3001/xrpc/_health" 2>/dev/null | grep -q "version"; then
            break
        fi
    done

    if curl -s "http://localhost:3001/xrpc/_health" 2>/dev/null | grep -q "version"; then
        log_success "PDS is running on http://localhost:3001"
    else
        log_error "PDS failed to start. Check logs with: docker logs trainers-pds-local"
        exit 1
    fi
}

show_status() {
    echo ""
    echo "==============================================================="
    echo "  Local PDS Development Status"
    echo "==============================================================="
    echo ""

    # ngrok status
    NGROK_URL=$(get_ngrok_url)
    if [ -n "$NGROK_URL" ]; then
        log_success "ngrok: $NGROK_URL"
    else
        log_warn "ngrok: not running (use './local-dev.sh tunnel' to start)"
    fi

    # PDS status
    if curl -s "http://localhost:3001/xrpc/_health" 2>/dev/null | grep -q "version"; then
        PDS_VERSION=$(curl -s "http://localhost:3001/xrpc/_health" | jq -r '.version')
        log_success "PDS: running (v$PDS_VERSION) at http://localhost:3001"
    else
        log_warn "PDS: not running"
    fi

    # Static domain info
    local NGROK_DOMAIN
    NGROK_DOMAIN=$(get_static_domain)
    if [ -n "$NGROK_DOMAIN" ]; then
        log_info "Static domain: $NGROK_DOMAIN"
    else
        log_warn "No static domain configured (see .env.ngrok.example)"
    fi

    echo ""

    echo "  Edge functions reach PDS at: http://host.docker.internal:3001"
    echo "  Test PDS health: curl http://localhost:3001/xrpc/_health"
    echo ""
}

cmd_start() {
    log_info "Starting local PDS development environment..."
    echo ""

    start_pds

    echo ""
    show_status
}

cmd_stop() {
    log_info "Stopping local PDS development environment..."

    # Stop PDS
    docker compose -f "$SCRIPT_DIR/docker-compose.yml" down 2>/dev/null || true
    log_success "PDS stopped"

    # Stop ngrok
    if [ -f "$NGROK_PID_FILE" ]; then
        kill "$(cat "$NGROK_PID_FILE")" 2>/dev/null || true
        rm "$NGROK_PID_FILE"
        log_success "ngrok stopped"
    fi

    # Clean up files
    rm -f "$SCRIPT_DIR/.ngrok-hostname" "$SCRIPT_DIR/.ngrok-url" "$SCRIPT_DIR/.ngrok-web-url" "$NGROK_LOG_FILE" "$PDS_ENV_FILE"
}

cmd_url() {
    NGROK_URL=$(get_ngrok_url)
    if [ -n "$NGROK_URL" ]; then
        echo "$NGROK_URL"
    else
        log_error "ngrok is not running. Start it with: ./local-dev.sh tunnel"
        exit 1
    fi
}

cmd_logs() {
    docker logs -f trainers-pds-local
}

cmd_tunnel() {
    log_info "Starting ngrok tunnel for web app..."
    echo ""

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

    check_ngrok_auth
    start_ngrok

    echo ""
    log_info "ngrok tunnel is running. Press Ctrl+C to stop."
    log_info "Web app available at: $(get_ngrok_url)"
    echo ""

    # Wait for the ngrok process to exit
    if [ -f "$NGROK_PID_FILE" ]; then
        wait "$(cat "$NGROK_PID_FILE")" 2>/dev/null || true
    fi
}

# Main command handler
case "${1:-}" in
    start)
        cmd_start
        ;;
    stop)
        cmd_stop
        ;;
    status)
        show_status
        ;;
    url)
        cmd_url
        ;;
    logs)
        cmd_logs
        ;;
    tunnel)
        cmd_tunnel
        ;;
    *)
        echo "Local PDS Development"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  start   Start PDS (Docker only, no ngrok)"
        echo "  stop    Stop PDS and ngrok"
        echo "  status  Show current status"
        echo "  url     Print the current ngrok URL"
        echo "  logs    Follow PDS container logs"
        echo "  tunnel  Start ngrok tunnel with static domain for web app"
        echo ""
        echo "Prerequisites:"
        echo "  - Docker must be running"
        echo "  - ngrok is only needed for the 'tunnel' command"
        echo "    Configure: cp .env.ngrok.example .env.ngrok"
        echo ""
        ;;
esac
