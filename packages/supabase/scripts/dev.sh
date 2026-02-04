#!/bin/bash
# Supabase Log Tailer for Local Development
#
# Tails the Supabase API gateway (Kong) Docker logs.
# Runs as a persistent Turbo TUI panel after dev:setup completes.
#
# This script is called by `turbo run dev` via the @trainers/supabase workspace.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SUPABASE_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[Supabase]${NC} $1"; }
log_success() { echo -e "${GREEN}[Supabase]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[Supabase]${NC} $1"; }
log_error() { echo -e "${RED}[Supabase]${NC} $1"; }

# =============================================================================
# Skip in CI/Production environments
# =============================================================================
if [ -n "$CI" ] || [ -n "$VERCEL" ] || [ -n "$NETLIFY" ] || [ -n "$GITHUB_ACTIONS" ]; then
  exit 0
fi

# =============================================================================
# Check Supabase is running
# =============================================================================
cd "$SUPABASE_DIR"

# Find the Supabase CLI
if command -v supabase &>/dev/null; then
  SUPABASE_CMD="supabase"
else
  log_error "Supabase CLI not found."
  exit 1
fi

if ! $SUPABASE_CMD status >/dev/null 2>&1; then
  log_error "Supabase is not running. Run dev:setup first."
  exit 1
fi

# =============================================================================
# Print connection info
# =============================================================================
STATUS_JSON=$($SUPABASE_CMD status --output json 2>/dev/null || echo "{}")

API_URL=$(echo "$STATUS_JSON" | grep '"API_URL"' | sed 's/.*"API_URL": *"\([^"]*\)".*/\1/')
STUDIO_URL=$(echo "$STATUS_JSON" | grep '"STUDIO_URL"' | sed 's/.*"STUDIO_URL": *"\([^"]*\)".*/\1/')
DB_URL=$(echo "$STATUS_JSON" | grep '"DB_URL"' | sed 's/.*"DB_URL": *"\([^"]*\)".*/\1/')
INBUCKET_URL=$(echo "$STATUS_JSON" | grep '"INBUCKET_URL"' | sed 's/.*"INBUCKET_URL": *"\([^"]*\)".*/\1/')

echo ""
log_success "Local Supabase is running"
echo ""
echo -e "  ${BLUE}Studio:${NC}    ${STUDIO_URL:-http://127.0.0.1:54323}"
echo -e "  ${BLUE}API:${NC}       ${API_URL:-http://127.0.0.1:54321}"
echo -e "  ${BLUE}Database:${NC}  ${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
echo -e "  ${BLUE}Inbucket:${NC}  ${INBUCKET_URL:-http://127.0.0.1:54324}"
echo ""

# =============================================================================
# Find and tail the API gateway container
# =============================================================================
KONG_CONTAINER=$(docker ps --filter "name=supabase_kong" --format "{{.Names}}" 2>/dev/null | head -1)

if [ -n "$KONG_CONTAINER" ]; then
  log_success "Supabase is running — tailing API gateway logs ($KONG_CONTAINER)"
  echo ""
  exec docker logs -f --since 0s "$KONG_CONTAINER" 2>&1
else
  # Fallback: try to find any supabase container
  ANY_CONTAINER=$(docker ps --filter "name=supabase_" --format "{{.Names}}" 2>/dev/null | head -1)
  if [ -n "$ANY_CONTAINER" ]; then
    log_warn "Kong container not found, tailing $ANY_CONTAINER instead"
    echo ""
    exec docker logs -f --since 0s "$ANY_CONTAINER" 2>&1
  else
    log_error "No Supabase containers found."
    exit 1
  fi
fi
