#!/usr/bin/env bash
# check-web-changes.sh
# Detects if the current branch has apps/web/ changes vs the default branch.
# Outputs changed file paths (one per line) or nothing if no changes.
# Exit 0 always — callers check output emptiness.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$REPO_ROOT"

# Don't run on default branch
BRANCH="$(git branch --show-current 2>/dev/null)" || exit 0
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  exit 0
fi

# Determine base branch dynamically
if git rev-parse --verify main >/dev/null 2>&1; then
  BASE_BRANCH=main
elif git rev-parse --verify master >/dev/null 2>&1; then
  BASE_BRANCH=master
else
  exit 0
fi

# Get web-only changes introduced on this branch (merge-base form avoids false positives)
git diff --name-only "$BASE_BRANCH"...HEAD -- apps/web/ 2>/dev/null || true
