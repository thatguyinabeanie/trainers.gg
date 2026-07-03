# Cost Management & Data-Retention — Plan & Decision Record

> Companion to `docs/cost-model.md` (the living reference). This file records _why_ the
> cost work was done, what shipped, and the decisions still open.

## Context

Concern: once trainers.gg is publicly announced and accumulates users + tournament data,
hosting cost could grow unnoticed until the invoice arrives.

Research finding (reassuring): the _expensive_ failure mode — Supabase DB compute + Realtime
melting during a marquee event — was already designed around (see
`docs/decisions/2026-06-11-data-access-and-rls-decisions.md` and
`docs/runbooks/marquee-events.md`). The caching split model shifts cost from
_scales-with-audience_ to _scales-with-active-players_.

The remaining risks are slow and quiet:

1. No billing visibility (no spend/egress alerts).
2. Nothing is ever deleted — every table grows forever; `import_runs` adds ~432 rows/day of
   pure log noise.
3. Cost reasoning was scattered with no single "what to watch / what to do" page.

## What shipped (this branch)

| Item                                                                      | Where                                                                                       | Status |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ------ |
| Living cost-watch doc (cost surface, drivers, mitigations, gap thresholds) | `docs/cost-model.md`                                                                         | ✅     |
| Billing-alert checklist (Supabase / Vercel / Fly dashboard steps)          | `docs/cost-model.md` → Monitoring & billing alerts                                           | ✅     |
| Data-retention policy (3 tiers)                                            | `docs/cost-model.md` → Data-retention policy                                                 | ✅     |
| `import_runs` 30-day retention janitor (pg_cron)                           | `packages/supabase/supabase/migrations/20260623003335_schedule_import_runs_retention_cron.sql` | ✅     |
| Cross-link to the marquee runbook                                          | `docs/runbooks/marquee-events.md` → Related docs                                             | ✅     |
| Ads / monetization strategy doc (revenue side — ads, compliance, rollout)  | `docs/monetization.md`                                                                       | ✅     |

## Open decisions (owner action)

- **Billing alerts** — the checklist must be run once in the dashboards (can't be set via code).
- **Retention for product/legal tables** — `notifications` (purge read >90d?), `match_messages`
  (archive old chat?), `audit_log` (compliance retention window?). Documented in `docs/cost-model.md`;
  each needs a deliberate call before a janitor is added.
- **Bluesky PDS** — the social / federated-identity layer (`@username.trainers.gg` handles, account
  provisioning, community→Bluesky federation) isn't on the near-term roadmap, so the always-on Fly
  machine is cost for an unused feature. **Login with Bluesky is independent and stays.** Reversible
  disable path (scale-to-zero / unset `PDS_ADMIN_PASSWORD` / full decommission) documented in
  `docs/cost-model.md` → _Bluesky PDS — disable to cut cost_. Needs Product (confirm parked) + Infra
  (execute) sign-off; **code/infra-touching → separate branch**, not this docs branch.

## Verification

- Migration: `pnpm db:reset` stays green (the pg_cron guard makes the janitor a no-op on the
  cron-less local image). Where pg_cron exists: `SELECT * FROM cron.job WHERE jobname = 'import-runs-cleanup';`.
- Docs: cross-links resolve; content matches the decisions doc + runbook.
