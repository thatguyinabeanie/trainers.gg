---
name: phase2-wave-c-incomplete
description: Phase 2 Task 9 (S-bucket base-table SELECT revoke) is BLOCKED — Wave C client-read migration was only partially done; many useSupabaseQuery reads of S-bucket base tables remain
metadata:
  type: project
---

The Phase 2 S-bucket base-table SELECT revoke (Task 9 in `docs/decisions/architecture-phase2-plan.md`) cannot be written yet.

**Why:** Wave C (Tasks 5–8 — migrate S-bucket _client_ reads onto `/api/v1`) landed only partially. As of 2026-06-12 on branch `docs/architecture-considerations`, many client `useSupabaseQuery` (aliased `n`/`ln` in source) calls still read S-bucket BASE tables through the browser client (anon for logged-out, authenticated otherwise). Revoking `anon`/`authenticated` SELECT on those base tables would break those reads at runtime. Most severe examples:

- `apps/web/src/hooks/use-current-user.ts` → `getCurrentUser` reads `alts` (S-bucket, `USING(true)`). Core hook — breaking it breaks the whole authed dashboard.
- `apps/web/src/app/(app)/tournaments/[tournamentSlug]/public-pairings.tsx` → reads `tournament_phases`, `tournament_pairings`, `tournament_standings`, `alts` as a PUBLIC page via the anon browser client. Anon revoke breaks logged-out viewers.
- Dashboard `stats-client.tsx`, `overview-client.tsx`, `teams-sub-table.tsx`, `tournaments-client.tsx`, `topnav-auth-section.tsx`, and many `tournaments/manage/*` + `tournaments/create/*` components read `alts`/`teams`/`team_pokemon`/`communities`/`tournaments`/`tournament_phases`/`tournament_player_stats` via `useSupabaseQuery`.

**How to apply:** Before re-attempting Task 9, finish Wave C — every client `useSupabaseQuery` read of an S-bucket base table must route through `/api/v1`. The realtime-six carve-out (`notifications`, `match_games`, `match_messages`, `tournament_matches`, `tournament_registrations`, `tournament_rounds`) keep `authenticated` SELECT; `users` keeps `authenticated` self-read (RLS `auth.uid()=id OR is_site_admin()`) so do NOT revoke it either. The public views `public_user_profiles` + `public_tournament_registrations` keep anon/authenticated SELECT. Phase 0/1 already locked `users`/`tournament_registrations` policy quals (PR #354 work). Default Postgres grants (finding #9) still grant anon/authenticated SELECT on nearly every table — the grants, not policies, are the revoke target.
