---
applyTo: "**"
excludeAgent: "coding-agent"
---

# Code Review — General

This project uses stacked commits within PRs. Before flagging an issue, check whether a later commit already addresses it.

`packages/supabase/src/types.ts` is regenerated via `pnpm generate-types`. Do not flag changes — including removed types, which reflect intentional schema changes.

Verify regex character classes before claiming unintended captures. `([a-zA-Z0-9-]+)` stops at `?`, `#`, `/`.

React Compiler is enabled project-wide. Do not suggest `useMemo`, `useCallback`, or `React.memo`.

Flag any use of `2>/dev/null`, `|| true`, or `|| exit 0` that would suppress real errors. Guard empty inputs with `[ -n "$VAR" ]` checks instead of swallowing all failures. Silent errors waste hours of debugging.

Jest globals (`jest`, `describe`, `it`, `expect`, `beforeEach`, etc.) are injected globally by this project's Jest config (`tooling/test-utils/jest-config.cjs` leaves `injectGlobals` at its default of `true`). Do not flag test files that use `jest.mock(...)` or other Jest globals without importing them from `@jest/globals` — both explicit imports and global usage are valid stylistic choices in this repo.
