#!/bin/bash
# ngrok Tunnel for Local Development
#
# Runs ngrok in the foreground as a Turbo TUI panel.
# A background subshell updates NEXT_PUBLIC_SITE_URL in .env.local
# once the tunnel URL is available.
#
# This script is called by `turbo run dev` via the @trainers/ngrok workspace.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$PKG_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[ngrok]${NC} $1"; }
log_success() { echo -e "${GREEN}[ngrok]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[ngrok]${NC} $1"; }
log_error() { echo -e "${RED}[ngrok]${NC} $1"; }

# =============================================================================
# Skip in CI/Production environments
# =============================================================================
if [ -n "$CI" ] || [ -n "$VERCEL" ] || [ -n "$NETLIFY" ] || [ -n "$GITHUB_ACTIONS" ]; then
  exit 0
fi

# =============================================================================
# Helpers
# =============================================================================

get_static_domain() {
  local ENV_NGROK="$REPO_ROOT/.env.ngrok"
  if [ -f "$ENV_NGROK" ]; then
    grep "^NGROK_STATIC_DOMAIN=" "$ENV_NGROK" 2>/dev/null | cut -d'=' -f2-
  fi
}

get_ngrok_url() {
  curl -s http://localhost:4040/api/tunnels 2>/dev/null | grep -o '"public_url":"[^"]*"' | head -1 | cut -d'"' -f4
}

update_env_with_url() {
  local NGROK_URL="$1"
  local ENV_LOCAL="$REPO_ROOT/.env.local"

  if [ -z "$NGROK_URL" ]; then
    return
  fi

  if [ ! -f "$ENV_LOCAL" ]; then
    log_warn ".env.local not found — skipping URL update"
    return
  fi

  # Read current value
  local CURRENT_URL
  CURRENT_URL=$(grep "^NEXT_PUBLIC_SITE_URL=" "$ENV_LOCAL" 2>/dev/null | cut -d'=' -f2- || true)

  if [ "$CURRENT_URL" = "$NGROK_URL" ]; then
    log_info "NEXT_PUBLIC_SITE_URL already set to $NGROK_URL"
    return
  fi

  # Update or append
  if grep -q "^NEXT_PUBLIC_SITE_URL=" "$ENV_LOCAL" 2>/dev/null; then
    sed -i '' "s|^NEXT_PUBLIC_SITE_URL=.*|NEXT_PUBLIC_SITE_URL=$NGROK_URL|" "$ENV_LOCAL"
  else
    echo "NEXT_PUBLIC_SITE_URL=$NGROK_URL" >> "$ENV_LOCAL"
  fi

  log_success "Updated NEXT_PUBLIC_SITE_URL=$NGROK_URL"
}

# =============================================================================
# Check prerequisites (exit 0 on failure — ngrok is optional, don't block other tasks)
# =============================================================================
if ! command -v ngrok &>/dev/null; then
  log_warn "ngrok is not installed — skipping tunnel"
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
  exit 0
fi

# Auth check removed — unreliable across shell environments (Turbo TUI, pnpm).
# If ngrok isn't authenticated, it will fail to start and show the error in the panel.

# =============================================================================
# Detect ngrok config file (Turbo TUI may resolve paths differently)
# =============================================================================
NGROK_CONFIG_FLAG=""
for _cfg in \
  "$HOME/.config/ngrok/ngrok.yml" \
  "$HOME/Library/Application Support/ngrok/ngrok.yml" \
  "$HOME/.ngrok2/ngrok.yml"; do
  if [ -f "$_cfg" ]; then
    NGROK_CONFIG_FLAG="--config=$_cfg"
    log_info "Using ngrok config: $_cfg"
    break
  fi
done

# =============================================================================
# If ngrok is already running, show status and tail log
# =============================================================================
EXISTING_URL=$(get_ngrok_url)
if [ -n "$EXISTING_URL" ]; then
  log_success "ngrok already running: $EXISTING_URL"
  update_env_with_url "$EXISTING_URL"

  # Keep panel alive — tail the ngrok log if it exists, otherwise wait
  PDS_NGROK_LOG="$REPO_ROOT/infra/pds/.ngrok.log"
  if [ -f "$PDS_NGROK_LOG" ]; then
    exec tail -f "$PDS_NGROK_LOG"
  else
    log_info "Tunnel active. Waiting..."
    exec sleep infinity
  fi
fi

# =============================================================================
# Kill stale ngrok process from a previous run
# =============================================================================
PDS_NGROK_PID="$REPO_ROOT/infra/pds/.ngrok.pid"
if [ -f "$PDS_NGROK_PID" ]; then
  kill "$(cat "$PDS_NGROK_PID")" 2>/dev/null || true
  rm -f "$PDS_NGROK_PID"
fi

# =============================================================================
# Background: poll for URL and update .env.local
# =============================================================================
(
  for _i in {1..30}; do
    sleep 1
    URL=$(get_ngrok_url)
    if [ -n "$URL" ]; then
      update_env_with_url "$URL"
      break
    fi
  done
) &

# =============================================================================
# Foreground: start ngrok (blocks, output visible in TUI panel)
# =============================================================================
NGROK_DOMAIN=$(get_static_domain)

if [ -n "$NGROK_DOMAIN" ] && [ "$NGROK_DOMAIN" != "your-domain.ngrok-free.app" ]; then
  log_info "Starting ngrok tunnel with static domain: $NGROK_DOMAIN"
  ngrok http --url="$NGROK_DOMAIN" 3000 --log=stdout $NGROK_CONFIG_FLAG || {
    log_error "ngrok exited — tunnel is unavailable (non-fatal)"
    exit 0
  }
else
  log_warn "No static domain found in .env.ngrok — using random ngrok URL"
  log_warn "Copy .env.ngrok.example to .env.ngrok and set your static domain"
  ngrok http 3000 --log=stdout $NGROK_CONFIG_FLAG || {
    log_error "ngrok exited — tunnel is unavailable (non-fatal)"
    exit 0
  }
fi
