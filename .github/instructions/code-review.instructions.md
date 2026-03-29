---
applyTo: "**"
excludeAgent: "coding-agent"
---

# Code Review Instructions

## Check All Commits Before Flagging Issues

This project uses stacked commits. Before flagging an issue, check whether a later commit already addresses it.

## Auto-Generated Files

`packages/supabase/src/types.ts` is regenerated via `pnpm generate-types`. Do not flag changes in this file — including removed types, which reflect intentional schema changes.

## Migration Conventions

All migrations must be idempotent (Supabase preview branches replay all). `DROP IF EXISTS` before `ADD CONSTRAINT` is the standard pattern — not redundant. Never suggest editing or renaming committed migration files.

## Regex Analysis

Verify character classes before claiming a regex captures unintended characters. `([a-zA-Z0-9-]+)` stops at `?`, `#`, `/` — do not flag it as capturing query params.

## React Compiler

Enabled project-wide. Do not suggest `useMemo`, `useCallback`, or `React.memo`.

## Zod Validation

Standard pattern is `.transform(v => v.trim()).pipe(z.string().max(N))`. Do not suggest `.preprocess()`.

## JSONB Type Casting

Supabase JSONB uses `as unknown as Json`. Do not suggest `Json[]` — the type is `Json | null`.

## UI Components

- shadcn/ui v4 with **Base UI** (not Radix). `asChild` does not exist.
- Never render raw enum/DB values — map through label constants.
- Use `cn()` for dynamic classes, never template literals.

## Edge Functions

Deployed automatically during Vercel build via `run-migrations.mjs`. Do NOT suggest declaring edge functions in `config.toml` — the Supabase remote bundler cannot resolve monorepo imports, causing build failures on preview branches.

## Server Actions

Return `{ success: boolean; error?: string }`. Do not suggest throwing errors.

## Request Interception

Next.js 16 uses `proxy.ts` (at `src/proxy.ts`), not `middleware.ts`.

## Pre-Commit Hooks (Lefthook)

Uses Lefthook (not Husky/lint-staged), configured in `lefthook.yml`.

- Lefthook `glob` filters staged files by extension — NOT filesystem globbing. `*.{ts,tsx}` matches staged files at any depth.
- `parallel: true` with `stage_fixed: true` is safe — Prettier and ESLint have non-overlapping concerns (`eslint-config-prettier` disables formatting rules). Do not suggest `parallel: false`.

## BotID and E2E Tests

`checkBotId()` rejects headless Playwright (flagged as bot). Server actions called during E2E must check `x-vercel-protection-bypass` header against `VERCEL_AUTOMATION_BYPASS_SECRET` to skip BotID. Same trust model as `/api/e2e/*` endpoints.
