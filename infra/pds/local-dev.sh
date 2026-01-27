#!/bin/bash
# Local PDS Development with ngrok
#
# This script starts a local PDS with ngrok providing HTTPS.
# The PDS requires HTTPS for OAuth and federation.
#
# Prerequisites:
#   - Docker running
#   - ngrok installed and authenticated (ngrok config add-authtoken <token>)
#
# Usage:
#   ./local-dev.sh start    # Start ngrok + PDS
#   ./local-dev.sh stop     # Stop everything
#   ./local-dev.sh status   # Show current status
#   ./local-dev.sh url      # Show the current ngrok URL

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGROK_PID_FILE="$SCRIPT_DIR/.ngrok.pid"
NGROK_LOG_FILE="$SCRIPT_DIR/.ngrok.log"
PDS_ENV_FILE="$SCRIPT_DIR/.pds-local.env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_warn() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

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

start_ngrok() {
    log_info "Starting ngrok tunnel on port 3001..."
    
    # Kill any existing ngrok process
    if [ -f "$NGROK_PID_FILE" ]; then
        kill "$(cat "$NGROK_PID_FILE")" 2>/dev/null || true
        rm "$NGROK_PID_FILE"
    fi
    
    # Start ngrok in background
    ngrok http 3001 --log=stdout > "$NGROK_LOG_FILE" 2>&1 &
    echo $! > "$NGROK_PID_FILE"
    
    # Wait for ngrok to start and get URL
    log_info "Waiting for ngrok to initialize..."
    for i in {1..30}; do
        sleep 1
        NGROK_URL=$(get_ngrok_url)
        if [ -n "$NGROK_URL" ]; then
            break
        fi
    done
    
    if [ -z "$NGROK_URL" ]; then
        log_error "Failed to get ngrok URL"
        cat "$NGROK_LOG_FILE"
        exit 1
    fi
    
    log_success "ngrok tunnel: $NGROK_URL"
    
    # Extract hostname (remove https://)
    NGROK_HOSTNAME="${NGROK_URL#https://}"
    echo "$NGROK_HOSTNAME" > "$SCRIPT_DIR/.ngrok-hostname"
    echo "$NGROK_URL" > "$SCRIPT_DIR/.ngrok-url"
}

start_pds() {
    NGROK_HOSTNAME=$(cat "$SCRIPT_DIR/.ngrok-hostname" 2>/dev/null)
    
    if [ -z "$NGROK_HOSTNAME" ]; then
        log_error "No ngrok hostname found. Run 'start_ngrok' first."
        exit 1
    fi
    
    log_info "Starting PDS with hostname: $NGROK_HOSTNAME"
    
    # Stop any existing PDS container
    docker compose -f "$SCRIPT_DIR/docker-compose.yml" down 2>/dev/null || true
    
    # Create environment file for docker-compose
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
        log_success "PDS is running!"
    else
        log_error "PDS failed to start. Check logs with: docker logs trainers-pds-local"
        exit 1
    fi
}

show_status() {
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  Local PDS Development Status"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    # ngrok status
    NGROK_URL=$(get_ngrok_url)
    if [ -n "$NGROK_URL" ]; then
        log_success "ngrok: $NGROK_URL"
    else
        log_warn "ngrok: not running"
    fi
    
    # PDS status
    if curl -s "http://localhost:3001/xrpc/_health" 2>/dev/null | grep -q "version"; then
        PDS_VERSION=$(curl -s "http://localhost:3001/xrpc/_health" | jq -r '.version')
        log_success "PDS: running (v$PDS_VERSION)"
    else
        log_warn "PDS: not running"
    fi
    
    echo ""
    
    if [ -n "$NGROK_URL" ]; then
        echo "Configuration for local development:"
        echo ""
        echo "  Web app (.env.local):"
        echo "    PDS_HOST=$NGROK_URL"
        echo "    PDS_ADMIN_PASSWORD=localdevpassword"
        echo ""
        echo "  Edge functions (packages/supabase/supabase/.env):"
        echo "    PDS_HOST=$NGROK_URL"
        echo "    PDS_ADMIN_PASSWORD=localdevpassword"
        echo ""
        echo "  Test health:"
        echo "    curl $NGROK_URL/xrpc/_health"
        echo ""
    fi
}

cmd_start() {
    log_info "Starting local PDS development environment..."
    echo ""
    
    check_ngrok_auth
    start_ngrok
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
    rm -f "$SCRIPT_DIR/.ngrok-hostname" "$SCRIPT_DIR/.ngrok-url" "$NGROK_LOG_FILE" "$PDS_ENV_FILE"
}

cmd_url() {
    NGROK_URL=$(get_ngrok_url)
    if [ -n "$NGROK_URL" ]; then
        echo "$NGROK_URL"
    else
        log_error "ngrok is not running"
        exit 1
    fi
}

cmd_logs() {
    docker logs -f trainers-pds-local
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
    *)
        echo "Local PDS Development"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  start   Start ngrok + PDS"
        echo "  stop    Stop everything"
        echo "  status  Show current status"
        echo "  url     Print the current ngrok URL"
        echo "  logs    Follow PDS container logs"
        echo ""
        echo "Prerequisites:"
        echo "  - Docker must be running"
        echo "  - ngrok must be installed and authenticated"
        echo "    Run: ngrok config add-authtoken <your-token>"
        echo ""
        ;;
esac
