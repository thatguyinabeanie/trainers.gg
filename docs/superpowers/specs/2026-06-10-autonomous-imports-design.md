# Autonomous Imports — Design Spec

**Date:** 2026-06-10
**Branch:** `async-imports`
**Status:** Approved design (pending written-spec review)

## 1. Summary

Move the RK9 + Limitless tournament-import pipeline to run **entirely inside Supabase**,
driven by `pg_cron`, with **zero frontend involvement**. A single Deno edge function does
the scraping, importing, and stats compilation. The `/admin/data` page becomes a pure
**monitor + recovery + config** surface — no manual import triggers.

### Goals

- Imports run autonomously on the server; no browser tab, no Next.js cron route.
- One clear, simple operational model: three scheduled stages over one unified queue.
- `/admin/data` is simpler — watch the pipeline, intervene only when needed.
- Cadence and key knobs are adjustable at runtime without a redeploy.

### Non-goals

- Reworking the source-schema tables (`rk9.*`, `limitless.*`) or the `team_slots` fact model.
- Changing the public `/data` usage pages.
- Per-source pause toggles (replaced by a single global kill-switch).

## 2. Architecture

### 2.1 One edge function, three crons

A single Deno edge function (e.g. `supabase/functions/import-tick/`) handles all stages,
selected by a `?stage=` query param. Three `pg_cron` jobs invoke it via
`net.http_post` (pg_net), authenticated with the Vault-stored service role key — the
**same pattern already present** in migration `20260511202236_schedule_pg_cron_edge_functions.sql`
(Vault secrets `project_url` + `service_role_key`, `pg_net`, `pg_cron`).

| Cron | Stage | Responsibility | Default cadence |
| ---- | ----- | -------------- | --------------- |
| **Sync** | `?stage=sync` | `discover` new events + pull rosters/metadata; enqueue work | every 5 min |
| **Import** | `?stage=import` | Drain the queue — process **one item** per tick | every 1 min |
| **Update stats** | `?stage=compile` | For events marked `complete`, bridge scraped data → `team_slots` | every 2 min |

Supabase edge functions may run up to **10 minutes**, which comfortably covers one full
RK9 event (its many team-pages) in a single import tick.

### 2.2 Unified queue + source-aware grain

- RK9 and Limitless events share **one logical queue** at **equal priority** (an event is
  "queued" when its source-table status = the queued state; ordering by enqueue time).
- The **import tick** pulls work source-aware:
  - **RK9** → **one event per tick**, scraped fully within the time budget.
  - **Limitless** → **a batch of events per tick** (cheap API reads); batch size is configurable.
- Queue item granularity is **one event** for both sources — no per-player row explosion.

### 2.3 Stage state machines (unchanged enums, autonomous transitions)

The existing per-source status columns drive the queue; the crons advance them:

- **RK9** (`rk9.events.import_status`): `pending → queued → roster → teams → complete | failed`
- **Limitless** (`limitless.tournaments.import_status`): `pending → queued → importing → completed | failed | skipped`

`Sync` moves discovered events to `queued`. `Import` advances `queued` events through their
source-specific in-progress states to `complete`/`completed` (or `failed`). `Update stats`
acts only on events that have reached the terminal complete state and have not yet been
compiled into `team_slots`.

### 2.4 Global pause

A single `pipeline_enabled` flag (in `site_config`) is the master kill-switch. Each cron tick
checks it first and no-ops when disabled. There are **no per-source toggles** — the prior
`auto_import_*` per-source flags are retired in favor of this one switch.

## 3. Code consolidation (Deno-safe)

The scraping/import logic moves out of the web app and into a location the edge function
imports, per the monorepo architecture rule (pure, framework-free logic belongs in `packages/`):

- **From** `apps/web/src/lib/rk9/{scraper,worker}.ts`, `apps/web/src/lib/limitless/{api,queue-worker}.ts`,
  and `packages/data-sources/**`
- **To** `packages/supabase` (the standalone `data-sources` package is absorbed — it only
  existed to centralize import code, which now lives beside the edge function that uses it).

### Deno-compatibility notes (from audit)

- **cheerio** ports via `npm:cheerio` — works in Deno.
- **`@pkmn/sim`** node-builtins (`fs`, `assert`, `require.cache`) are **off the import path**
  used by `@trainers/pokemon`: the fs/assert code lives in `sim/tools/runner.mjs` (not
  re-exported from `sim/index.mjs`), and `clearRequireCache` is defined but never called in the
  ESM `sim/` tree. The simulator core (`Dex`, `Teams`, `team-validator`) is reachable without
  node builtins. Re-verify during implementation if the compile stage needs pokemon validation.
- No `node:` builtins permitted in the import path; env via `Deno.env`.
- Edge functions import from packages through the Deno import map (`deno.json`); see the
  `managing-edge-imports` skill.

## 4. Configurability

### 4.1 Runtime-editable cron cadence

Cron schedules are **seeded** by a migration (so the jobs exist on deploy) but **editable at
runtime** from the Config tab. A site-admin-only `SECURITY DEFINER` RPC wraps
`cron.alter_job(...)` to change a job's schedule live — no redeploy. The RPC validates the
cron expression and is gated to site admins.

### 4.2 Config values (in `site_config`)

| Key | Meaning | Default |
| --- | ------- | ------- |
| `pipeline_enabled` | Master kill-switch for all crons | `true` |
| `limitless_import_batch_size` | Events processed per Limitless import tick | `25` |
| (cron schedules) | Managed via `cron.alter_job` RPC, not a config row | seeded by migration |

Retired keys: the per-source `auto_import_*` / `*_backend_auto_import` / `*_frontend_auto_import`
flags are removed in favor of `pipeline_enabled`.

## 5. `/admin/data` UI

Two tabs: **Monitor** and **Config**.

### 5.1 Monitor tab

- **Pipeline** — three cards (**Sync**, **Import**, **Update stats**) each showing last-run
  status, relative time, and next-run estimate; the active stage shows live progress
  (e.g. "Worlds 2024 · 214/312").
- **Events by status** — a row of **count chips** that act as the **filter** for the single
  list below: **Queued · Processing · Failed · Skipped · Complete**. The chip and the list
  are the same data, so counts and rows can never disagree (this fixes the old
  strip-vs-filtered-table mismatch).
- **Skipped is first-class** — a chip alongside the others; skipped rows display **why**
  (e.g. "format: CUSTOM — not importable").
- **Recovery actions** (page-level): **Reset stuck** (processing → queued), **Requeue failed**
  (failed → queued).
- **Per-row actions** (on the filtered list):
  - **Import anyway** — on Skipped rows; forces the event into the queue despite a
    non-importable format (for formats since decided to support).
  - **Delete** — cascade purge of the event and its child data; may be re-discovered next sync.
  - **Delete & exclude** — cascade purge **+ tombstone** so `discover` never re-adds it.

### 5.2 Config tab

- **Pipeline enabled** — global kill-switch toggle.
- **Limitless batch size** — numeric input.
- **Cron cadence** — editable cron expressions for Sync / Import / Update-stats, written live
  to `pg_cron` via the admin RPC, with a Save action.

### 5.3 Removed from the old page

All manual triggers: Import, Import All, Import Matching, Sync, Discover, Process now,
Calculate usage, and **Unqueue all** (meaningless once sync auto-queues).

## 6. Delete semantics

- **Cascade** — deleting an event removes its dependent rows (teams, standings, usage rows,
  `team_slots` entries) via database foreign-key `ON DELETE CASCADE`.
- **Two variants**, chosen per row:
  - **Delete** — cascade only; the event can be re-discovered on the next sync.
  - **Delete & exclude** — cascade + **tombstone** (an exclusion record keyed by source +
    source event id) that `discover` consults so the event is never re-added.
- Both are destructive and confirmed via dialog. Tombstones are visible/clearable (so an
  exclusion can be undone) — surfaced in Config or a dedicated view.

## 7. Observability

The existing `import_runs` table (migration `20260610225833_create_import_runs.sql`) records
each stage execution (stage, source, counts, status, timing). It feeds:

- The three pipeline cards' last-run / next-run info.
- A recent-activity view (per-event outcomes: imported counts, failures with reason).

## 8. Security

- Edge function authenticated by the Vault service-role key passed from `pg_net`; rejects
  unauthenticated calls.
- Cron-alter RPC and all recovery/delete mutations are **site-admin only** (RLS +
  server-action auth checks).
- `import_runs` and config reads remain site-admin SELECT.
- Edge functions are **auto-deployed via the Vercel build** — never deployed manually, never
  declared in `config.toml`.

## 9. Retirement / migration steps (high level)

- Delete `apps/web/src/app/api/cron/import-queue/route.ts` and its tests.
- Repoint `pg_cron` jobs from the Next.js route to the new edge function (new migration;
  reuse the Vault/pg_net pattern from `20260511202236`).
- Move scraper/worker/api modules into `packages/supabase`; delete `packages/data-sources`.
- Replace per-source `auto_import_*` config with `pipeline_enabled`.
- Add the tombstone/exclusion table + the `cron.alter_job` admin RPC + the
  `limitless_import_batch_size` default.
- Rebuild `/admin/data` as the two-tab monitor/config surface; delete the manual-trigger
  handlers and the old queue strip.

## 10. Open implementation questions

- Exact tombstone table shape (composite key `source` + source event id; nullable reason).
- Whether the compile stage needs `@pkmn/sim` validation at all (it is mostly data movement);
  if so, re-verify Deno reachability of the validator path.
- Cron-expression validation rules for the admin RPC (reject obviously-bad expressions).
