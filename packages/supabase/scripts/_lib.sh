#!/bin/bash
# =============================================================================
# _lib.sh — shared helpers for Supabase scripts
#
# Source this file from other scripts; do not run it directly.
# Usage (call from every script that uses it):
#   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
#   source "$SCRIPT_DIR/_lib.sh"
# The SCRIPT_DIR / BASH_SOURCE[0] technique resolves relative to the CALLER's
# location, so sourcing from any working directory works correctly.
# =============================================================================

# ANSI color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# discover_supabase_container
# Finds the running Supabase Postgres container by name (project-ref agnostic).
# Prints the container name to stdout, or prints nothing if none is found.
# The caller is responsible for checking whether the result is empty.
discover_supabase_container() {
  docker ps --format '{{.Names}}' | grep -E 'supabase_db' | head -n1
}
