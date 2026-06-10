---
name: troubleshooting-local-env
description: Use when local dev breaks — Supabase won't start, stale generated types, env-symlink issues, pnpm install problems, or the smogon/calc submodule
---

# Troubleshooting Local Environment

Symptom-based decision guide for the most common local dev failures.

## Symptom → Cause → Fix

| Symptom                                                                     | Cause                                                             | Fix                                                                                                            |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `supabase/.temp/linked-project.json` appears at repo root                   | Ran `pnpm supabase` from repo root instead of `packages/supabase` | Delete the stray file; always `cd packages/supabase` first (or prefix with `pnpm --filter @trainers/supabase`) |
| TypeScript errors on DB types after a migration                             | Generated types are stale                                         | Run `pnpm generate-types` from repo root                                                                       |
| `Cannot find module '@smogon/calc'` in CI/Vercel                            | Submodule not initialized or package re-pinned to git tarball     | See `@smogon/calc` section below                                                                               |
| `[WARN] pnpm field in package.json is ignored` + overrides silently missing | pnpm 11 ignores the `pnpm` key in `package.json`                  | Move `overrides`, `packageExtensions`, `allowBuilds` to `pnpm-workspace.yaml`                                  |
| `.env.local` vars missing in an app or package                              | Symlink not set up (usually after fresh clone or `pnpm install`)  | Run `postinstall.sh` or `pnpm install` — it runs the symlink script automatically                              |
| App uses local Supabase when you want remote (or vice versa)                | `pnpm dev` auto-reconfigures `.env.local` for local Supabase      | Set `SKIP_LOCAL_SUPABASE=1 pnpm dev` to use remote                                                             |
| Can't find a recent error in dev output                                     | Log buffer scrolled away                                          | Check `.dev-logs/dev.log` — see Log Inspection section below                                                   |
| `{ error: "URI too long" }` from a Supabase query, rows silently missing    | Unbounded `.in()` filter overflows PostgREST URI limit            | See `.in()` chunking section below — this is a query concern, not a dev-env concern                            |

## Supabase CLI — Always Run from `packages/supabase`

The CLI writes `supabase/.temp/linked-project.json` relative to the **current working directory**. Running from the repo root drops this file at `supabase/.temp/` inside the repo root — untracked and not gitignored there.

```bash
# WRONG — pollutes repo root
pnpm supabase db push

# CORRECT — gitignored at packages/supabase/supabase/.temp/
cd packages/supabase && pnpm supabase db push
# or from root:
pnpm --filter @trainers/supabase exec supabase db push
```

All `pnpm db:*` root scripts already scope to the right package — prefer them. See `create-migration` skill for migration workflow.

## `.env.local` and Environment Variables

- Single source of truth: root `.env.local`
- `postinstall.sh` symlinks it into every app and package that needs it
- `pnpm dev` always reconfigures `.env.local` for local Supabase — use `SKIP_LOCAL_SUPABASE=1 pnpm dev` to point at remote
- Build-time env vars must also be declared in `turbo.json` under the task's `env` array or Turbo's cache will serve stale builds

## Stale Generated Types

After any migration (or `pnpm db:reset`), TypeScript types go stale until regenerated:

```bash
pnpm generate-types   # from repo root — regenerates packages/supabase/src/types.ts
```

Never hand-edit `src/types.ts` — it is fully auto-generated. See `querying-supabase` skill for type usage patterns.

## Log Inspection

Dev server logs (Next.js + edge functions) land in `.dev-logs/` — `dev.log` is a symlink to the latest run.

```bash
tail -200 .dev-logs/dev.log                          # recent output
grep -a "error\|Error\|failed" .dev-logs/dev.log     # scan for failures
```

ANSI color codes are present but `grep` works fine through them.

## `@smogon/calc` Submodule

`apps/web` depends on `@smogon/calc` via `file:../../vendor/damage-calc/calc` — a git submodule, not a tarball.

**Never change it to `github:thatguyinabeanie/damage-calc#<sha>&path:/calc`.** That form fails under `--frozen-lockfile` (CI/Vercel) because pnpm can't resolve the `dist/` from a git tarball.

**Recovery steps:**

```bash
git submodule update --init --recursive   # initializes vendor/damage-calc
pnpm install                              # re-links the file: dependency
```

**Requirements that must stay in place:**

- GitHub Actions `actions/checkout` steps use `submodules: recursive`
- Vercel project "Git submodules" setting is enabled
- Root `preinstall` script runs `git submodule update --init --recursive`
- `@smogon/calc` is absent from `allowBuilds` in `pnpm-workspace.yaml`

To update calc: bump the submodule pointer in `vendor/damage-calc` — keep `dist/` committed in the fork.

## Unbounded `.in()` Queries — `URI too long`

This is a query-layer gotcha rather than a dev-env issue, but it only surfaces at scale so the seed never triggers it locally.

A `.in("col", ids)` with hundreds of IDs overflows PostgREST's URI limit — response is `{ error: "URI too long" }`. If the error isn't checked, `data` is `null` and rows silently disappear.

Use `fetchInChunks()` (`packages/supabase/src/queries/players.ts`) as the reference: split into ≤100-id chunks, merge results, and throw on any chunk error. See `querying-supabase` skill for full query patterns.

## Related Skills

- `querying-supabase` — client selection, query conventions, `fetchInChunks` pattern
- `create-migration` — migration file conventions, when to run `pnpm db:*` commands
- `managing-infrastructure` — PDS on Fly.io, ngrok tunnel for local OAuth flows
