-- Fix Supabase performance advisors
-- Addresses: auth_rls_initplan, multiple_permissive_policies, duplicate_index
--
-- This migration fixes 42 performance warnings:
-- - 40 RLS policies using auth.uid() without subquery (causes per-row evaluation)
-- - 1 duplicate index on organizations table
-- - 1 redundant permissive policy on user_group_roles

-- ============================================================================
-- 1. Fix helper functions to use (SELECT auth.uid()) pattern
-- ============================================================================

-- Fix get_current_user_id function
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT (SELECT auth.uid());
$$;

-- Fix get_current_alt_id function  
CREATE OR REPLACE FUNCTION public.get_current_alt_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT a.id FROM public.alts a
  WHERE a.user_id = (SELECT auth.uid())
  LIMIT 1
$$;

-- Fix is_site_admin function
CREATE OR REPLACE FUNCTION public.is_site_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = (SELECT auth.uid())
      AND r.scope = 'site'
      AND r.name = 'Site Admin'
  )
$$;

-- Fix has_org_permission function
CREATE OR REPLACE FUNCTION public.has_org_permission(org_id bigint, permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
BEGIN
  -- Check 1: Is the user the organization owner?
  IF EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = org_id
      AND o.owner_user_id = current_user_id
  ) THEN
    RETURN true;
  END IF;

  -- Check 2: Does the user have the permission via group roles?
  IF EXISTS (
    SELECT 1
    FROM public.user_group_roles ugr
    INNER JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    INNER JOIN public.groups g ON gr.group_id = g.id
    INNER JOIN public.roles r ON gr.role_id = r.id
    INNER JOIN public.role_permissions rp ON r.id = rp.role_id
    INNER JOIN public.permissions p ON rp.permission_id = p.id
    WHERE g.organization_id = org_id
      AND ugr.user_id = current_user_id
      AND p.key = permission_key
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

-- ============================================================================
-- 2. Fix RLS policies on users table
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own record" ON public.users;
CREATE POLICY "Users can update own record" ON public.users
  FOR UPDATE TO public
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can only create own record" ON public.users;
CREATE POLICY "Users can only create own record" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- ============================================================================
-- 3. Fix RLS policies on posts table
-- ============================================================================

DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
CREATE POLICY "Users can create posts" ON public.posts
  FOR INSERT TO public
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts" ON public.posts
  FOR UPDATE TO public
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts" ON public.posts
  FOR DELETE TO public
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 4. Fix RLS policies on post_likes table
-- ============================================================================

DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
CREATE POLICY "Users can like posts" ON public.post_likes
  FOR INSERT TO public
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
CREATE POLICY "Users can unlike posts" ON public.post_likes
  FOR DELETE TO public
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 5. Fix RLS policies on follows table
-- ============================================================================

DROP POLICY IF EXISTS "Users can follow" ON public.follows;
CREATE POLICY "Users can follow" ON public.follows
  FOR INSERT TO public
  WITH CHECK (follower_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow" ON public.follows
  FOR DELETE TO public
  USING (follower_user_id = (SELECT auth.uid()));

-- ============================================================================
-- 6. Fix RLS policies on organizations table
-- ============================================================================

DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
CREATE POLICY "Users can create organizations" ON public.organizations
  FOR INSERT TO public
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Org owners can update" ON public.organizations;
CREATE POLICY "Org owners can update" ON public.organizations
  FOR UPDATE TO public
  USING (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Org owners can delete" ON public.organizations;
CREATE POLICY "Org owners can delete" ON public.organizations
  FOR DELETE TO public
  USING (owner_user_id = (SELECT auth.uid()));

-- ============================================================================
-- 7. Fix RLS policies on alts table
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert own alt" ON public.alts;
CREATE POLICY "Users can insert own alt" ON public.alts
  FOR INSERT TO public
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own alt" ON public.alts;
CREATE POLICY "Users can update own alt" ON public.alts
  FOR UPDATE TO public
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 8. Fix RLS policies on organization_requests table
-- ============================================================================

DROP POLICY IF EXISTS "Org requests viewable by requester or site admin" ON public.organization_requests;
CREATE POLICY "Org requests viewable by requester or site admin" ON public.organization_requests
  FOR SELECT TO public
  USING (
    (requested_by_alt_id IN (
      SELECT alts.id FROM public.alts
      WHERE alts.user_id = (SELECT auth.uid())
    ))
    OR is_site_admin()
  );

-- ============================================================================
-- 9. Fix RLS policies on tournament_invitations table
-- ============================================================================

DROP POLICY IF EXISTS "Tournament invitations viewable by involved" ON public.tournament_invitations;
CREATE POLICY "Tournament invitations viewable by involved" ON public.tournament_invitations
  FOR SELECT TO public
  USING (
    (invited_alt_id IN (
      SELECT alts.id FROM public.alts
      WHERE alts.user_id = (SELECT auth.uid())
    ))
    OR (invited_by_alt_id IN (
      SELECT alts.id FROM public.alts
      WHERE alts.user_id = (SELECT auth.uid())
    ))
  );

-- ============================================================================
-- 10. Fix RLS policies on teams table
-- ============================================================================

DROP POLICY IF EXISTS "Public teams are viewable" ON public.teams;
CREATE POLICY "Public teams are viewable" ON public.teams
  FOR SELECT TO public
  USING (
    (is_public = true)
    OR (created_by IN (
      SELECT alts.id FROM public.alts
      WHERE alts.user_id = (SELECT auth.uid())
    ))
  );

DROP POLICY IF EXISTS "Users can insert own teams" ON public.teams;
CREATE POLICY "Users can insert own teams" ON public.teams
  FOR INSERT TO public
  WITH CHECK (
    created_by IN (
      SELECT alts.id FROM public.alts
      WHERE alts.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own teams" ON public.teams;
CREATE POLICY "Users can update own teams" ON public.teams
  FOR UPDATE TO public
  USING (
    created_by IN (
      SELECT alts.id FROM public.alts
      WHERE alts.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own teams" ON public.teams;
CREATE POLICY "Users can delete own teams" ON public.teams
  FOR DELETE TO public
  USING (
    created_by IN (
      SELECT alts.id FROM public.alts
      WHERE alts.user_id = (SELECT auth.uid())
    )
  );

-- ============================================================================
-- 11. Fix RLS policies on tournament_templates table
-- ============================================================================

DROP POLICY IF EXISTS "Public templates are viewable" ON public.tournament_templates;
CREATE POLICY "Public templates are viewable" ON public.tournament_templates
  FOR SELECT TO public
  USING (
    (is_public = true)
    OR (created_by IN (
      SELECT alts.id FROM public.alts
      WHERE alts.user_id = (SELECT auth.uid())
    ))
  );

-- ============================================================================
-- 12. Fix RLS policies on pokemon table
-- ============================================================================

-- Drop the legacy overly-permissive policy that allows anyone to insert
DROP POLICY IF EXISTS "Users can create pokemon" ON public.pokemon;

-- Fix the auth.uid() initplan issue in the proper policy
DROP POLICY IF EXISTS "Authenticated users can create pokemon" ON public.pokemon;
CREATE POLICY "Authenticated users can create pokemon" ON public.pokemon
  FOR INSERT TO public
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================================
-- 13. Fix RLS policies on atproto_sessions table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own sessions" ON public.atproto_sessions;
CREATE POLICY "Users can view own sessions" ON public.atproto_sessions
  FOR SELECT TO public
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 14. Fix RLS policies on linked_atproto_accounts table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own linked accounts" ON public.linked_atproto_accounts;
CREATE POLICY "Users can view own linked accounts" ON public.linked_atproto_accounts
  FOR SELECT TO public
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can link accounts to themselves" ON public.linked_atproto_accounts;
CREATE POLICY "Users can link accounts to themselves" ON public.linked_atproto_accounts
  FOR INSERT TO public
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own linked accounts" ON public.linked_atproto_accounts;
CREATE POLICY "Users can update own linked accounts" ON public.linked_atproto_accounts
  FOR UPDATE TO public
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can unlink own accounts" ON public.linked_atproto_accounts;
CREATE POLICY "Users can unlink own accounts" ON public.linked_atproto_accounts
  FOR DELETE TO public
  USING (user_id = (SELECT auth.uid()));

-- ============================================================================
-- 15. Fix RLS policies on feature_usage table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own feature usage" ON public.feature_usage;
CREATE POLICY "Users can view own feature usage" ON public.feature_usage
  FOR SELECT TO public
  USING (
    ((entity_type::text = 'alt'::text) AND (entity_id IN (
      SELECT alts.id FROM public.alts
      WHERE alts.user_id = (SELECT auth.uid())
    )))
    OR ((entity_type::text = 'organization'::text) AND (entity_id IN (
      SELECT o.id FROM public.organizations o
      WHERE o.owner_user_id = (SELECT auth.uid())
    )))
  );

-- ============================================================================
-- 16. Fix RLS policies on subscriptions table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;
CREATE POLICY "Users can view own subscriptions" ON public.subscriptions
  FOR SELECT TO public
  USING (
    ((entity_type::text = 'alt'::text) AND (entity_id IN (
      SELECT alts.id FROM public.alts
      WHERE alts.user_id = (SELECT auth.uid())
    )))
    OR ((entity_type::text = 'organization'::text) AND (entity_id IN (
      SELECT o.id FROM public.organizations o
      WHERE o.owner_user_id = (SELECT auth.uid())
    )))
  );

-- ============================================================================
-- 17. Fix RLS policies on tournaments table
-- ============================================================================

DROP POLICY IF EXISTS "Org members can create tournaments" ON public.tournaments;
CREATE POLICY "Org members can create tournaments" ON public.tournaments
  FOR INSERT TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = tournaments.organization_id
        AND (
          o.owner_user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.organization_staff os
            WHERE os.organization_id = tournaments.organization_id
              AND os.user_id = (SELECT auth.uid())
          )
        )
    )
  );

DROP POLICY IF EXISTS "Org members can update tournaments" ON public.tournaments;
CREATE POLICY "Org members can update tournaments" ON public.tournaments
  FOR UPDATE TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = tournaments.organization_id
        AND (
          o.owner_user_id = (SELECT auth.uid())
          OR EXISTS (
            SELECT 1 FROM public.organization_staff os
            WHERE os.organization_id = tournaments.organization_id
              AND os.user_id = (SELECT auth.uid())
          )
        )
    )
  );

-- ============================================================================
-- 18. Fix RLS policies on organization_staff table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view staff in their organizations" ON public.organization_staff;
CREATE POLICY "Users can view staff in their organizations" ON public.organization_staff
  FOR SELECT TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_staff.organization_id
        AND o.owner_user_id = (SELECT auth.uid())
    ))
    OR (user_id = (SELECT auth.uid()))
    OR has_org_permission(organization_id, 'org.manage'::text)
  );

-- ============================================================================
-- 19. Fix RLS policies on organization_invitations table
-- ============================================================================

DROP POLICY IF EXISTS "Users can view invitations to their orgs" ON public.organization_invitations;
CREATE POLICY "Users can view invitations to their orgs" ON public.organization_invitations
  FOR SELECT TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM public.organizations o
      WHERE o.id = organization_invitations.organization_id
        AND o.owner_user_id = (SELECT auth.uid())
    ))
    OR (invited_user_id = (SELECT auth.uid()))
    OR has_org_permission(organization_id, 'org.staff.manage'::text)
  );

DROP POLICY IF EXISTS "Org admins can create invitations" ON public.organization_invitations;
CREATE POLICY "Org admins can create invitations" ON public.organization_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    has_org_permission(organization_id, 'org.staff.manage'::text)
    AND (invited_by_user_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Invited users can update their invitation status" ON public.organization_invitations;
CREATE POLICY "Invited users can update their invitation status" ON public.organization_invitations
  FOR UPDATE TO authenticated
  USING (invited_user_id = (SELECT auth.uid()))
  WITH CHECK (
    (invited_user_id = (SELECT auth.uid()))
    AND (status = ANY (ARRAY['accepted'::invitation_status, 'declined'::invitation_status]))
  );

-- ============================================================================
-- 20. Fix RLS policies on user_group_roles table
-- ============================================================================

-- Drop the redundant policy (already covered by "viewable by everyone")
DROP POLICY IF EXISTS "Users can view their own group roles" ON public.user_group_roles;

-- ============================================================================
-- 21. Fix RLS policies on waitlist table
-- ============================================================================

DROP POLICY IF EXISTS "Admins can view waitlist" ON public.waitlist;
CREATE POLICY "Admins can view waitlist" ON public.waitlist
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid())
        AND r.name = 'site_admin'::text
    )
  );

DROP POLICY IF EXISTS "Admins can update waitlist" ON public.waitlist;
CREATE POLICY "Admins can update waitlist" ON public.waitlist
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      WHERE ur.user_id = (SELECT auth.uid())
        AND r.name = 'site_admin'::text
    )
  );

-- ============================================================================
-- 22. Drop duplicate index
-- ============================================================================

DROP INDEX IF EXISTS public.idx_organizations_owner_alt;
