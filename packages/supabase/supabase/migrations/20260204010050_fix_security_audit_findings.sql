-- =============================================================================
-- Fix security and correctness issues found during migration audit
-- =============================================================================
--
-- Issues addressed:
--
-- 1. SECURITY: "Alt group roles are viewable by everyone" policy on user_group_roles
--    was never dropped during the alt_group_roles → user_group_roles rename.
--    This permissive SELECT policy defeats the restrictive "Users can view their
--    own group roles" policy (PostgreSQL ORs SELECT policies together).
--
-- 2. SECURITY: GRANT ALL to anon on organization_staff grants anonymous users
--    INSERT/UPDATE/DELETE at the SQL level. RLS blocks this, but it violates
--    defense-in-depth. Anon should only have SELECT.
--
-- 3. SECURITY: Legacy "Org members can create/update tournaments" policies allow
--    any organization_staff member to create/update tournaments regardless of
--    their RBAC permissions. An org_judge could create tournaments even without
--    the tournament.create permission. Replace with has_org_permission() checks.
--
-- 4. BUG: handle_invitation_acceptance() trigger function references an
--    updated_at column that does not exist on organization_staff. Fix the
--    function to omit that column.
-- =============================================================================


-- =============================================================================
-- 1. Drop leftover permissive user_group_roles SELECT policy
-- =============================================================================
-- This policy was created on alt_group_roles in 20260121214424 and survived
-- the rename to user_group_roles in 20260127000003. It allows ANY authenticated
-- user to SELECT all rows, defeating the restrictive policy from 20260127000007.

DROP POLICY IF EXISTS "Alt group roles are viewable by everyone" ON public.user_group_roles;


-- =============================================================================
-- 2. Tighten anon grants on organization_staff
-- =============================================================================
-- The rename migration (20260127000002) granted ALL to anon. Revoke write
-- access and keep only SELECT for defense-in-depth.

REVOKE INSERT, UPDATE, DELETE ON TABLE public.organization_staff FROM anon;


-- =============================================================================
-- 3. Replace legacy tournament policies with RBAC-aware versions
-- =============================================================================
-- The old policies (from 20260128000000) allow any organization_staff member to
-- create/update tournaments. The RBAC system requires tournament.create for
-- creation and tournament.manage for updates.

DROP POLICY IF EXISTS "Org members can create tournaments" ON public.tournaments;
CREATE POLICY "Org staff can create tournaments" ON public.tournaments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = tournaments.organization_id
        AND (
          o.owner_user_id = (SELECT auth.uid())
          OR public.has_org_permission(tournaments.organization_id, 'tournament.create')
        )
    )
  );

DROP POLICY IF EXISTS "Org members can update tournaments" ON public.tournaments;
CREATE POLICY "Org staff can update tournaments" ON public.tournaments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = tournaments.organization_id
        AND (
          o.owner_user_id = (SELECT auth.uid())
          OR public.has_org_permission(tournaments.organization_id, 'tournament.manage')
        )
    )
  );


-- =============================================================================
-- 4. Fix handle_invitation_acceptance() trigger function
-- =============================================================================
-- The version in 20260127100000 references an updated_at column that does not
-- exist on organization_staff (the table only has: id, organization_id, user_id,
-- created_at). Remove the updated_at reference.

CREATE OR REPLACE FUNCTION public.handle_invitation_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  -- Only act when status changes to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted') THEN

    -- Verify invited_user_id is set
    IF NEW.invited_user_id IS NULL THEN
      RAISE EXCEPTION 'Cannot accept invitation: invited_user_id is NULL';
    END IF;

    -- Create organization_staff record
    -- Use ON CONFLICT DO NOTHING for idempotency (in case staff record already exists)
    INSERT INTO public.organization_staff (
      organization_id,
      user_id,
      created_at
    )
    VALUES (
      NEW.organization_id,
      NEW.invited_user_id,
      NOW()
    )
    ON CONFLICT (organization_id, user_id) DO NOTHING;

    -- TODO: Role assignment via user_group_roles needs proper implementation.
    -- The invited user becomes staff but currently receives no RBAC permissions.
    -- This requires:
    -- 1. Finding the default group for the organization
    -- 2. Finding the group_role for the invited role
    -- 3. Inserting into user_group_roles with the group_role_id

  END IF;

  RETURN NEW;
END;
$function$;
