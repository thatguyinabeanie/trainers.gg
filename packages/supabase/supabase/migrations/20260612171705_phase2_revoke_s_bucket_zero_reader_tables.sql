-- ============================================================================
-- Migration: Phase 2 Task 9 — Step 1
--   Revoke anon + authenticated SELECT on the 11 "zero-reader" base tables.
--   (The audit named 13, but `posts` + `post_likes` were already dropped on
--    2026-03-24, so 11 live tables remain — see the NOTE below the header.)
--
-- CONTEXT
-- -------
-- The data-access architecture audit (docs/audits/2026-06-11-rls-audit.md)
-- classified public.tournament_pairings and 12 other tables as "S-bucket"
-- (same data for all viewers, safe to serve publicly) but found that their
-- base-table SELECT grants to anon/authenticated are no longer needed: every
-- legitimate read either (a) goes through a service-role server fetcher that
-- bypasses grants entirely, or (b) does not exist yet (new reads will be
-- added through service-role or /api/v1 routes).
--
-- Unlike the remaining 18 S-bucket tables (revoked in Step 4, gated on the
-- Part A/B reader migrations completing), these tables have ZERO client
-- reads today — confirmed by the audit. They can be revoked immediately,
-- ahead of any app changes, with no runtime impact.
--
-- WHY REVOKE SELECT (not just rely on RLS)?
-- -----------------------------------------
-- RLS is the primary barrier. Grant revocation adds a second, grant-level
-- wall: if a future migration accidentally creates a permissive SELECT policy,
-- the grant is already absent so the change cannot be exploited through the
-- anon/authenticated PostgREST API paths. Defense-in-depth.
--
-- IDEMPOTENCY
-- -----------
-- REVOKE is naturally idempotent — revoking an absent privilege is a no-op
-- and does not error. No IF EXISTS guard is needed. This migration replays
-- cleanly on a fresh db:reset.
--
-- SCOPE LIMITS
-- ------------
-- Only SELECT is revoked here. INSERT / UPDATE / DELETE were already handled
-- in migration 20260611020500_revoke_unused_table_grants.sql (or were never
-- granted). The realtime five (notifications, match_games, match_messages,
-- tournament_matches, tournament_rounds), users, and the two public views
-- (public_user_profiles, public_tournament_registrations) are explicitly
-- excluded and must never be touched by this migration.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- tournament_pairings
--   Pairing assignments per phase round. No client reads exist — pairings are
--   displayed through service-role server fetchers and will move to the
--   /api/v1/tournaments/[id]/pairings route (Task 9 Step 3, T3b).
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.tournament_pairings FROM anon, authenticated;
COMMENT ON TABLE public.tournament_pairings IS
  'Pairing assignments per tournament phase/round. '
  'Base anon+authenticated SELECT revoked Phase 2 Task 9 (2026-06-12); '
  'reads via service-role server fetchers / /api/v1.';

-- ----------------------------------------------------------------------------
-- tournament_team_sheets
--   Team sheet submissions per registration. No client reads — staff access
--   goes through service-role; public team-sheet visibility is handled by
--   the teams / team_pokemon tables (Part B swap, Step 2).
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.tournament_team_sheets FROM anon, authenticated;
COMMENT ON TABLE public.tournament_team_sheets IS
  'Team sheet submissions linked to tournament registrations. '
  'Base anon+authenticated SELECT revoked Phase 2 Task 9 (2026-06-12); '
  'reads via service-role server fetchers / /api/v1.';

-- ----------------------------------------------------------------------------
-- tournament_opponent_history
--   Per-player opponent history used for pairing tie-breaking. No client reads
--   — queried only by the pairing engine via service-role.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.tournament_opponent_history FROM anon, authenticated;
COMMENT ON TABLE public.tournament_opponent_history IS
  'Per-player opponent history for Swiss pairing tie-breaking. '
  'Base anon+authenticated SELECT revoked Phase 2 Task 9 (2026-06-12); '
  'reads via service-role server fetchers / /api/v1.';

-- ----------------------------------------------------------------------------
-- tournament_events
--   Discrete event log for tournament lifecycle transitions (e.g. round
--   started, pairing generated). No client reads — admin observability only,
--   via service-role.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.tournament_events FROM anon, authenticated;
COMMENT ON TABLE public.tournament_events IS
  'Tournament lifecycle event log (round transitions, pairing events). '
  'Base anon+authenticated SELECT revoked Phase 2 Task 9 (2026-06-12); '
  'reads via service-role server fetchers / /api/v1.';

-- ----------------------------------------------------------------------------
-- tournament_templates
--   Reusable tournament configuration templates. No client reads — admins
--   access these through service-role in the tournament-create flow.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.tournament_templates FROM anon, authenticated;
COMMENT ON TABLE public.tournament_templates IS
  'Reusable tournament configuration templates. '
  'Base anon+authenticated SELECT revoked Phase 2 Task 9 (2026-06-12); '
  'reads via service-role server fetchers / /api/v1.';

-- ----------------------------------------------------------------------------
-- tournament_template_phases
--   Phase definitions belonging to a tournament template. No client reads —
--   accessed only via service-role alongside tournament_templates.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.tournament_template_phases FROM anon, authenticated;
COMMENT ON TABLE public.tournament_template_phases IS
  'Phase definitions for tournament templates. '
  'Base anon+authenticated SELECT revoked Phase 2 Task 9 (2026-06-12); '
  'reads via service-role server fetchers / /api/v1.';

-- ----------------------------------------------------------------------------
-- team_slots
--   Usage fact table: one row per Pokemon slot per team per tournament source.
--   Queried only by the usage RPC layer via service-role; never read directly
--   by client components.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.team_slots FROM anon, authenticated;
COMMENT ON TABLE public.team_slots IS
  'Usage fact table: one row per Pokemon slot per team per tournament source. '
  'Base anon+authenticated SELECT revoked Phase 2 Task 9 (2026-06-12); '
  'reads via service-role usage RPC layer / /api/v1.';

-- ----------------------------------------------------------------------------
-- permissions
--   Permission name registry (e.g. "tournament.manage"). Looked up only by
--   SECURITY DEFINER functions (has_community_permission) via service-role;
--   no direct client reads.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.permissions FROM anon, authenticated;
COMMENT ON TABLE public.permissions IS
  'Permission name registry for community/tournament access control. '
  'Base anon+authenticated SELECT revoked Phase 2 Task 9 (2026-06-12); '
  'reads via SECURITY DEFINER helpers (service-role) / /api/v1.';

-- ----------------------------------------------------------------------------
-- role_permissions
--   Mapping of community roles to their granted permissions. Consumed only
--   by SECURITY DEFINER permission-check functions via service-role.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.role_permissions FROM anon, authenticated;
COMMENT ON TABLE public.role_permissions IS
  'Community role → permission mapping. '
  'Base anon+authenticated SELECT revoked Phase 2 Task 9 (2026-06-12); '
  'reads via SECURITY DEFINER helpers (service-role) / /api/v1.';

-- ----------------------------------------------------------------------------
-- follows
--   User follow/follower relationships. Social features are deprioritized;
--   no client reads exist. Future follow-related pages will use /api/v1.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.follows FROM anon, authenticated;
COMMENT ON TABLE public.follows IS
  'User follow/follower relationships (social feature, deprioritized). '
  'Base anon+authenticated SELECT revoked Phase 2 Task 9 (2026-06-12); '
  'reads via service-role server fetchers / /api/v1.';

-- NOTE: `posts` and `post_likes` were in the 2026-06-11 audit's zero-reader
-- list but were already DROPPED on 2026-03-24
-- (20260324000000_drop_posts_tables.sql). They no longer exist, so REVOKE on
-- them would error ("relation does not exist"). They are intentionally omitted
-- here — this migration revokes 11 tables, not the audit's stale 13.

-- ----------------------------------------------------------------------------
-- pds_handles
--   AT Protocol (Bluesky) handle assignments for trainers.gg users. Read only
--   by the AT Protocol integration layer via service-role; no direct client
--   reads.
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.pds_handles FROM anon, authenticated;
COMMENT ON TABLE public.pds_handles IS
  'AT Protocol (Bluesky) handle assignments for trainers.gg users. '
  'Base anon+authenticated SELECT revoked Phase 2 Task 9 (2026-06-12); '
  'reads via service-role server fetchers / /api/v1.';
