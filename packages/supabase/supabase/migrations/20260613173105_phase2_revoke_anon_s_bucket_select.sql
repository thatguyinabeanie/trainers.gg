-- ============================================================================
-- Migration: Phase 2 Task 9 — Step 4
--   Revoke anon SELECT on the 19 S-bucket base tables.
--   Authenticated SELECT is explicitly KEPT (RLS remains the access wall
--   for logged-in users).
--
-- CONTEXT
-- -------
-- The data-access architecture audit (docs/audits/2026-06-11-rls-audit.md)
-- classified these 19 tables as "S-bucket" — same data for all viewers, safe
-- to serve publicly. However, serving that data through anonymous direct DB
-- access (PostgREST with the anon key) creates a second, unnecessary exposure
-- surface. Every legitimate public read is now served server-side via the
-- service-role client (SSR / Next.js Server Components), which bypasses
-- PostgREST grants entirely.
--
-- WHY anon-ONLY? (not both roles)
-- --------------------------------
-- anon and authenticated are independent Postgres roles. Revoking only anon:
--   • anon revoked  → a logged-out browser / the anon key can no longer
--     read these tables directly via PostgREST. Public pages render
--     server-side (service-role), so nothing logged-out legitimately needs
--     anon DB access after Task 1 (createStaticClient → service-role swaps).
--   • authenticated kept → logged-in users continue to read their own data
--     via the Supabase JS client + authenticated key. RLS is the wall
--     for those reads (one wall). Swapping ALL per-user reads to
--     service-role would require touching every manage/dashboard screen
--     and every useSupabaseQuery call — far more churn, higher risk, lower
--     benefit.
--
-- Decision accepted by project owner (2026-06-13). See:
--   docs/decisions/architecture-phase2-task9-step4-anon-revoke.md
--
-- WHY REVOKE SELECT (not just rely on RLS)?
-- -----------------------------------------
-- RLS is the primary barrier. Grant revocation adds a second, grant-level
-- wall: if a future migration accidentally creates a permissive SELECT policy
-- for anon, the grant is already absent so the exposure cannot occur through
-- the PostgREST/anon API path. Defense-in-depth.
--
-- IDEMPOTENCY
-- -----------
-- REVOKE is naturally idempotent — revoking an absent privilege is a no-op
-- and does not error. No IF EXISTS guard is needed. This migration replays
-- cleanly on a fresh db:reset.
--
-- SCOPE LIMITS
-- ------------
-- Only SELECT is revoked here for anon. INSERT/UPDATE/DELETE were already
-- handled in migration 20260611020500_revoke_unused_table_grants.sql (or
-- were never granted).
--
-- EXCLUSIONS (must never appear in this file)
-- -------------------------------------------
-- The following are explicitly excluded and must NOT be touched:
--   Realtime five: notifications, match_games, match_messages,
--                  tournament_matches, tournament_rounds
--   Table:         users
--   Views:         public_user_profiles, public_tournament_registrations
-- These stay anon-SELECTable so that realtime subscriptions, public user
-- lookup views, and the public registrations view continue to work for
-- unauthenticated clients.
--
-- REVOKE SET (19 tables)
-- ----------------------
-- tournaments, tournament_phases, tournament_standings,
-- tournament_player_stats, alts, teams, team_pokemon, player_ratings,
-- pokemon, communities, community_staff, groups, roles, group_roles,
-- user_group_roles, coach_profiles, announcements, user_roles,
-- tournament_registrations
-- ============================================================================

-- ----------------------------------------------------------------------------
-- tournaments
--   Core tournament records. Public pages render server-side via service-role;
--   no logged-out client needs direct anon DB access.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.tournaments FROM anon;
COMMENT ON TABLE public.tournaments IS
  'Core tournament records. '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- tournament_phases
--   Phase definitions within a tournament (Swiss rounds, cut, etc.).
--   Rendered server-side via service-role.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.tournament_phases FROM anon;
COMMENT ON TABLE public.tournament_phases IS
  'Phase definitions within a tournament (Swiss, single-elim, etc.). '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- tournament_standings
--   Final and intermediate standings per phase. Public standings pages render
--   server-side via service-role.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.tournament_standings FROM anon;
COMMENT ON TABLE public.tournament_standings IS
  'Final and intermediate standings per tournament phase. '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- tournament_player_stats
--   Per-player aggregate stats (win rate, resistance, etc.) within a
--   tournament. Served via /api/v1 routes (service-role).
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.tournament_player_stats FROM anon;
COMMENT ON TABLE public.tournament_player_stats IS
  'Per-player aggregate stats within a tournament. '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- alts
--   Player identities linked to a user account. Public profile pages render
--   server-side via service-role.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.alts FROM anon;
COMMENT ON TABLE public.alts IS
  'Player identity (alt) records linked to a user account. '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- teams
--   Team records owned by an alt. Read via the team-builder (authenticated)
--   or via service-role for public team pages.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.teams FROM anon;
COMMENT ON TABLE public.teams IS
  'Team records owned by an alt (player identity). '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- team_pokemon
--   Individual Pokemon slots within a team. Accessed via service-role for
--   public team display; authenticated for owner management.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.team_pokemon FROM anon;
COMMENT ON TABLE public.team_pokemon IS
  'Individual Pokemon slots within a team. '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- player_ratings
--   ELO/rating records per alt per format. Served via service-role on
--   public leaderboard and player profile pages.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.player_ratings FROM anon;
COMMENT ON TABLE public.player_ratings IS
  'ELO and rating records per alt per format. '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- pokemon
--   Canonical Pokemon reference rows (species metadata). Served via
--   service-role for team-builder lookups and public pages.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.pokemon FROM anon;
COMMENT ON TABLE public.pokemon IS
  'Canonical Pokemon reference data (species, base stats, etc.). '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- communities
--   Community/organization records. Public community pages render server-side
--   via service-role.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.communities FROM anon;
COMMENT ON TABLE public.communities IS
  'Community and organization records. '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- community_staff
--   Staff membership rows linking users to communities with a staff role.
--   Staff roster reads go through service-role (admin screens) or
--   authenticated (per-user context).
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.community_staff FROM anon;
COMMENT ON TABLE public.community_staff IS
  'Staff membership linking users to communities with a role. '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- groups
--   Permission group definitions. Read only by authenticated users (manage
--   screens) or service-role (background processing).
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.groups FROM anon;
COMMENT ON TABLE public.groups IS
  'Permission group definitions. '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- roles
--   Named roles in the RBAC system. Read only by authenticated/admin flows.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.roles FROM anon;
COMMENT ON TABLE public.roles IS
  'Named roles in the RBAC system. '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- group_roles
--   Mapping between groups and roles (many-to-many). Admin screens only.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.group_roles FROM anon;
COMMENT ON TABLE public.group_roles IS
  'Mapping of roles to groups (RBAC join table). '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- user_group_roles
--   Per-user group/role membership rows. Accessed via RLS-scoped
--   authenticated reads; never needs anon access.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.user_group_roles FROM anon;
COMMENT ON TABLE public.user_group_roles IS
  'Per-user group/role membership (RBAC). '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- coach_profiles
--   Coach profile records linking a user to coaching service details.
--   Public coaching pages render server-side via service-role.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.coach_profiles FROM anon;
COMMENT ON TABLE public.coach_profiles IS
  'Coach profile details (bio, rates, availability). '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- announcements
--   Site-wide or community-scoped announcement records. Rendered server-side
--   via service-role for the announcement banner.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.announcements FROM anon;
COMMENT ON TABLE public.announcements IS
  'Site-wide and community-scoped announcements. '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- user_roles
--   Site-level role assignments per user (e.g. site_admin). Accessed via
--   service-role for auth checks; never needs direct anon access.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.user_roles FROM anon;
COMMENT ON TABLE public.user_roles IS
  'Site-level role assignments per user (site_admin, etc.). '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR.';

-- ----------------------------------------------------------------------------
-- tournament_registrations
--   Player registration records per tournament. Public registration counts
--   are served via the public_tournament_registrations view (excluded from
--   this revoke). Per-registration details go through service-role or
--   authenticated reads.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.tournament_registrations FROM anon;
COMMENT ON TABLE public.tournament_registrations IS
  'Player registration records per tournament. '
  'anon SELECT revoked Phase 2 Task 9 Step 4 (2026-06-13); '
  'authenticated kept (RLS-scoped); reads via service-role/SSR. '
  'Public registration counts available via public_tournament_registrations view.';
