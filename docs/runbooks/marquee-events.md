# Marquee-Event Runbook

> Phase 4 deliverable — see post-decision consideration #6 in
> `docs/decisions/2026-06-11-data-access-and-rls-decisions.md`.

Use this runbook for events with **1,000+ registered players** (currently: World Championships,
Nationals, large Regional qualifiers). Run it end-to-end before the first 1,000-player event lands
on the platform.

---

## Cost model (why this matters)

After the Phase 2–3 data-access migration:

- **Caching shifts S-bucket cost** from _scales-with-audience_ to _scales-with-active-players_.
  Spectators hit the Vercel CDN — no DB, no realtime websocket.
- **The real bill at marquee scale is DB compute + Realtime** — not function placement.
  Those two resources scale with concurrent active players, not page-view volume.
- **Spectators consume zero realtime connections** — they see SSR/ISR pages (tag-revalidated, no
  websocket). This is the single most important lever protecting the 10k connection ceiling.
- **Payload-driven realtime** (`setQueryData(payload.new)`) means each DB-change event costs one
  message delivery, not one DB read per subscriber. At ~7k players this eliminates ~50k live
  DB reads per round.

---

## Hard limits to keep in mind

| Resource                   | Default ceiling | Target for marquee event | Headroom |
| -------------------------- | --------------- | ------------------------ | -------- |
| Realtime concurrent conns  | 10,000          | ~7,000 active players    | ~3,000   |
| Realtime message throughput | ~2,500 msg/s   | peak at round-start      | watch    |
| DB compute (default Pro)   | 2-core / 4 GB   | likely insufficient      | upgrade  |

---

## Pre-event checklist (days ahead)

### T-7 days — Supabase configuration

- [ ] **Request a raised realtime connection quota** via Supabase support.
  - Target: ~7,000 concurrent connections (registered players likely at-table simultaneously).
  - The default ceiling is 10,000; request headroom to ~7k now so support has time to provision.
  - Channel: support.supabase.com → "Realtime" category. Include event date, expected peak concurrency, project ref.
  - Confirm the raised limit in writing before the event date.

- [ ] **Bump the DB compute tier** to the next tier above your current production tier.
  - Go to: **Dashboard → Project Settings → Compute → Upgrade instance**.
  - Timing: upgrade at least 48 hours before the event (Supabase schedules a maintenance window; plan around it).
  - Document the current tier so you can downgrade post-event.

- [ ] **Verify pg_cron / import pipeline is healthy** — pairings + standings import must complete
  within one round timer. Run a dry pairings import against a test tournament to confirm round-trip
  timing.

### T-3 days — CDN and caching warm-up

- [ ] **Confirm spectator pages are SSR/ISR — no realtime**.
  - Tournament page (`/tournaments/[slug]`), standings, pairings: all SSR/ISR with tag-revalidated
    cached data. No `useRealtimeChannel` calls in those page components.
  - Quick check: `grep -r "useRealtimeChannel\|supabase.channel" apps/web/src/app/\(app\)/tournaments` —
    should return nothing in page-level files (only components used by authenticated participants).

- [ ] **Warm the CDN cache** for the event tournament page.
  - Hit `/tournaments/[event-slug]`, `/tournaments/[event-slug]/standings`,
    `/tournaments/[event-slug]/pairings` from at least two geographic regions.
  - Confirm `x-vercel-cache: HIT` on the second request (check Network tab or `curl -I`).

- [ ] **Verify tag-invalidation is wired up for this tournament's tags**.
  - Check that `import-tick` / standings/pairings importers call `revalidateTag` with the correct
    tournament tag after each import run.
  - See `apps/web/src/lib/data/*-endpoints.ts` for the `cacheTag()` calls.

### T-1 day — Architecture sanity check

- [ ] **Confirm payload-driven realtime is deployed** (no refetch-on-event amplification).
  - The `postgres_changes` handlers in match/pairings client components must call
    `queryClient.setQueryData(payload.new)`, NOT `queryClient.invalidateQueries()` or `refetch()`.
  - See `using-realtime` skill — "payload-driven mandate" section.

- [ ] **Confirm registration-count on public tournament page is cached** (no per-spectator websocket).
  - The `registrations-{tournamentId}` realtime channel was removed from the public tournament
    sidebar after Phase 0 fix #3. The count is now tag-revalidated cached data.
  - Verify: no `supabase.channel('registrations-...')` subscription in the public (non-authed) view.

- [ ] **Check the DB compute upgrade is active** — confirm in Dashboard → Project Settings →
  Infrastructure. Note the new tier in the incident log.

---

## During-event monitoring

### What to watch and where

| Metric                              | Location                                                        | Threshold / action trigger                      |
| ----------------------------------- | --------------------------------------------------------------- | ----------------------------------------------- |
| Realtime concurrent connections     | Dashboard → Realtime → Connections                              | >7,000 → shed realtime (see incident levers)    |
| Realtime message throughput         | Dashboard → Realtime → Messages                                 | Sustained >2,000 msg/s → investigate source     |
| DB CPU utilization                  | Dashboard → Reports → Database CPU                              | >80% sustained → scale compute immediately      |
| DB active connections               | Dashboard → Reports → Connections                               | >80% of pool limit → check for connection leaks |
| `/api/v1` CDN cache hit rate        | Vercel Dashboard → Analytics → Cache                            | <80% hit rate → check tag invalidation          |
| Error rate on report-game / check-in | Vercel Dashboard → Functions → Error rate                      | >1% errors → investigate; players feel this     |
| Supabase edge function errors       | Dashboard → Edge Functions → Logs                               | Any `import-tick` failures → manual recovery    |

### Monitoring cadence

- **Round transitions** (highest-risk moment): watch realtime connections + DB CPU for 3–5 minutes
  after pairings post. This is when all ~7k active players navigate to the pairings page.
- **Between rounds**: 5-minute checks are sufficient.
- Set a browser tab open on the Supabase Realtime dashboard throughout the event.

---

## Incident levers

### Realtime connections approaching ceiling

**Symptoms:** connection count climbs above 7,500 (within 25% of the 10k ceiling).

1. **Do not panic at 7,000** — the ceiling was requested at 7k; if Supabase honored it, the actual
   ceiling is 10k. You have headroom.
2. **Contact Supabase support immediately** to request an emergency quota increase. Include: project
   ref, current count, expected peak, event name.
3. **Check for spectator leaks** — are any unauthenticated sessions somehow opening websockets?
   (Should be impossible with the Phase 2 anon-revoke in place, but verify.)
4. **If count exceeds 9,000 with no relief:** shed realtime by disabling the realtime feature flag
   or deploying a build with realtime channels disabled. Players continue playing; the
   match-page UI falls back to manual refresh. Standings/pairings remain SSR-served (unaffected).

### DB CPU spike

**Symptoms:** CPU >80% sustained for >2 minutes.

1. **Immediate:** check Dashboard → Reports → Slow Queries for any N+1 or unbounded queries that
   snuck in (common culprit: a new feature deployed close to the event).
2. **Scale compute** if the tier allows a live upgrade (some tier steps require a maintenance window —
   know this ahead of time).
3. **Check import-tick** — if pairings are importing every 60s and the round has 7k matches,
   confirm the import query is using the batch-insert path, not individual upserts.
4. **If CPU stays high:** drop import frequency temporarily (pg_cron job interval) to reduce the
   write load. Spectators and participants can tolerate 3–5 minute standing refresh windows.

### `/api/v1` cache miss storm

**Symptoms:** CDN cache hit rate drops suddenly; Vercel function invocations spike.

1. **Check `revalidateTag` calls** — did an import run fire `revalidateTag` with a wildcard or
   top-level tag that busted unrelated cached responses?
2. **Cache will re-warm on its own** — the next request per cache key re-populates it. The storm
   is self-healing unless a bug is re-busting on every import tick.
3. If `import-tick` is the source: temporarily disable the scheduled job, fix the tag-scope bug,
   re-enable.

### `import-tick` failures

- See the import pipeline runbook (future doc) for full recovery steps.
- Short version: check `Dashboard → Edge Functions → import-tick → Logs` for the error, then use
  the admin recovery UI (`/admin/import-recovery`) to manually queue a retry.

---

## Post-event

### Immediately after the final round

- [ ] **Confirm final standings and pairings are fully imported** and displaying correctly on the
  public tournament page.
- [ ] **Note peak metrics** from the Supabase dashboard (realtime peak connections, DB CPU peak,
  message throughput peak). Add them to the event's incident log entry even if no incidents occurred.

### Within 24 hours

- [ ] **Scale the DB compute tier back down** to the standard production tier.
  - Dashboard → Project Settings → Compute → Downgrade.
  - This stops the per-hour compute overage billing.
- [ ] **Release the temporary quota** if Supabase provisioned it as a one-time raise (confirm with
  support whether it's permanent or event-scoped).

### Learnings pass

- [ ] Write a short post-event note (append to this file under a `## Event Log` section, or file a
  Linear ticket) capturing:
  - Peak realtime connections reached
  - Peak DB CPU
  - Any incidents and which levers were pulled
  - Anything that should change in this runbook before the next event

---

## Related docs

- `docs/cost-model.md` — ongoing cost surface, billing-alert checklist, and data-retention policy
  (this runbook is the event-time spike companion to that doc)
- `docs/decisions/2026-06-11-data-access-and-rls-decisions.md` — cost model, architecture decisions,
  realtime carve-out (post-decision consideration #0)
- `.claude/skills/using-realtime/SKILL.md` — payload-driven pattern, column-homogeneous-sensitivity
  rule, publication requirements
- `.claude/skills/reviewing-caching/SKILL.md` — S-bucket API route caching, tag invalidation
- `docs/setup/supabase-production.md` — Supabase dashboard reference

---

## Event log

_No events recorded yet. Append entries here after each marquee event._
