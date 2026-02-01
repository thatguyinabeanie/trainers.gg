-- Fix auth_rls_initplan and multiple_permissive_policies performance warnings.
--
-- auth_rls_initplan: Wrap auth.uid() calls in (SELECT ...) to avoid
-- per-row re-evaluation in RLS policies.
--
-- multiple_permissive_policies: Consolidate overlapping permissive policies
-- on the same table/role/action into single policies.

-- ============================================================
-- pokemon: drop 2 redundant SELECT policies (baseline USING(true) covers them)
--          + recreate DELETE policy with (select auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "open_teamsheet_pokemon_public" ON public.pokemon;
DROP POLICY IF EXISTS "players_view_own_tournament_pokemon" ON public.pokemon;
DROP POLICY IF EXISTS "players_delete_own_pokemon" ON public.pokemon;

CREATE POLICY "players_delete_own_pokemon"
ON public.pokemon FOR DELETE USING (
  id IN (
    SELECT tp.pokemon_id FROM public.team_pokemon tp
    WHERE tp.team_id IN (
      SELECT t.id FROM public.teams t
      WHERE t.created_by IN (
        SELECT a.id FROM public.alts a WHERE a.user_id = (SELECT auth.uid())
      )
    )
  )
);

-- ============================================================
-- team_pokemon: drop 2 redundant SELECT policies (baseline USING(true) covers them)
-- ============================================================
DROP POLICY IF EXISTS "open_teamsheet_team_pokemon_public" ON public.team_pokemon;
DROP POLICY IF EXISTS "players_view_own_tournament_team_pokemon" ON public.team_pokemon;

-- ============================================================
-- teams: consolidate 3 SELECT policies into 1 with (select auth.uid())
-- Note: baseline policy referenced defunct "profiles" table; fixed to use "alts"
-- ============================================================
DROP POLICY IF EXISTS "Public teams are viewable" ON public.teams;
DROP POLICY IF EXISTS "open_teamsheet_team_public" ON public.teams;
DROP POLICY IF EXISTS "players_view_own_tournament_team" ON public.teams;

CREATE POLICY "Teams are viewable"
ON public.teams FOR SELECT USING (
  -- Public teams
  is_public = true
  -- Teams created by current user
  OR created_by IN (
    SELECT a.id FROM public.alts a WHERE a.user_id = (SELECT auth.uid())
  )
  -- Teams in tournaments with open team sheets
  OR id IN (
    SELECT tr.team_id
    FROM public.tournament_registrations tr
    JOIN public.tournaments t ON tr.tournament_id = t.id
    WHERE t.open_team_sheets = true
    AND t.status IN ('active', 'completed')
    AND tr.team_id IS NOT NULL
  )
  -- Player's own tournament teams
  OR id IN (
    SELECT tr.team_id
    FROM public.tournament_registrations tr
    WHERE tr.alt_id IN (
      SELECT a.id FROM public.alts a WHERE a.user_id = (SELECT auth.uid())
    )
    AND tr.team_id IS NOT NULL
  )
);

-- ============================================================
-- tournament_phases: drop duplicate SELECT policy
-- ============================================================
DROP POLICY IF EXISTS "Tournament phases are viewable by everyone" ON public.tournament_phases;

-- ============================================================
-- user_group_roles: consolidate INSERT/DELETE into single policies
--                   + fix auth.uid() in INSERT, DELETE, UPDATE
-- ============================================================

-- Drop all existing policies that will be replaced
DROP POLICY IF EXISTS "Org owners can add users to their groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Org admins can add users to lower groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Head judges can add users to judge groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Org owners can remove users from their groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Org admins can remove users from lower groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Head judges can remove users from judge groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Org owners can update their group roles" ON public.user_group_roles;

-- Consolidated INSERT policy
CREATE POLICY "Authorized users can add group role assignments"
ON public.user_group_roles
FOR INSERT TO authenticated
WITH CHECK (
  -- Org owners: can add any role in their org
  public.is_org_owner(
    public.get_org_id_from_group_role(group_role_id),
    (SELECT auth.uid())
  )
  -- Org admins: can add head_judge and judge roles
  OR (
    public.get_role_name_from_group_role(group_role_id) IN ('org_head_judge', 'org_judge')
    AND public.user_has_org_role(
      public.get_org_id_from_group_role(group_role_id),
      (SELECT auth.uid()),
      'org_admin'
    )
  )
  -- Head judges: can add judge roles only
  OR (
    public.get_role_name_from_group_role(group_role_id) = 'org_judge'
    AND public.user_has_org_role(
      public.get_org_id_from_group_role(group_role_id),
      (SELECT auth.uid()),
      'org_head_judge'
    )
  )
);

-- Consolidated DELETE policy
CREATE POLICY "Authorized users can remove group role assignments"
ON public.user_group_roles
FOR DELETE TO authenticated
USING (
  -- Org owners: can remove any role in their org
  public.is_org_owner(
    public.get_org_id_from_group_role(group_role_id),
    (SELECT auth.uid())
  )
  -- Org admins: can remove head_judge and judge roles
  OR (
    public.get_role_name_from_group_role(group_role_id) IN ('org_head_judge', 'org_judge')
    AND public.user_has_org_role(
      public.get_org_id_from_group_role(group_role_id),
      (SELECT auth.uid()),
      'org_admin'
    )
  )
  -- Head judges: can remove judge roles only
  OR (
    public.get_role_name_from_group_role(group_role_id) = 'org_judge'
    AND public.user_has_org_role(
      public.get_org_id_from_group_role(group_role_id),
      (SELECT auth.uid()),
      'org_head_judge'
    )
  )
);

-- UPDATE policy (owners only, recreated with fixed auth.uid())
CREATE POLICY "Org owners can update their group roles"
ON public.user_group_roles
FOR UPDATE TO authenticated
USING (
  public.is_org_owner(
    public.get_org_id_from_group_role(group_role_id),
    (SELECT auth.uid())
  )
);
