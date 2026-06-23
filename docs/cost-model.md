# Cost Model & Hosting-Cost Watch

The single home for "how does trainers.gg accrue hosting cost, what's already mitigated, what to watch, and what to do." Companion to:

- `docs/decisions/2026-06-11-data-access-and-rls-decisions.md` — the original cost/architecture analysis (the _why_ behind the split model).
- `docs/runbooks/marquee-events.md` — the operational runbook for 1,000+ player events (the spike scenario).
- `docs/monetization.md` — the **revenue** (money-_in_) side: ads and other streams that can offset the cost below.

This doc covers the **ongoing / slow-accumulation** side: the cost surface, billing alerts, and data retention. The marquee runbook covers the **event-time spike** side. Read both.

---

## TL;DR

- The expensive failure mode (DB compute + Realtime melting during a marquee event) was **already designed around** — see the caching split model below.
- The remaining cost risks are **slow and quiet**: storage that only ever grows, egress creep, and no alert before the invoice arrives.
- The two cheapest, highest-value levers are **(1) turn on billing alerts** (you can't manage what you can't see) and **(2) don't keep data that has no long-term value** (retention).

---

## Cost surface — where money is spent

Three layers. For each driver, the cost _characteristic_ tells you what makes the number go up.

### Vercel (web app — `apps/web`)

| Driver                       | Characteristic       | Notes                                                                                                                                                                  |
| ---------------------------- | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Function invocations + compute | scales-with-traffic  | All `/api/*` route handlers run on the Node runtime. CDN cache hits skip the function (see mitigations).                                                              |
| Bandwidth / egress           | scales-with-traffic  | Served pages + API responses. CDN-cached responses are cheap; cache misses re-fetch from origin.                                                                      |
| Cron jobs                    | fixed schedule       | `vercel.json`: `discord/reconcile-roles` (every 15 min), `discord/uninstall-sweep` (daily). Fan-out scales with Discord guild size.                                  |
| Image optimization           | not in use           | `next.config.ts` configures `remotePatterns` only — images are served from source URLs (PokeAPI, Showdown, Supabase Storage), so there's no per-source-image bill.   |

### Supabase (database + edge + storage)

| Driver                    | Characteristic                    | Notes                                                                                                                                                          |
| ------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **DB compute**            | scales-with-active-players        | **The real bill at scale.** Fixed tier (e.g. Pro 2-core/4GB) until bumped. Marquee events need a temporary tier bump — see the runbook.                       |
| **Realtime**              | scales-with-concurrent-connections | Connection count + message throughput. Spectators consume _zero_ connections by design (see mitigations). Six realtime tables only.                          |
| Storage + egress          | scales-with-uploads               | Two buckets: `UPLOADS` (public — avatars/logos/banners) and `RENTAL_PHOTOS` (private). PDS blobs also land in Supabase S3. No cleanup today.                  |
| Edge function invocations | fixed schedule + per-action       | 16 functions; `import-tick` is invoked by pg_cron on three staggered schedules (sync 5m, import 1m, compile 2m). Auth/PDS-provisioning functions fire per action. |

### Fly.io (Bluesky PDS — `infra/pds`)

| Driver      | Characteristic | Notes                                                                                                                          |
| ----------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| PDS machine | fixed monthly  | One `shared-cpu-1x` / 1GB machine + a persistent volume. Scales with PDS user growth, not app traffic. Small and predictable. **Candidate to disable** — see [Bluesky PDS — disable to cut cost](#bluesky-pds--disable-to-cut-cost-open-decision). |

---

## The real cost drivers (in priority order)

1. **Supabase DB compute + Realtime during marquee events.** Concurrency, not page views. This is the headline risk and the runbook exists for it.
2. **Storage that only grows.** Uploads + PDS blobs accumulate forever with no lifecycle. Slow but monotonic.
3. **Unbounded table growth.** Every table inserts and never deletes. Most rows are valuable product data (keep them); some are pure log noise (`import_runs`). See retention.
4. **Egress creep.** Double-egress (Supabase→Vercel→client) on cache misses is consciously accepted; only material if cache hit rate drops. Watch via alerts.

---

## What's already mitigated (don't re-solve these)

From the June 11 decisions — the architecture already does the heavy lifting:

- **Caching split model** — S-bucket (shared-public) reads go through `/api/v1` + `'use cache'` + tag-invalidated CDN caching. Cache hits skip the DB entirely. This shifts cost from _scales-with-audience_ to _scales-with-active-players_.
- **Spectators get zero realtime** — logged-out viewers are served SSR/ISR, not websockets. Protects the 10k connection ceiling at marquee events.
- **Payload-driven realtime** — `setQueryData(payload.new)` instead of refetch-on-event; erases ~50k live DB reads/round at 7k players.
- **Rate limiting** — atomic `check_rate_limit` RPC on `/api/v1` routes (120 req/min per user-or-IP) caps abuse-driven cost.

---

## Gaps & thresholds (what to watch, when to act)

| Gap                  | Signal to watch                | When X…                              | …do Y                                                                       |
| -------------------- | ------------------------------ | ------------------------------------ | --------------------------------------------------------------------------- |
| No billing visibility | —                              | Always                               | Set up the alerts below — this is the prerequisite for everything else.      |
| Storage growth       | Supabase storage GB; egress GB | Egress > ~80% of plan's included GB  | Investigate top buckets; consider lifecycle/cleanup on `UPLOADS`.            |
| DB disk growth       | Supabase disk usage            | Disk > ~80%                          | Check the biggest tables; confirm retention is running; consider disk bump.  |
| DB compute           | DB CPU (Reports)               | CPU > 80% sustained                  | Check slow queries; bump compute tier (runbook covers the marquee case).     |
| Cache hit rate       | Vercel Analytics → Cache       | Hit rate < 80%                       | Check tag-invalidation isn't over-busting; see `reviewing-caching` skill.    |
| `import_runs` bloat  | Row count                      | Auto-handled                         | 30-day janitor (pg_cron) — see retention.                                    |

---

## Monitoring & billing alerts (do this first)

> ⚠️ These can't be set via code — they're dashboard settings. Run this checklist once; revisit quarterly.
> Confirm current included amounts in each billing dashboard — plan limits change, so don't trust hardcoded numbers.

### Supabase

- [ ] **Org → Billing → set a spend cap or budget alert.** Decide whether to cap (hard stop) or just alert.
- [ ] **Egress usage alert** at ~80% of the plan's included egress.
- [ ] **Disk-size alert** at ~80% of provisioned disk.
- [ ] **DB compute / overage alert** so a tier bump (e.g. before a marquee event) doesn't silently run hot afterward.

### Vercel

- [ ] **Settings → Spend Management → set a monthly budget.**
- [ ] **Notifications at 50% / 75% / 90%** of budget.
- [ ] Decide whether to enable **auto-pause** at the limit (safety vs. availability trade-off — for a public app, alerting without auto-pause is usually safer).

### Fly.io

- [ ] Confirm **billing-email alerts** are enabled for the org (PDS is a small fixed cost; low priority, but free to enable).

---

## Data-retention policy

Three categories. The principle: **keep everything that is product value; delete only what has no long-term value; decide deliberately on the rest.**

### 1. Permanent — never auto-delete (product data)

`team_slots`, `tournament_matches`, `match_games`, and the `tournament_*` tables.

This _is_ the platform's value (usage stats, tournament history). Growth is linear and modest (~62k `team_slots`/yr at ~52 tournaments). **Mitigation is indexing — and materialized views only if a query is measured slow — never deletion.** (See `working-with-usage-data` for the escalation order.)

### 2. Auto-cleanup — no long-term value

| Table         | Policy                                                                                                                                                          | Status                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `import_runs` | Delete rows older than **30 days** via a daily pg_cron janitor. Pure import-pipeline observability; 30 days is plenty for debugging. Window tunable in the migration. | **Implemented** — migration `20260623003335_schedule_import_runs_retention_cron.sql`.                              |

### 3. Needs a product/legal decision (documented, not auto-implemented)

These have product or compliance value, so they need a deliberate call before any deletion job is added:

| Table            | Recommendation                                                                                                                          | Decision owner |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `notifications`  | Purge **read** notifications older than ~90 days; keep unread. Users can already delete their own.                                      | Product        |
| `match_messages` | Low volume + dispute-evidence value — **keep for now.** Revisit archiving completed-tournament chat after ~1 year if volume grows.       | Product        |
| `audit_log`      | Immutable by design (forensic/compliance). Keep ~1–2 years hot; archive-then-delete only with explicit sign-off.                       | Compliance     |

When one of these is decided, add a janitor following the `import_runs` pattern and move the row to category 2.

---

## Bluesky PDS — disable to cut cost (open decision)

The self-hosted PDS (`infra/pds`, Fly app `trainers-pds`) powers the **social / federated-identity layer**: `@username.trainers.gg` handles, auto-provisioned trainers.gg Bluesky accounts on signup, and community → Bluesky profile sync. That layer is **not on the near-term roadmap**, so the machine is a small fixed cost for a feature that isn't in use.

> **Key fact: "Login with Bluesky" does _not_ depend on the PDS.** OAuth runs against the public Bluesky network (`public.api.bsky.app`) via standard AT Protocol OAuth (DPoP + PKCE), using only `ATPROTO_PRIVATE_KEY` + the callback route — it never contacts `pds.trainers.gg`. Keep `packages/atproto/` and the OAuth flow untouched.

### Cost today

- One `shared-cpu-1x` / 1 GB Fly machine, `min_machines_running = 1`, `auto_stop_machines = false` → runs **24/7**, plus a persistent `pds_data` volume. Small fixed monthly cost (confirm the exact figure in the Fly dashboard).
- Secondary: PDS blobs also land in Supabase Storage (S3). Disabling stops _new_ PDS blobs accruing there.

### What's lost if disabled

| Feature                                              | Status if PDS off                                   |
| --------------------------------------------------- | --------------------------------------------------- |
| Login with Bluesky (OAuth)                          | ✅ Unaffected                                        |
| `@username.trainers.gg` federated handles           | ❌ Not issued                                        |
| Auto-provisioned trainers.gg Bluesky account        | ❌ Skipped (user marked `pds_status: 'pending'`)     |
| Community profile → Bluesky federation              | ❌ No sync                                           |

### Disable path (reversible, cheapest-reversal first)

The edge functions **already degrade gracefully** when the admin password is absent — `signup` guards PDS creation behind `if (PDS_CONFIG.hasAdminPassword)` (`signup/index.ts:201`), and `provision-pds` early-returns when `!PDS_CONFIG.hasAdminPassword` (`provision-pds/index.ts:122`). OAuth users get `pds_status: 'pending'`, so re-enabling later is trivial.

1. **Scale to zero (softest)** — set `min_machines_running = 0` + `auto_stop_machines = true` in `infra/pds/fly.toml`. Machine sleeps when idle; the data volume is retained. Fully reversible.
2. **Stop provisioning (recommended if not building social)** — unset `PDS_ADMIN_PASSWORD` in Fly secrets; edge functions skip PDS creation. Combine with #1 to also drop compute cost.
3. **Decommission (hardest to undo)** — `fly apps destroy trainers-pds` + remove the volume + delete `infra/pds/`. Frees the cost entirely but loses existing handles. **Pre-check first:** `SELECT count(*) FROM users WHERE pds_status = 'active';` to confirm no users depend on trainers.gg handles.

> ⚠️ All three levers are **code/infra-touching** — none belong on this docs-only branch. This section records the decision and the path; implementation is a separate branch.

**Decision owner:** Product (confirm the social layer is parked) + Infra (execute the disable).

---

## Related docs

- `docs/monetization.md` — revenue side (ads + other streams) that can offset the cost surface above.
- `docs/decisions/2026-06-11-data-access-and-rls-decisions.md` — cost/architecture analysis, the split-model rationale.
- `docs/runbooks/marquee-events.md` — event-time spike runbook (quota raises, DB-tier bumps, incident levers).
- `.claude/skills/reviewing-caching/SKILL.md` — caching playbook (S-bucket routes, tag invalidation).
- `.claude/skills/working-with-usage-data/SKILL.md` — usage tables + when to add materialized views.
- `docs/deferred-improvements.md` — parked improvements (some are scale/cost-adjacent, e.g. chunking unbounded `.in()` lists).
