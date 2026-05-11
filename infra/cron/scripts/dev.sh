#!/bin/bash
# =============================================================================
# Local Cron Runner
# =============================================================================
# Simulates Vercel cron jobs locally by polling API routes on their schedules.
# Runs as a persistent Turbo TUI panel during `pnpm dev`.
#
# Schedules (matching vercel.json):
#   - /api/cron/limitless-sync:   every 5 minutes
#   - /api/cron/limitless-import: every 15 minutes (batch=5)
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
DIM='\033[2m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[cron]${NC} $1"; }
log_success() { echo -e "${GREEN}[cron]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[cron]${NC} $1"; }
log_error() { echo -e "${RED}[cron]${NC} $1"; }
log_dim() { echo -e "${DIM}[cron] $1${NC}"; }

# =============================================================================
# Configuration
# =============================================================================
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.local"

# Source cron-specific vars from .env.local (if present)
if [ -f "$ENV_FILE" ]; then
  for var in CRON_SYNC_INTERVAL CRON_IMPORT_INTERVAL CRON_IMPORT_BATCH CRON_BASE_URL; do
    val=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2-)
    if [ -n "$val" ]; then
      export "$var=$val"
    fi
  done
fi

BASE_URL="${CRON_BASE_URL:-http://localhost:3000}"
SYNC_INTERVAL="${CRON_SYNC_INTERVAL:-300}"       # 5 minutes (seconds)
IMPORT_INTERVAL="${CRON_IMPORT_INTERVAL:-900}"   # 15 minutes (seconds)
IMPORT_BATCH="${CRON_IMPORT_BATCH:-5}"           # Tournaments per import run

# Wait for .env.local to have CRON_SECRET (setup-local.sh may still be running)
log_info "Waiting for CRON_SECRET in .env.local..."
attempts=0
max_attempts=30
CRON_SECRET=""

while [ $attempts -lt $max_attempts ]; do
  if [ -f "$ENV_FILE" ]; then
    CRON_SECRET=$(grep "^CRON_SECRET=" "$ENV_FILE" 2>/dev/null | cut -d'=' -f2-)
  fi
  if [ -n "$CRON_SECRET" ]; then
    break
  fi
  attempts=$((attempts + 1))
  sleep 2
done

if [ -z "$CRON_SECRET" ]; then
  log_error "CRON_SECRET not found in .env.local after ${max_attempts} attempts"
  log_error "Add CRON_SECRET=<any-value> to .env.local manually."
  exit 1
fi

log_success "CRON_SECRET loaded"

AUTH_HEADER="Authorization: Bearer $CRON_SECRET"

# =============================================================================
# Wait for Next.js to be ready
# =============================================================================
wait_for_server() {
  log_info "Waiting for Next.js server at $BASE_URL..."
  local attempts=0
  local max_attempts=60

  while [ $attempts -lt $max_attempts ]; do
    if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" 2>/dev/null | grep -q "^[23]"; then
      log_success "Server is ready"
      return 0
    fi
    attempts=$((attempts + 1))
    sleep 2
  done

  log_error "Server did not become ready after ${max_attempts} attempts"
  exit 1
}

# =============================================================================
# Run a cron job
# =============================================================================
run_cron() {
  local name="$1"
  local path="$2"
  local start_time
  start_time=$(date +%s)

  log_info "Running $name..."

  local response
  local http_code
  response=$(curl -s -w "\n%{http_code}" -H "$AUTH_HEADER" "${BASE_URL}${path}")
  http_code=$(echo "$response" | tail -1)
  local body
  body=$(echo "$response" | sed '$d')

  local end_time
  end_time=$(date +%s)
  local duration=$((end_time - start_time))

  if [ -z "$http_code" ]; then
    log_error "$name failed (${duration}s) — curl returned no response"
  elif [[ "$http_code" == 2* ]]; then
    log_success "$name completed (${duration}s) — HTTP $http_code"
    log_dim "$body"
  else
    log_error "$name failed (${duration}s) — HTTP $http_code"
    log_error "$body"
  fi
}

# =============================================================================
# Main loop
# =============================================================================
main() {
  echo ""
  log_info "========================================="
  log_info "  Local Cron Runner"
  log_info "========================================="
  echo ""
  log_info "Sync interval:   ${SYNC_INTERVAL}s ($(( SYNC_INTERVAL / 60 ))m)"
  log_info "Import interval: ${IMPORT_INTERVAL}s ($(( IMPORT_INTERVAL / 60 ))m)"
  log_info "Import batch:    ${IMPORT_BATCH}"
  log_info "Base URL:        ${BASE_URL}"
  echo ""

  wait_for_server

  # Run sync immediately on startup
  run_cron "limitless-sync" "/api/cron/limitless-sync"

  local last_sync
  last_sync=$(date +%s)
  local last_import
  last_import=0  # Run import on first cycle

  while true; do
    sleep 10  # Check every 10 seconds

    local now
    now=$(date +%s)

    # Sync check
    if [ $((now - last_sync)) -ge "$SYNC_INTERVAL" ]; then
      run_cron "limitless-sync" "/api/cron/limitless-sync"
      last_sync=$now
    fi

    # Import check
    if [ $((now - last_import)) -ge "$IMPORT_INTERVAL" ]; then
      run_cron "limitless-import" "/api/cron/limitless-import?batch=${IMPORT_BATCH}"
      last_import=$now
    fi
  done
}

main "$@"
