#!/usr/bin/env bash
# check-web-changes.sh
# Detects if the current branch has apps/web/ changes vs main.
# Outputs changed file paths (one per line) or nothing if no changes.
# Exit 0 always — callers check output emptiness.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$REPO_ROOT"

# Don't run on main
BRANCH="$(git branch --show-current 2>/dev/null)" || exit 0
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  exit 0
fi

# Get web-only changes vs main
git diff main --name-only -- apps/web/ 2>/dev/null || true
