#!/bin/bash
# =============================================================================
# Dev Slot Port Calculation Library
# =============================================================================
# Source this file from any script that needs slot-aware port values.
#
# Usage:
#   source "$(dirname "${BASH_SOURCE[0]}")/../lib/dev-slots.sh"  # from scripts/
#   SLOT=$(read_slot)
#   WEB_PORT=$(slot_port 3000 "$SLOT")
#
# The slot number is stored in $REPO_ROOT/.dev-slot (written by claim-dev-slot.sh).
# All ports are offset by slot × 100 from their base values.
# =============================================================================

# Port offset per slot
DEV_SLOT_OFFSET=100

# Lockfile directory
DEV_SLOT_DIR="$HOME/.local/state/trainers.gg/dev-slots"

# Base ports (slot 0 defaults — unchanged from current behavior)
PORT_BASE_WEB=3000
PORT_BASE_PDS=3001
PORT_BASE_SUPABASE_API=54321
PORT_BASE_SUPABASE_DB=54322
PORT_BASE_SUPABASE_SHADOW=54320
PORT_BASE_SUPABASE_STUDIO=54323
PORT_BASE_SUPABASE_INBUCKET=54324
PORT_BASE_SUPABASE_ANALYTICS=54327
PORT_BASE_SUPABASE_POOLER=54329
PORT_BASE_EXPO=8081
PORT_BASE_NGROK_API=4040
PORT_BASE_EDGE_DEBUG=8083

# Calculate a port for a given base and slot number
# Usage: slot_port <base_port> <slot_number>
slot_port() {
  local base="$1"
  local slot="${2:-0}"
  echo $(( base + slot * DEV_SLOT_OFFSET ))
}

# Read the current slot from .dev-slot file
# Falls back to 0 if file doesn't exist
# Usage: SLOT=$(read_slot)
read_slot() {
  local repo_root="${REPO_ROOT:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
  local slot_file="$repo_root/.dev-slot"
  if [ -f "$slot_file" ]; then
    cat "$slot_file"
  else
    echo "0"
  fi
}

# Check if a port is free
# Returns 0 if free, 1 if in use
# Usage: is_port_free 3000
is_port_free() {
  local port="$1"
  ! lsof -iTCP:"$port" -sTCP:LISTEN -t >/dev/null 2>&1
}

# Check if a PID is still alive
# Returns 0 if alive, 1 if dead
# Usage: is_pid_alive 12345
is_pid_alive() {
  local pid="$1"
  kill -0 "$pid" 2>/dev/null
}

# =============================================================================
# Docker-based slot detection
# =============================================================================
# Docker container state is the primary authority for Supabase slot occupancy.
# Lockfiles are advisory metadata; containers are the ground truth.

# Get the Supabase project ID for a slot number
# Usage: slot_project_id 0 → "supabase", slot_project_id 5 → "supabase-slot-5"
slot_project_id() {
  local slot="$1"
  if [ "$slot" -eq 0 ]; then
    echo "supabase"
  else
    echo "supabase-slot-${slot}"
  fi
}

# Check if a slot has running Supabase Docker containers
# Returns 0 if occupied, 1 if free
# Usage: is_slot_occupied 15
is_slot_occupied() {
  local project_id
  project_id=$(slot_project_id "$1")
  docker ps --filter "name=_${project_id}" --format "{{.Names}}" 2>/dev/null | grep -q .
}

# List all slot numbers with running Supabase containers
# Outputs one slot number per line, sorted
# Usage: for slot in $(list_occupied_slots); do ...; done
list_occupied_slots() {
  local slots=""

  # Non-zero slots: containers named *_supabase-slot-N
  local nonzero
  nonzero=$(docker ps --filter "name=supabase-slot-" --format "{{.Names}}" 2>/dev/null \
    | sed -n 's/.*supabase-slot-\([0-9]*\).*/\1/p' | sort -un)
  if [ -n "$nonzero" ]; then
    slots="$nonzero"
  fi

  # Slot 0: containers named *_supabase (without -slot- suffix)
  if docker ps --format "{{.Names}}" 2>/dev/null \
    | grep -q "supabase_.*_supabase$"; then
    slots=$(printf "%s\n0" "$slots")
  fi

  echo "$slots" | grep -v '^$' | sort -un
}

# Stop a specific slot's Supabase containers
# Uses --project-id for targeted teardown (won't affect other slots)
# Usage: stop_slot_supabase 15
stop_slot_supabase() {
  local project_id
  project_id=$(slot_project_id "$1")
  if command -v supabase &>/dev/null; then
    supabase stop --project-id "$project_id" 2>/dev/null || true
  fi
}
