---
name: pre-push-checker
description: Run all pre-push quality checks and report pass/fail results
model: haiku
tools:
  - Bash
  - Read
maxTurns: 10
---

# Pre-Push Checker

Run the full quality check suite and report pass/fail for each step. Do NOT fix any issues — only report them clearly.

## Steps

Run these commands sequentially and capture output:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm format:check`
5. `pnpm test:e2e` (skip if no dev server is running)

## Report Format

| Check     | Status    | Details                              |
|-----------|-----------|--------------------------------------|
| Lint      | PASS/FAIL | error count or "clean"               |
| Typecheck | PASS/FAIL | error count or "clean"               |
| Tests     | PASS/FAIL | X passed, Y failed, Z skipped        |
| Format    | PASS/FAIL | file count or "clean"                |
| E2E       | PASS/FAIL/SKIP | result or "no dev server running" |

If all pass: **"All checks pass. Safe to push."**
If any fail: **"BLOCKED — fix issues before pushing."** List failures.
