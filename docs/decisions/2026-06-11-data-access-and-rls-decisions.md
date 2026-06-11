# Data-Access & RLS Decisions — June 11, 2026

Decisions from the cost/architecture planning session (Vercel vs Supabase edge functions → data-access architecture → RLS audit). Companion to `docs/audits/2026-06-11-rls-audit.md`.

## Context

- Goal: optimize for best user experience while optimizing cost and caching, at a target scale of Limitless-host volume (~170 tournaments/mo, median ~20 players) with periodic marquee events (~10k registered / ~7k concurrent).
- Cost analysis found: function placement (edge functions vs Vercel) is a rounding error (~$10/mo either way); the real bill is **Supabase DB compute + Realtime**, driven by marquee-event concurrency. Caching shifts cost from scales-with-audience to scales-with-active-players.
- Security constraints stated by the owner:
  1. No anonymous/browser open access to the Data API (no de-facto public API via the anon key).
  2. Authenticated users must not be able to scrape data they're not supposed to see.
  3. A deliberate, controlled public API is a future product goal.
  4. Public viewing (tournament results, standings, team sheets) must keep working for logged-out users — served via SSR/ISR, not via browser data access.

## RLS audit findings — decisions (10/10 decided)

| #   | Finding                    | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `users` PII world-readable | **View + own-row policy.** `public_user_profiles` view (id, username, bio, country, image, pds_handle…); `users` SELECT → own row + admin paths; repoint public-info queries at the view. Rejected: column REVOKE (breaks PostgREST `select=*`), `users_private` split (bigger refactor).                                                                                                                                                |
| 2   | Team sheets unguarded      | **State-gated qual.** Pre-start: **sheet owner ONLY — explicitly no organizers/staff** (anti-leak; staff can also be competitors). Active + `open_team_sheets=true`: public (spectators via SSR). Active + closed: own + staff (judges need sheets for disputes). Completed: public. No app-code change needed (match page fetches server-side with user session).                                                                       |
| 3   | Registration staff fields  | **View + lock base + private photo bucket.** Public view: id, tournament_id, alt_id, status, registered_at, checked_in_at, team_name, team_submitted_at, display_name_option, show_country_flag, in_game_name. Base table → own + staff. Rental photos move to a **private bucket + signed URLs** ("photos should not be public"). **Product note:** a staff UI surfacing `drop_notes` is planned — design the staff-only read path now. |
| 4   | Dead invitations realtime  | **Add to publication.** `ALTER PUBLICATION supabase_realtime ADD TABLE tournament_invitations;` — P-bucket qual scopes delivery.                                                                                                                                                                                                                                                                                                         |
| 5   | Anon-executable RPCs       | **Root-cause default-deny.** `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC`; revoke on existing fns; explicit `GRANT EXECUTE` per legitimately client-called RPC; CI guardrail test as backstop. Auth hook → `supabase_auth_admin` only.                                                                                                                                                            |
| 6   | Feature flags enumerable   | **Lock to admin; server-side eval.** SELECT → `is_site_admin()`. Web already evaluates server-side (Flags SDK). Verify the `clients/mobile.ts` reference during implementation.                                                                                                                                                                                                                                                          |
| 7   | Audit-log silent inserts   | **Branded service client + throw.** Audit helpers take a branded `ServiceRoleClient` type (compile-time guarantee) and throw on insert error. RLS stays deny-by-default. Rejected: admin INSERT policy, DB triggers (entries here are intent-rich).                                                                                                                                                                                      |
| 8   | Duplicate policies         | **Merge** the two `user_group_roles` SELECT policies into one OR'd qual.                                                                                                                                                                                                                                                                                                                                                                 |
| 9   | Grants ≫ policies          | **Revoke unused verbs** table-by-table so grants ≈ policies (defense-in-depth second wall; self-documenting privilege map).                                                                                                                                                                                                                                                                                                              |
| 10  | DELETE by omission         | **Draft-only DELETE + comment.** Staff with manage permission can delete `status='draft'` tournaments; published+ are never client-deletable (cancel is the verb); `COMMENT ON TABLE` documents it.                                                                                                                                                                                                                                      |

## Architecture decisions still open (decision map)

1. **Data-access split (Decision 1, pending lock):** leading candidate is the audit-backed **split model** — S-bucket (shared) reads via cached API layer; P-bucket (per-user) reads direct PostgREST+RLS; R-bucket hot tables get qual flattening or API routing. A full-L2 variant (everything through the API) remains on the table given the owner's no-over-scraping constraint; the audit fixes narrow the gap between the two.
2. **Where the API layer lives:** Supabase edge functions (Cloudflare CDN) vs Next.js BFF (Vercel Edge CDN).
3. **Spectator realtime:** live push for logged-out viewers vs SSR/cached-only (current lean: cached-only).
4. **Client caching conventions:** TanStack Query everywhere on web (replacing uncached `useSupabaseQuery`, 81 files); `@supabase-cache-helpers` adoption (PostgREST-only — fits web direct reads, not edge-function calls); staleTime tiers; SSR → `initialData` handoff.
5. **Payload-driven realtime:** update state from `payload.new` (or `setQueryData`) instead of refetch-on-event (match page currently re-reads the DB on every `match_games` event).
6. **Optimistic mutations** as the default UX pattern.
7. **Rollout order.**

## Follow-through checklist (required once architecture decisions land)

Update the agent-facing docs so future sessions inherit the decisions:

- [ ] Root `CLAUDE.md` — architecture overview + gotchas (client selection, Data API posture)
- [ ] `.claude/CLAUDE.md` — data-access architecture notes
- [ ] `.claude/skills/querying-supabase` — client selection rules
- [ ] `.claude/skills/reviewing-caching` — caching playbook changes
- [ ] `.claude/skills/building-web-app` / `building-mobile-app` — data-fetching patterns
- [ ] `.claude/skills/using-realtime` — payload-driven pattern, publication requirements, Broadcast vs postgres_changes
- [ ] `.claude/rules/supabase-patterns.md`, `architecture.md`, `nextjs-conventions.md`
- [ ] Agent memory (`MEMORY.md`) — data-access architecture summary
