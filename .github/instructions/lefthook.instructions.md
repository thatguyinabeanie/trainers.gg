---
applyTo: "lefthook.yml,scripts/get-affected-packages.mjs"
excludeAgent: "coding-agent"
---

# Code Review — Lefthook Pre-Commit Hooks

This project uses Lefthook (not Husky/lint-staged), configured in `lefthook.yml`.

- Lefthook `glob` filters the list of staged files by extension pattern — it is NOT filesystem globbing. `*.{ts,tsx}` matches staged files at any directory depth (e.g., `apps/web/src/foo.tsx` matches `*.tsx`). Do not suggest recursive globs.
- `parallel: true` with `stage_fixed: true` is safe — Prettier handles formatting only, ESLint handles linting only (`eslint-config-prettier` disables all formatting rules). They do not modify the same concerns. Do not suggest `parallel: false` or `piped: true`.
