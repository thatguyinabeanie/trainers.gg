#!/bin/bash
# =============================================================================
# Dev Slot Claim Script
# =============================================================================
# Runs before `turbo run dev` to claim a unique port range.
#
# 1. Scans slots (0, 1, 2, ...) until a free one is found
# 2. Writes lockfile to ~/.local/state/trainers.gg/dev-slots/slot-N.lock
# 3. Writes slot number to .dev-slot
# 4. Rewrites .env.local with slot-specific ports
# 5. Modifies Supabase config.toml for slot > 0 (backs up original)
# 6. Registers cleanup trap to release slot on exit
#
# A slot is "free" when:
#   - No lockfile exists, OR lockfile exists but PID is dead (stale)
#   - AND the slot's key ports (web, supabase API, postgres) are not in use
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source the shared library
source "$SCRIPT_DIR/lib/dev-slots.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[dev-slot]${NC} $1" >&2; }
log_success() { echo -e "${GREEN}[dev-slot]${NC} $1" >&2; }
log_warn() { echo -e "${YELLOW}[dev-slot]${NC} $1" >&2; }

# =============================================================================
# Skip in CI/Production environments
# =============================================================================
if [ -n "$CI" ] || [ -n "$VERCEL" ] || [ -n "$GITHUB_ACTIONS" ]; then
  echo "0" > "$ROOT_DIR/.dev-slot"
  exit 0
fi

# =============================================================================
# Ensure lockfile directory exists
# =============================================================================
mkdir -p "$DEV_SLOT_DIR"

# =============================================================================
# Restore Supabase config.toml if a previous run left a backup
# =============================================================================
SUPABASE_CONFIG="$ROOT_DIR/packages/supabase/supabase/config.toml"
SUPABASE_CONFIG_BACKUP="$ROOT_DIR/packages/supabase/supabase/config.toml.slot-backup"

if [ -f "$SUPABASE_CONFIG_BACKUP" ]; then
  log_info "Restoring Supabase config.toml from previous slot backup"
  cp "$SUPABASE_CONFIG_BACKUP" "$SUPABASE_CONFIG"
  rm "$SUPABASE_CONFIG_BACKUP"
fi

# Always reset config.toml to slot-0 defaults before evaluating slots.
# This catches cases where slot-specific values were accidentally committed
# or a backup file was lost. The slot-specific rewrite (below) will re-apply
# the correct values for the chosen slot.
if [ -f "$SUPABASE_CONFIG" ]; then
  needs_reset=false
  grep -q 'project_id = "supabase-slot-' "$SUPABASE_CONFIG" && needs_reset=true
  # Check if API port is not the default 54321 (indicates leftover slot config)
  grep -q '^port = 54321' "$SUPABASE_CONFIG" || needs_reset=true

  if [ "$needs_reset" = "true" ]; then
    log_warn "config.toml has non-default values — resetting to slot-0 defaults"
    sed -i '' 's/project_id = "supabase-slot-[0-9]*"/project_id = "supabase"/' "$SUPABASE_CONFIG"
    # Reset all ports to slot-0 defaults using git checkout
    git checkout -- "$SUPABASE_CONFIG" 2>/dev/null || true
  fi
fi

# =============================================================================
# Reuse existing slot if one is active for this worktree
# =============================================================================
reuse_existing_slot() {
  local slot_file="$ROOT_DIR/.dev-slot"
  [ -f "$slot_file" ] || return 1

  local existing_slot
  existing_slot=$(cat "$slot_file")
  local lockfile="$DEV_SLOT_DIR/slot-${existing_slot}.lock"
  [ -f "$lockfile" ] || return 1

  local lock_pid
  lock_pid=$(grep -o '"pid": *[0-9]*' "$lockfile" 2>/dev/null | grep -o '[0-9]*')
  local lock_worktree
  lock_worktree=$(grep -o '"worktree": *"[^"]*"' "$lockfile" 2>/dev/null | sed 's/.*"worktree": *"\([^"]*\)".*/\1/')

  if [ "$lock_worktree" = "$ROOT_DIR" ] && is_pid_alive "$lock_pid"; then
    echo "$existing_slot"
    return 0
  fi

  return 1
}

# =============================================================================
# Clean up orphaned Supabase containers
# =============================================================================
# Scan for Supabase Docker containers whose lockfile PID is dead.
# These are leftovers from dev servers that exited without cleanup (kill -9, crash).
cleanup_orphaned_supabase() {
  local occupied_slots
  occupied_slots=$(list_occupied_slots)
  [ -n "$occupied_slots" ] || return 0

  for occupied_slot in $occupied_slots; do
    local lockfile="$DEV_SLOT_DIR/slot-${occupied_slot}.lock"
    if [ -f "$lockfile" ]; then
      local lock_pid
      lock_pid=$(grep -o '"pid": *[0-9]*' "$lockfile" 2>/dev/null | grep -o '[0-9]*')
      if [ -n "$lock_pid" ] && is_pid_alive "$lock_pid"; then
        continue  # Legitimately in use by a running dev server
      fi
    fi
    # No lockfile or dead PID — orphaned containers
    log_info "Cleaning up orphaned Supabase containers for slot $occupied_slot"
    stop_slot_supabase "$occupied_slot"
    rm -f "$DEV_SLOT_DIR/slot-${occupied_slot}.lock"
  done
}

# =============================================================================
# Detect slot from running Supabase Docker containers
# =============================================================================
# If Supabase Docker containers survived a previous session (e.g., crash
# without cleanup trap), detect which slot they belong to and reuse it.
detect_running_supabase_slot() {
  local occupied_slots
  occupied_slots=$(list_occupied_slots)
  [ -n "$occupied_slots" ] || return 1

  # First: look for containers that match THIS worktree's lockfile
  for occupied_slot in $occupied_slots; do
    local lockfile="$DEV_SLOT_DIR/slot-${occupied_slot}.lock"
    if [ -f "$lockfile" ]; then
      local lock_worktree
      lock_worktree=$(grep -o '"worktree": *"[^"]*"' "$lockfile" 2>/dev/null \
        | sed 's/.*"worktree": *"\([^"]*\)".*/\1/')
      if [ "$lock_worktree" = "$ROOT_DIR" ]; then
        local web_port
        web_port=$(slot_port "$PORT_BASE_WEB" "$occupied_slot")
        if is_port_free "$web_port"; then
          echo "$occupied_slot"
          return 0
        fi
      fi
    fi
  done

  # Fallback: if only one Supabase instance is running (regardless of which
  # worktree started it), adopt it. Common case: single dev, server exited
  # without cleanup, or a different worktree started it but is no longer running.
  local count
  count=$(echo "$occupied_slots" | wc -w | tr -d ' ')
  if [ "$count" -eq 1 ]; then
    local solo_slot
    solo_slot=$(echo "$occupied_slots" | head -1)
    local web_port
    web_port=$(slot_port "$PORT_BASE_WEB" "$solo_slot")
    if is_port_free "$web_port"; then
      log_info "Found orphaned Supabase on slot $solo_slot — adopting it"
      echo "$solo_slot"
      return 0
    fi
  fi

  # Fallback 2: if multiple orphaned instances exist, clean up ones whose
  # lockfile PID is dead and try to adopt the remaining one
  local alive_slots=""
  local alive_count=0
  for occupied_slot in $occupied_slots; do
    local lockfile="$DEV_SLOT_DIR/slot-${occupied_slot}.lock"
    local is_alive=false
    if [ -f "$lockfile" ]; then
      local lock_pid
      lock_pid=$(grep -o '"pid": *[0-9]*' "$lockfile" 2>/dev/null | grep -o '[0-9]*')
      if [ -n "$lock_pid" ] && is_pid_alive "$lock_pid"; then
        is_alive=true
      fi
    fi
    if [ "$is_alive" = "false" ]; then
      alive_slots="$alive_slots $occupied_slot"
      alive_count=$((alive_count + 1))
    fi
  done

  # If there's exactly one orphaned slot, adopt it
  if [ "$alive_count" -eq 1 ]; then
    local orphan_slot
    orphan_slot=$(echo "$alive_slots" | tr -d ' ')
    local web_port
    web_port=$(slot_port "$PORT_BASE_WEB" "$orphan_slot")
    if is_port_free "$web_port"; then
      log_info "Found orphaned Supabase on slot $orphan_slot (from another worktree) — adopting it"
      echo "$orphan_slot"
      return 0
    fi
  fi

  return 1
}

# =============================================================================
# Find a free slot
# =============================================================================
claim_slot() {
  local slot=0

  while true; do
    local lockfile="$DEV_SLOT_DIR/slot-${slot}.lock"

    # Check lockfile — PID-alive slots are in use
    if [ -f "$lockfile" ]; then
      local lock_pid
      lock_pid=$(grep -o '"pid": *[0-9]*' "$lockfile" 2>/dev/null | grep -o '[0-9]*')

      if [ -n "$lock_pid" ] && is_pid_alive "$lock_pid"; then
        slot=$((slot + 1))
        continue
      else
        log_info "Removing stale lockfile for slot $slot (PID $lock_pid is dead)"
        rm -f "$lockfile"
      fi
    fi

    # Docker is the authority for Supabase occupancy
    if is_slot_occupied "$slot"; then
      log_info "Slot $slot has running Supabase containers, trying next"
      slot=$((slot + 1))
      continue
    fi

    # Check web port separately (Docker only tracks Supabase, not Next.js)
    local web_port
    web_port=$(slot_port "$PORT_BASE_WEB" "$slot")
    if ! is_port_free "$web_port"; then
      log_info "Slot $slot web port $web_port in use, trying next"
      slot=$((slot + 1))
      continue
    fi

    # Claim it — atomic write via mkdir trick
    local claim_dir="$DEV_SLOT_DIR/.claiming-slot-${slot}"
    if mkdir "$claim_dir" 2>/dev/null; then
      cat > "$lockfile" << EOF
{
  "pid": $$,
  "worktree": "$ROOT_DIR",
  "claimedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
      rmdir "$claim_dir"
      echo "$slot"
      return 0
    else
      slot=$((slot + 1))
      continue
    fi
  done
}

REUSE_SLOT=false
if SLOT=$(reuse_existing_slot); then
  log_info "Reusing active slot $SLOT for this worktree"
  REUSE_SLOT=true
elif SLOT=$(detect_running_supabase_slot); then
  log_info "Detected running Supabase on slot $SLOT — adopting it"
  # Write lockfile for the detected slot
  LOCKFILE="$DEV_SLOT_DIR/slot-${SLOT}.lock"
  cat > "$LOCKFILE" << EOF
{
  "pid": $$,
  "worktree": "$ROOT_DIR",
  "claimedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
  echo "$SLOT" > "$ROOT_DIR/.dev-slot"
else
  # No existing slot or running Supabase to adopt — clean up any orphaned
  # containers before claiming a fresh slot
  cleanup_orphaned_supabase
  SLOT=$(claim_slot)
  log_success "Claimed dev slot $SLOT"
  echo "$SLOT" > "$ROOT_DIR/.dev-slot"
fi

# =============================================================================
# Calculate all ports
# =============================================================================
WEB_PORT=$(slot_port "$PORT_BASE_WEB" "$SLOT")
PDS_PORT=$(slot_port "$PORT_BASE_PDS" "$SLOT")
SUPABASE_API_PORT=$(slot_port "$PORT_BASE_SUPABASE_API" "$SLOT")
SUPABASE_DB_PORT=$(slot_port "$PORT_BASE_SUPABASE_DB" "$SLOT")
SUPABASE_SHADOW_PORT=$(slot_port "$PORT_BASE_SUPABASE_SHADOW" "$SLOT")
SUPABASE_STUDIO_PORT=$(slot_port "$PORT_BASE_SUPABASE_STUDIO" "$SLOT")
SUPABASE_INBUCKET_PORT=$(slot_port "$PORT_BASE_SUPABASE_INBUCKET" "$SLOT")
SUPABASE_ANALYTICS_PORT=$(slot_port "$PORT_BASE_SUPABASE_ANALYTICS" "$SLOT")
SUPABASE_POOLER_PORT=$(slot_port "$PORT_BASE_SUPABASE_POOLER" "$SLOT")
EXPO_PORT=$(slot_port "$PORT_BASE_EXPO" "$SLOT")
NGROK_API_PORT=$(slot_port "$PORT_BASE_NGROK_API" "$SLOT")
EDGE_DEBUG_PORT=$(slot_port "$PORT_BASE_EDGE_DEBUG" "$SLOT")

# =============================================================================
# Rewrite .env.local port references
# =============================================================================
ENV_FILE="$ROOT_DIR/.env.local"

if [ ! -f "$ENV_FILE" ] && [ ! -L "$ENV_FILE" ]; then
  log_warn ".env.local not found — running postinstall to create it"
  bash "$ROOT_DIR/scripts/postinstall.sh"
fi

if [ -f "$ENV_FILE" ]; then
  log_info "Updating .env.local with slot $SLOT ports..."

  # Detect local IP (same logic as setup-local.sh)
  LOCAL_IP=""
  if command -v ipconfig &> /dev/null; then
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
  fi
  if [ -z "$LOCAL_IP" ]; then
    if command -v ifconfig &> /dev/null; then
      LOCAL_IP=$(ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}')
    fi
  fi
  if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP="127.0.0.1"
  fi

  # Update Supabase URLs
  sed -i '' "s|NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:[0-9]*|NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${SUPABASE_API_PORT}|" "$ENV_FILE"
  sed -i '' "s|EXPO_PUBLIC_SUPABASE_URL=http://[^:]*:[0-9]*|EXPO_PUBLIC_SUPABASE_URL=http://${LOCAL_IP}:${SUPABASE_API_PORT}|" "$ENV_FILE"

  # Update PDS host (edge functions reach PDS via Docker networking)
  sed -i '' "s|PDS_HOST=http://host.docker.internal:[0-9]*|PDS_HOST=http://host.docker.internal:${PDS_PORT}|" "$ENV_FILE"

  # Update site URL (only if it's a localhost URL, not an ngrok URL)
  if grep -q "NEXT_PUBLIC_SITE_URL=http://localhost:" "$ENV_FILE" 2>/dev/null; then
    sed -i '' "s|NEXT_PUBLIC_SITE_URL=http://localhost:[0-9]*|NEXT_PUBLIC_SITE_URL=http://localhost:${WEB_PORT}|" "$ENV_FILE"
  fi

  # If Supabase is already running, update keys from live instance
  if command -v supabase &>/dev/null; then
    PREV_DIR="$PWD"
    cd "$ROOT_DIR/packages/supabase"
    STATUS_JSON=$(supabase status --output json 2>/dev/null || echo "{}")
    cd "$PREV_DIR"
    LIVE_ANON=$(echo "$STATUS_JSON" | grep '"ANON_KEY"' | sed 's/.*"ANON_KEY": *"\([^"]*\)".*/\1/')
    LIVE_SERVICE=$(echo "$STATUS_JSON" | grep '"SERVICE_ROLE_KEY"' | sed 's/.*"SERVICE_ROLE_KEY": *"\([^"]*\)".*/\1/')

    if [ -n "$LIVE_ANON" ] && [ -n "$LIVE_SERVICE" ]; then
      sed -i '' "s|^NEXT_PUBLIC_SUPABASE_ANON_KEY=.*|NEXT_PUBLIC_SUPABASE_ANON_KEY=$LIVE_ANON|" "$ENV_FILE"
      sed -i '' "s|^EXPO_PUBLIC_SUPABASE_ANON_KEY=.*|EXPO_PUBLIC_SUPABASE_ANON_KEY=$LIVE_ANON|" "$ENV_FILE"
      sed -i '' "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=$LIVE_SERVICE|" "$ENV_FILE"
      log_success "Updated Supabase keys from running instance"
    fi
  fi

  log_success "Updated .env.local"
else
  log_warn ".env.local not found — postinstall may not have run yet"
fi

# =============================================================================
# Modify Supabase config.toml for non-zero slots
# =============================================================================
if [ "$SLOT" -gt 0 ] && [ -f "$SUPABASE_CONFIG" ]; then
  log_info "Updating Supabase config.toml for slot $SLOT..."

  # Back up original
  cp "$SUPABASE_CONFIG" "$SUPABASE_CONFIG_BACKUP"

  # Update project_id (prevents Docker container name collisions)
  sed -i '' "s|^project_id = \"supabase\"|project_id = \"supabase-slot-${SLOT}\"|" "$SUPABASE_CONFIG"

  # Update port values
  # [api] port
  sed -i '' "s|^\(port = \)54321|\\1${SUPABASE_API_PORT}|" "$SUPABASE_CONFIG"
  # [db] port
  sed -i '' "s|^\(port = \)54322|\\1${SUPABASE_DB_PORT}|" "$SUPABASE_CONFIG"
  # [db] shadow_port
  sed -i '' "s|^\(shadow_port = \)54320|\\1${SUPABASE_SHADOW_PORT}|" "$SUPABASE_CONFIG"
  # [db.pooler] port
  sed -i '' "s|^\(port = \)54329|\\1${SUPABASE_POOLER_PORT}|" "$SUPABASE_CONFIG"
  # [studio] port
  sed -i '' "s|^\(port = \)54323|\\1${SUPABASE_STUDIO_PORT}|" "$SUPABASE_CONFIG"
  # [inbucket] port
  sed -i '' "s|^\(port = \)54324|\\1${SUPABASE_INBUCKET_PORT}|" "$SUPABASE_CONFIG"
  # [edge_runtime] inspector_port
  sed -i '' "s|^\(inspector_port = \)8083|\\1${EDGE_DEBUG_PORT}|" "$SUPABASE_CONFIG"
  # [analytics] port
  sed -i '' "s|^\(port = \)54327|\\1${SUPABASE_ANALYTICS_PORT}|" "$SUPABASE_CONFIG"

  # Update auth redirect URLs
  sed -i '' "s|site_url = \"http://127.0.0.1:3000\"|site_url = \"http://127.0.0.1:${WEB_PORT}\"|" "$SUPABASE_CONFIG"
  sed -i '' "s|http://127.0.0.1:3000/\*\*|http://127.0.0.1:${WEB_PORT}/**|g" "$SUPABASE_CONFIG"
  sed -i '' "s|http://localhost:3000/\*\*|http://localhost:${WEB_PORT}/**|g" "$SUPABASE_CONFIG"

  log_success "Updated Supabase config.toml (project: supabase-slot-${SLOT})"
fi

# =============================================================================
# Export PORT for Next.js (used by next dev)
# =============================================================================
export PORT="$WEB_PORT"
export EXPO_PORT="$EXPO_PORT"

# =============================================================================
# Print summary
# =============================================================================
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Dev Slot ${SLOT} Claimed${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${BLUE}Web:${NC}       http://localhost:${WEB_PORT}"
echo -e "  ${BLUE}Supabase:${NC}  http://127.0.0.1:${SUPABASE_API_PORT}"
echo -e "  ${BLUE}Studio:${NC}    http://127.0.0.1:${SUPABASE_STUDIO_PORT}"
echo -e "  ${BLUE}Database:${NC}  postgresql://postgres:postgres@127.0.0.1:${SUPABASE_DB_PORT}/postgres"
echo -e "  ${BLUE}Inbucket:${NC}  http://127.0.0.1:${SUPABASE_INBUCKET_PORT}"
echo -e "  ${BLUE}PDS:${NC}       http://localhost:${PDS_PORT}"
echo -e "  ${BLUE}Expo:${NC}      http://localhost:${EXPO_PORT}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# =============================================================================
# Cleanup trap
# =============================================================================
cleanup() {
  log_info "Releasing dev slot $SLOT..."

  # Stop this slot's Supabase containers (targeted, won't touch other slots)
  log_info "Stopping Supabase (slot $SLOT)..."
  stop_slot_supabase "$SLOT"

  # Remove lockfile
  rm -f "$DEV_SLOT_DIR/slot-${SLOT}.lock"

  # Restore Supabase config.toml if we modified it
  if [ -f "$SUPABASE_CONFIG_BACKUP" ]; then
    cp "$SUPABASE_CONFIG_BACKUP" "$SUPABASE_CONFIG"
    rm "$SUPABASE_CONFIG_BACKUP"
    log_info "Restored Supabase config.toml"
  fi

  # Remove slot file
  rm -f "$ROOT_DIR/.dev-slot"

  log_success "Slot $SLOT released"
}

# Only register cleanup for fresh claims
if [ "$REUSE_SLOT" = "false" ]; then
  trap cleanup EXIT INT TERM
fi
