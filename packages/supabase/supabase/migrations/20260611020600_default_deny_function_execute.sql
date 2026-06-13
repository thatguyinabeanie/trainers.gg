-- Migration: Default-deny EXECUTE on public functions (RLS audit finding #5 / decision #5)
--
-- ROOT CAUSE
-- ----------
-- Postgres grants EXECUTE to the implicit PUBLIC role on every newly created
-- function by default. In the Supabase model, the `anon` and `authenticated`
-- API roles are members of PUBLIC, so EVERY function in the `public` schema is
-- callable over the REST/RPC API by anyone holding the anon key — including
-- privileged, SECURITY DEFINER RPCs such as:
--   * admin_alter_cron_schedule / admin_get_cron_schedules  (cron control)
--   * register_for_tournament_atomic / accept_tournament_invitation_atomic /
--     send_tournament_invitations_atomic                    (tournament writes)
--   * set_claim, is_site_admin, is_sudo_active, get_active_sudo_session,
--     get_active_impersonation_session                      (admin/sudo plumbing)
--   * custom_access_token_hook                              (auth JWT hook)
-- Several of these never had an explicit GRANT — they were anon-executable
-- purely via the PUBLIC default. Relying on each function being SECURITY INVOKER
-- + RLS is fragile; the correct fix is to remove the blanket grant and re-grant
-- EXECUTE explicitly, per function, to the minimum role(s) that actually call it.
--
-- STRATEGY
-- --------
-- 1. ALTER DEFAULT PRIVILEGES so FUTURE functions are not auto-granted to PUBLIC.
-- 2. REVOKE EXECUTE on ALL EXISTING public functions from PUBLIC/anon/authenticated.
-- 3. Re-GRANT EXECUTE on the EXHAUSTIVE allowlist of client-callable RPCs, each
--    to the correct role, using a name-based loop over pg_proc. The loop grants
--    every overload of a named function, which is intentionally resilient to the
--    overload churn these functions have seen across migrations (e.g.
--    get_species_teammates / get_species_usage were dropped & recreated with
--    different signatures). This avoids hand-guessing argument-type lists.
-- 4. custom_access_token_hook is handled separately — only supabase_auth_admin.
--
-- service_role is intentionally NOT revoked: it bypasses these grants and is
-- used by edge functions / server-side service clients. We only tighten the
-- two API-exposed roles (anon, authenticated) and the implicit PUBLIC role.
--
-- NOTE: functions in non-public schemas (e.g. limitless.atomic_clear_tournament,
-- granted only to service_role) are out of scope — this migration touches the
-- public schema only.
--
-- See companion audit migration 20260611020500_revoke_unused_table_grants.sql.

-- ---------------------------------------------------------------------------
-- 1. Stop auto-granting EXECUTE to PUBLIC on future public functions.
--    Applied for both the migration role (postgres) and any object owner so
--    functions created later by either do not silently re-open to PUBLIC.
-- ---------------------------------------------------------------------------
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ---------------------------------------------------------------------------
-- 2. Broad revoke of EXECUTE on every existing public function.
--    PUBLIC covers anon/authenticated transitively, but we name them
--    explicitly as well in case a prior migration granted them directly.
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Re-grant EXECUTE to the EXHAUSTIVE client-callable RPC allowlist.
--
--    The allowlist below was derived by enumerating every `.rpc("...")` call
--    in apps/web/src, apps/mobile/src and packages/supabase/src (both single-
--    line and multi-line call forms). Each name maps to the minimum role:
--      * ANON_OR_AUTH : reachable on public (logged-out) pages — these run
--                       under the anon key via createStaticClient() / mobile
--                       anon reads, so they MUST also be granted to anon.
--      * AUTH_ONLY    : only invoked from authenticated server/client contexts
--                       (mutations, admin, match ops, sudo/impersonation,
--                       authenticated dashboard reads).
--
--    Grants are applied by name over pg_proc so all overloads are covered.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  -- Public/anon-reachable read RPCs (also callable when authenticated).
  -- Confirmed by existing `GRANT ... TO anon, authenticated` in prior migrations
  -- and/or invocation via createStaticClient() (anon key) on public pages.
  anon_or_auth_fns text[] := ARRAY[
    'get_format_events',
    'get_usage_timeseries',
    'get_usage_by_source',
    'get_usage_conversion',
    'get_usage_pipeline',
    'get_species_usage',
    'get_species_usage_detail',
    'get_species_teammates',
    'get_species_move_combos',
    'get_coach_badges',
    'get_registration_counts',
    'get_player_ratings_with_rank',
    'get_community_tournament_counts'
  ];

  -- Authenticated-only RPCs: mutations, admin/cron, match management,
  -- sudo/impersonation plumbing, and authenticated-only dashboard reads.
  auth_only_fns text[] := ARRAY[
    -- Team builder mutations
    'add_pokemon_to_team',
    'remove_pokemon_from_team',
    'reorder_team_pokemon',
    'delete_team',
    'fork_team',
    -- Tournament lifecycle / registration / invitations
    'register_for_tournament_atomic',
    'accept_tournament_invitation_atomic',
    'send_tournament_invitations_atomic',
    'advance_to_top_cut',
    'start_round',
    'check_no_show_escalation',
    -- Match flow
    'start_match',
    'reset_match',
    'report_match_result',
    'submit_game_selection',
    'get_match_games_for_player',
    'request_judge',
    'cancel_judge_request',
    'clear_judge_request',
    -- Admin / cron control
    'admin_alter_cron_schedule',
    'admin_get_cron_schedules',
    -- Permission / role plumbing (called from authenticated contexts)
    'has_community_permission',
    'is_site_admin',
    'is_sudo_active',
    'set_claim',
    'get_active_sudo_session',
    'get_active_impersonation_session',
    -- Authenticated dashboard read
    'get_top_returning_players'
  ];

  fn_name text;
  proc record;
  granted_count int;
BEGIN
  -- anon + authenticated
  FOREACH fn_name IN ARRAY anon_or_auth_fns LOOP
    granted_count := 0;
    FOR proc IN
      SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn_name
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated;', proc.sig);
      granted_count := granted_count + 1;
    END LOOP;
    IF granted_count = 0 THEN
      RAISE WARNING 'RLS audit #5: expected client-callable RPC public.% not found — grant skipped', fn_name;
    END IF;
  END LOOP;

  -- authenticated only
  FOREACH fn_name IN ARRAY auth_only_fns LOOP
    granted_count := 0;
    FOR proc IN
      SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn_name
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated;', proc.sig);
      granted_count := granted_count + 1;
    END LOOP;
    IF granted_count = 0 THEN
      RAISE WARNING 'RLS audit #5: expected client-callable RPC public.% not found — grant skipped', fn_name;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 4. custom_access_token_hook — the Supabase Auth JWT hook.
--    It must be executable ONLY by supabase_auth_admin (the role the Auth
--    server runs the hook under). It is never a client RPC. Signature is
--    custom_access_token_hook(jsonb) (see 20251109... auth hook migrations).
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook(jsonb)
  TO supabase_auth_admin;

-- ---------------------------------------------------------------------------
-- EXPECTED CLIENT-CALLABLE RPC ALLOWLIST (guardrail reference)
-- ---------------------------------------------------------------------------
-- If a new client RPC is added, append it to the correct array above AND this
-- list. If a feature breaks at runtime with a "permission denied for function"
-- error, the RPC it calls is missing from these grants.
--
-- anon + authenticated (public-data reads):
--   get_format_events, get_usage_timeseries, get_usage_by_source,
--   get_usage_conversion, get_usage_pipeline, get_species_usage,
--   get_species_usage_detail, get_species_teammates, get_species_move_combos,
--   get_coach_badges, get_registration_counts, get_player_ratings_with_rank,
--   get_community_tournament_counts
--
-- authenticated only:
--   add_pokemon_to_team, remove_pokemon_from_team, reorder_team_pokemon,
--   delete_team, fork_team, register_for_tournament_atomic,
--   accept_tournament_invitation_atomic, send_tournament_invitations_atomic,
--   advance_to_top_cut, start_round, check_no_show_escalation, start_match,
--   reset_match, report_match_result, submit_game_selection,
--   get_match_games_for_player, request_judge, cancel_judge_request,
--   clear_judge_request, admin_alter_cron_schedule, admin_get_cron_schedules,
--   has_community_permission, is_site_admin, is_sudo_active, set_claim,
--   get_active_sudo_session, get_active_impersonation_session,
--   get_top_returning_players
--
-- supabase_auth_admin only:
--   custom_access_token_hook(jsonb)
--
-- CI guardrail test deferred — a meaningful guardrail (assert no unexpected
-- function is anon/authenticated-executable) requires DB introspection over
-- pg_proc/information_schema.role_routine_grants, and the repo's Jest infra
-- mocks the Supabase client (no live DB). This SQL allowlist block is the
-- interim guardrail until a DB-introspection harness exists.
