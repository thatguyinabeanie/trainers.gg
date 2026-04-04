-- =============================================================================
-- Fix multiple permissive RLS policies (performance linter warnings)
-- =============================================================================
--
-- Resolves 11 "Multiple Permissive Policies" linter warnings by:
--   1. Dropping redundant policies that duplicate coverage
--   2. Consolidating overlapping policies into single policies with OR
--   3. Splitting FOR ALL policies that overlap with dedicated SELECT policies
--   4. Adding TO <role> restrictions to service_role policies
--
-- Also fixes stale t.organization_id references → t.community_id in
-- match_games and match_messages policies (column renamed in
-- 20260328023929_rename_organizations_to_communities.sql but the match
-- policies were never updated).
-- =============================================================================

-- =============================================================================
-- 1. communities SELECT
-- "Communities are viewable by everyone" uses USING(true), exposing all
-- communities (pending/suspended/rejected) to everyone. Replace it with a
-- scoped policy that mirrors the app-layer filter in listPublicCommunities().
--
-- Three-tier visibility:
--   1. status = 'active'              → visible to everyone (public)
--   2. owner_user_id = auth.uid()     → owners see their own regardless of status
--   3. is_site_admin()                → site admins see all communities
-- =============================================================================

DROP POLICY IF EXISTS "Communities are viewable by everyone" ON public.communities;
DROP POLICY IF EXISTS "Site admins can view all communities" ON public.communities;
DROP POLICY IF EXISTS "Communities are publicly visible" ON public.communities;

CREATE POLICY "Communities are publicly visible"
  ON public.communities FOR SELECT TO anon, authenticated
  USING (
    status = 'active'
    OR owner_user_id = (SELECT auth.uid())
    OR public.is_site_admin()
  );

-- =============================================================================
-- 2. communities UPDATE
-- Consolidate "Community owners can update" and "Site admins can update
-- communities" into a single policy using OR.
-- =============================================================================

DROP POLICY IF EXISTS "Community owners can update" ON public.communities;
DROP POLICY IF EXISTS "Site admins can update communities" ON public.communities;
DROP POLICY IF EXISTS "Community owners or site admins can update" ON public.communities;

CREATE POLICY "Community owners or site admins can update"
  ON public.communities FOR UPDATE TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR public.is_site_admin()
  )
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
    OR public.is_site_admin()
  );

-- =============================================================================
-- 3. community_requests SELECT
-- Consolidate "Users can view own community requests" and "Site admins can
-- view all community requests" into a single policy using OR.
-- =============================================================================

DROP POLICY IF EXISTS "Users can view own community requests" ON public.community_requests;
DROP POLICY IF EXISTS "Site admins can view all community requests" ON public.community_requests;
DROP POLICY IF EXISTS "Users can view their community requests" ON public.community_requests;

CREATE POLICY "Users can view their community requests"
  ON public.community_requests FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_site_admin()
  );

-- =============================================================================
-- 4. match_games SELECT + stale column reference
--
-- Two issues:
--   a) Both "Match participants and staff can view match games" (SELECT) and
--      "Tournament staff can manage match games" (FOR ALL) cover SELECT for
--      authenticated.
--   b) Both policies still reference t.organization_id, which was renamed to
--      t.community_id in 20260328023929.
--
-- Fix: Recreate the SELECT policy with the correct column name. Replace the
-- FOR ALL "manage" policy with explicit INSERT/UPDATE/DELETE policies so it no
-- longer overlaps with the SELECT policy.
-- =============================================================================

-- Recreate SELECT policy with correct community_id column
DROP POLICY IF EXISTS "Match participants and staff can view match games" ON public.match_games;
CREATE POLICY "Match participants and staff can view match games"
  ON public.match_games FOR SELECT TO authenticated
  USING (
    -- Match participant
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.alts a ON a.user_id = (SELECT auth.uid())
      WHERE m.id = match_id
        AND (m.alt1_id = a.id OR m.alt2_id = a.id)
    )
    OR
    -- Community staff with tournament.manage permission
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_community_permission(t.community_id, 'tournament.manage')
    )
  );

-- Replace FOR ALL with explicit write-only policies (SELECT covered above)
DROP POLICY IF EXISTS "Tournament staff can manage match games" ON public.match_games;
DROP POLICY IF EXISTS "Tournament staff can insert match games" ON public.match_games;

CREATE POLICY "Tournament staff can insert match games"
  ON public.match_games FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_community_permission(t.community_id, 'tournament.manage')
    )
  );

DROP POLICY IF EXISTS "Tournament staff can update match games" ON public.match_games;
CREATE POLICY "Tournament staff can update match games"
  ON public.match_games FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_community_permission(t.community_id, 'tournament.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_community_permission(t.community_id, 'tournament.manage')
    )
  );

DROP POLICY IF EXISTS "Tournament staff can delete match games" ON public.match_games;
CREATE POLICY "Tournament staff can delete match games"
  ON public.match_games FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_community_permission(t.community_id, 'tournament.manage')
    )
  );

-- =============================================================================
-- 5. match_messages INSERT + stale column reference
--
-- Two issues:
--   a) "Match participants can send messages" and "Tournament staff can send
--      judge/system messages" are separate INSERT policies for authenticated.
--   b) Both still reference t.organization_id (see note above).
--
-- Also fix the SELECT policy stale column reference while we're here (not
-- flagged by the linter but broken in the same way).
-- =============================================================================

-- Fix SELECT policy column reference (not a linter hit, but broken)
DROP POLICY IF EXISTS "Match participants and staff can view messages" ON public.match_messages;
CREATE POLICY "Match participants and staff can view messages"
  ON public.match_messages FOR SELECT TO authenticated
  USING (
    -- Match participant
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.alts a ON a.user_id = (SELECT auth.uid())
      WHERE m.id = match_id
        AND (m.alt1_id = a.id OR m.alt2_id = a.id)
    )
    OR
    -- Community staff with tournament.manage permission
    EXISTS (
      SELECT 1 FROM public.tournament_matches m
      JOIN public.tournament_rounds r ON m.round_id = r.id
      JOIN public.tournament_phases p ON r.phase_id = p.id
      JOIN public.tournaments t ON p.tournament_id = t.id
      WHERE m.id = match_id
        AND public.has_community_permission(t.community_id, 'tournament.manage')
    )
  );

-- Consolidate two INSERT policies into one
DROP POLICY IF EXISTS "Match participants can send messages" ON public.match_messages;
DROP POLICY IF EXISTS "Tournament staff can send judge/system messages" ON public.match_messages;
DROP POLICY IF EXISTS "Authorized users can send messages" ON public.match_messages;

CREATE POLICY "Authorized users can send messages"
  ON public.match_messages FOR INSERT TO authenticated
  WITH CHECK (
    -- Players: player-type messages only, for their own alt in the match
    (
      message_type = 'player'
      AND alt_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.tournament_matches m
        JOIN public.alts a ON a.user_id = (SELECT auth.uid())
        WHERE m.id = match_id
          AND a.id = alt_id
          AND (m.alt1_id = a.id OR m.alt2_id = a.id)
      )
    )
    OR
    -- Community staff: judge/system-type messages for their tournament
    (
      message_type IN ('judge', 'system')
      AND EXISTS (
        SELECT 1 FROM public.tournament_matches m
        JOIN public.tournament_rounds r ON m.round_id = r.id
        JOIN public.tournament_phases p ON r.phase_id = p.id
        JOIN public.tournaments t ON p.tournament_id = t.id
        WHERE m.id = match_id
          AND public.has_community_permission(t.community_id, 'tournament.manage')
      )
    )
  );

-- =============================================================================
-- 6. tournament_team_sheets SELECT
-- "Service role manages team sheets" is FOR ALL without a role restriction, so
-- PostgreSQL evaluates it for every role (anon, authenticated, etc.), causing
-- SELECT overlap with "Tournament team sheets are public". Restrict the policy
-- to TO service_role so it only applies to that role.
-- =============================================================================

DROP POLICY IF EXISTS "Service role manages team sheets" ON public.tournament_team_sheets;
CREATE POLICY "Service role manages team sheets"
  ON public.tournament_team_sheets FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 7. user_group_roles INSERT/DELETE
-- The communities rename migration (20260328023929) recreated individual per-role
-- INSERT/DELETE policies without first dropping the consolidated "Authorized
-- users" policies from 20260201000002_fix_rls_performance.sql. Both sets now
-- coexist with identical logic, causing 4-policy overlap for each action.
--
-- Fix: Drop the individual community policies. Recreate the consolidated
-- policies using the current canonical function names (is_community_owner,
-- get_community_id_from_group_role, user_has_community_role) instead of the
-- now-aliased org-prefixed names.
-- =============================================================================

DROP POLICY IF EXISTS "Community owners can add users to their groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Community admins can add users to lower groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Head judges can add users to judge groups" ON public.user_group_roles;

DROP POLICY IF EXISTS "Authorized users can add group role assignments" ON public.user_group_roles;
CREATE POLICY "Authorized users can add group role assignments"
  ON public.user_group_roles FOR INSERT TO authenticated
  WITH CHECK (
    -- Community owners: can add any role in their community
    public.is_community_owner(
      public.get_community_id_from_group_role(group_role_id),
      (SELECT auth.uid())
    )
    -- Community admins: can add head_judge and judge roles
    OR (
      public.get_role_name_from_group_role(group_role_id) IN ('org_head_judge', 'org_judge')
      AND public.user_has_community_role(
        public.get_community_id_from_group_role(group_role_id),
        (SELECT auth.uid()),
        'org_admin'
      )
    )
    -- Head judges: can add judge roles only
    OR (
      public.get_role_name_from_group_role(group_role_id) = 'org_judge'
      AND public.user_has_community_role(
        public.get_community_id_from_group_role(group_role_id),
        (SELECT auth.uid()),
        'org_head_judge'
      )
    )
  );

DROP POLICY IF EXISTS "Community owners can remove users from their groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Community admins can remove users from lower groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Head judges can remove users from judge groups" ON public.user_group_roles;

DROP POLICY IF EXISTS "Authorized users can remove group role assignments" ON public.user_group_roles;
CREATE POLICY "Authorized users can remove group role assignments"
  ON public.user_group_roles FOR DELETE TO authenticated
  USING (
    -- Community owners: can remove any role in their community
    public.is_community_owner(
      public.get_community_id_from_group_role(group_role_id),
      (SELECT auth.uid())
    )
    -- Community admins: can remove head_judge and judge roles
    OR (
      public.get_role_name_from_group_role(group_role_id) IN ('org_head_judge', 'org_judge')
      AND public.user_has_community_role(
        public.get_community_id_from_group_role(group_role_id),
        (SELECT auth.uid()),
        'org_admin'
      )
    )
    -- Head judges: can remove judge roles only
    OR (
      public.get_role_name_from_group_role(group_role_id) = 'org_judge'
      AND public.user_has_community_role(
        public.get_community_id_from_group_role(group_role_id),
        (SELECT auth.uid()),
        'org_head_judge'
      )
    )
  );
