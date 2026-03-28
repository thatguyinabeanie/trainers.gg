-- =============================================================================
-- Migration: Rename organizations to communities (TGG-334)
-- =============================================================================
-- Completes the DB-level rename of "organizations" → "communities" to match the
-- user-facing terminology change from TGG-328.
--
-- Changes:
--   1. Rename enum types (organization_status �� community_status, etc.)
--   2. Rename enum values (entity_type 'organization' → 'community', etc.)
--   3. Rename 5 tables
--   4. Rename organization_id columns → community_id
--   5. Rename indexes
--   6. Rename constraints
--   7. Update permission keys (org.* → community.*)
--   8. Drop/recreate functions (has_org_permission → has_community_permission, etc.)
--   9. Update trigger functions
--  10. Drop/recreate all affected RLS policies
--
-- IDEMPOTENCY: Uses IF EXISTS, DO $$ EXCEPTION $$ blocks, and DROP/CREATE
-- patterns so preview branches can replay all migrations on fresh DBs.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. RENAME ENUM TYPES
-- =============================================================================
-- PostgreSQL ALTER TYPE ... RENAME TO is idempotent-safe: if the old name
-- doesn't exist (already renamed), it raises an error we catch.

DO $$ BEGIN
  ALTER TYPE public.organization_status RENAME TO community_status;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.organization_tier RENAME TO community_tier;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.organization_subscription_tier RENAME TO community_subscription_tier;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE public.org_request_status RENAME TO community_request_status;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- =============================================================================
-- 2. RENAME ENUM VALUES
-- =============================================================================
-- PostgreSQL 10+ supports ALTER TYPE ... RENAME VALUE.

-- entity_type: 'organization' → 'community'
DO $$ BEGIN
  ALTER TYPE public.entity_type RENAME VALUE 'organization' TO 'community';
EXCEPTION
  WHEN invalid_parameter_value THEN NULL; -- value doesn't exist (already renamed)
END $$;

-- role_scope: 'organization' → 'community'
DO $$ BEGIN
  ALTER TYPE public.role_scope RENAME VALUE 'organization' TO 'community';
EXCEPTION
  WHEN invalid_parameter_value THEN NULL;
END $$;

-- community_subscription_tier: 'organization_plus' → 'community_plus'
DO $$ BEGIN
  ALTER TYPE public.community_subscription_tier RENAME VALUE 'organization_plus' TO 'community_plus';
EXCEPTION
  WHEN invalid_parameter_value THEN NULL;
END $$;

-- =============================================================================
-- 3. DROP RLS POLICIES BEFORE TABLE RENAMES
-- =============================================================================
-- We must drop all policies on tables we're about to rename. Policy names
-- survive a table rename, but we'll recreate them with updated names/bodies.

-- organizations (→ communities)
DROP POLICY IF EXISTS "Organizations are viewable by everyone" ON public.organizations;
DROP POLICY IF EXISTS "Users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Org owners can update" ON public.organizations;
DROP POLICY IF EXISTS "Org owners can delete" ON public.organizations;
DROP POLICY IF EXISTS "Site admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Site admins can view all organizations" ON public.organizations;

-- organization_staff (→ community_staff)
DROP POLICY IF EXISTS "Users can view staff in their organizations" ON public.organization_staff;
DROP POLICY IF EXISTS "Org admins can add staff" ON public.organization_staff;
DROP POLICY IF EXISTS "Org admins can remove staff" ON public.organization_staff;

-- organization_invitations (→ community_invitations)
DROP POLICY IF EXISTS "Users can view invitations to their orgs" ON public.organization_invitations;
DROP POLICY IF EXISTS "Org admins can create invitations" ON public.organization_invitations;
DROP POLICY IF EXISTS "Invited users can update their invitation status" ON public.organization_invitations;
DROP POLICY IF EXISTS "Org admins can delete pending invitations" ON public.organization_invitations;

-- organization_requests (→ community_requests)
DROP POLICY IF EXISTS "Users can view own org requests" ON public.organization_requests;
DROP POLICY IF EXISTS "Users can create org requests" ON public.organization_requests;
DROP POLICY IF EXISTS "Site admins can view all org requests" ON public.organization_requests;
DROP POLICY IF EXISTS "Site admins can update org requests" ON public.organization_requests;
-- Legacy policies that may still exist
DROP POLICY IF EXISTS "Org requests viewable by requester or site admin" ON public.organization_requests;

-- organization_admin_notes (→ community_admin_notes)
DROP POLICY IF EXISTS "Site admins can view organization admin notes" ON public.organization_admin_notes;
DROP POLICY IF EXISTS "Site admins can create organization admin notes" ON public.organization_admin_notes;
DROP POLICY IF EXISTS "Site admins can update organization admin notes" ON public.organization_admin_notes;
DROP POLICY IF EXISTS "Site admins can delete organization admin notes" ON public.organization_admin_notes;

-- tournaments — drop policies that reference has_org_permission or organizations table
DROP POLICY IF EXISTS "Org staff can create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Org staff can update tournaments" ON public.tournaments;
-- Legacy policies that may still exist
DROP POLICY IF EXISTS "Org members can create tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Org members can update tournaments" ON public.tournaments;

-- audit_log — drop policy that references has_org_permission
DROP POLICY IF EXISTS "Tournament staff can view audit logs" ON public.audit_log;

-- feature_usage — drop policy that references organizations
DROP POLICY IF EXISTS "Users can view own feature usage" ON public.feature_usage;

-- subscriptions — drop policy that references organizations
DROP POLICY IF EXISTS "Users can view own subscriptions" ON public.subscriptions;

-- user_group_roles — drop policies referencing org helper functions
DROP POLICY IF EXISTS "Org owners can add users to their groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Org owners can update their group roles" ON public.user_group_roles;
DROP POLICY IF EXISTS "Org owners can remove users from their groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Org admins can add users to lower groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Org admins can remove users from lower groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Head judges can add users to judge groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Head judges can remove users from judge groups" ON public.user_group_roles;
DROP POLICY IF EXISTS "Users can view their own group roles" ON public.user_group_roles;
DROP POLICY IF EXISTS "Service role can manage group roles" ON public.user_group_roles;

-- =============================================================================
-- 4. DROP TRIGGERS BEFORE TABLE RENAMES
-- =============================================================================
-- Triggers on tables that are being renamed need to be dropped first, then
-- recreated after with new function references.

DROP TRIGGER IF EXISTS on_invitation_accepted ON public.organization_invitations;
DROP TRIGGER IF EXISTS create_default_org_groups_trigger ON public.organizations;
DROP TRIGGER IF EXISTS update_organization_admin_notes_updated_at ON public.organization_admin_notes;
DROP TRIGGER IF EXISTS update_org_request_updated_at ON public.organization_requests;

-- =============================================================================
-- 5. RENAME TABLES
-- =============================================================================

DO $$ BEGIN
  ALTER TABLE public.organizations RENAME TO communities;
EXCEPTION
  WHEN undefined_table THEN NULL;  -- already renamed
END $$;

DO $$ BEGIN
  ALTER TABLE public.organization_staff RENAME TO community_staff;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.organization_invitations RENAME TO community_invitations;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.organization_requests RENAME TO community_requests;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.organization_admin_notes RENAME TO community_admin_notes;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- =============================================================================
-- 6. RENAME COLUMNS: organization_id → community_id
-- =============================================================================

-- community_staff (was organization_staff)
DO $$ BEGIN
  ALTER TABLE public.community_staff RENAME COLUMN organization_id TO community_id;
EXCEPTION
  WHEN undefined_column THEN NULL;  -- already renamed
END $$;

-- community_invitations (was organization_invitations)
DO $$ BEGIN
  ALTER TABLE public.community_invitations RENAME COLUMN organization_id TO community_id;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- community_admin_notes (was organization_admin_notes)
DO $$ BEGIN
  ALTER TABLE public.community_admin_notes RENAME COLUMN organization_id TO community_id;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- groups
DO $$ BEGIN
  ALTER TABLE public.groups RENAME COLUMN organization_id TO community_id;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- tournaments
DO $$ BEGIN
  ALTER TABLE public.tournaments RENAME COLUMN organization_id TO community_id;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- tournament_templates
DO $$ BEGIN
  ALTER TABLE public.tournament_templates RENAME COLUMN organization_id TO community_id;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- audit_log
DO $$ BEGIN
  ALTER TABLE public.audit_log RENAME COLUMN organization_id TO community_id;
EXCEPTION
  WHEN undefined_column THEN NULL;
END $$;

-- =============================================================================
-- 7. RENAME SEQUENCES
-- =============================================================================

DO $$ BEGIN
  ALTER SEQUENCE IF EXISTS public.organizations_id_seq RENAME TO communities_id_seq;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER SEQUENCE IF EXISTS public.organization_staff_id_seq RENAME TO community_staff_id_seq;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER SEQUENCE IF EXISTS public.organization_invitations_id_seq RENAME TO community_invitations_id_seq;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER SEQUENCE IF EXISTS public.organization_requests_id_seq RENAME TO community_requests_id_seq;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER SEQUENCE IF EXISTS public.organization_admin_notes_id_seq RENAME TO community_admin_notes_id_seq;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

-- =============================================================================
-- 8. RENAME INDEXES
-- =============================================================================

-- communities (was organizations)
DO $$ BEGIN
  ALTER INDEX IF EXISTS public.organizations_pkey RENAME TO communities_pkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.organizations_slug_key RENAME TO communities_slug_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_organizations_owner RENAME TO idx_communities_owner;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_organizations_discord_invite_url RENAME TO idx_communities_discord_invite_url;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- community_staff (was organization_staff)
DO $$ BEGIN
  ALTER INDEX IF EXISTS public.organization_staff_pkey RENAME TO community_staff_pkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_org_staff_org RENAME TO idx_community_staff_community;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_org_staff_user RENAME TO idx_community_staff_user;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.organization_staff_organization_id_user_id_key RENAME TO community_staff_community_id_user_id_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- community_invitations (was organization_invitations)
DO $$ BEGIN
  ALTER INDEX IF EXISTS public.organization_invitations_pkey RENAME TO community_invitations_pkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_organization_invitations_org_id RENAME TO idx_community_invitations_community_id;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Fallback: older index name
DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_org_invitations_org RENAME TO idx_community_invitations_community_id;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_organization_invitations_invited_user_id RENAME TO idx_community_invitations_invited_user_id;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_organization_invitations_invited_by_user_id RENAME TO idx_community_invitations_invited_by_user_id;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Fallback: name from add_missing_foreign_key_indexes migration
DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_org_invitations_invited_by_user RENAME TO idx_community_invitations_invited_by_user_id;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_organization_invitations_status RENAME TO idx_community_invitations_status;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Fallback: older index name
DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_org_invitations_status RENAME TO idx_community_invitations_status;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.organization_invitations_org_user_unique RENAME TO community_invitations_community_user_unique;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- community_requests (was organization_requests)
DO $$ BEGIN
  ALTER INDEX IF EXISTS public.organization_requests_pkey RENAME TO community_requests_pkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.org_requests_user_id_idx RENAME TO community_requests_user_id_idx;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.org_requests_status_idx RENAME TO community_requests_status_idx;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.org_requests_slug_idx RENAME TO community_requests_slug_idx;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.org_requests_one_pending_per_user RENAME TO community_requests_one_pending_per_user;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.org_requests_one_pending_per_slug RENAME TO community_requests_one_pending_per_slug;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- community_admin_notes (was organization_admin_notes)
DO $$ BEGIN
  ALTER INDEX IF EXISTS public.organization_admin_notes_pkey RENAME TO community_admin_notes_pkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.organization_admin_notes_organization_id_key RENAME TO community_admin_notes_community_id_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- groups table: index on organization_id → community_id
DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_groups_org RENAME TO idx_groups_community;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.groups_organization_id_name_key RENAME TO groups_community_id_name_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- tournaments: organization_id indexes
DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_tournaments_org RENAME TO idx_tournaments_community;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_tournaments_org_archived RENAME TO idx_tournaments_community_archived;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER INDEX IF EXISTS public.tournaments_organization_id_slug_key RENAME TO tournaments_community_id_slug_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- tournament_templates: organization_id index
DO $$ BEGIN
  ALTER INDEX IF EXISTS public.idx_templates_org RENAME TO idx_templates_community;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- audit_log: organization_id index
DO $$ BEGIN
  ALTER INDEX IF EXISTS public.audit_log_organization_id_idx RENAME TO audit_log_community_id_idx;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- =============================================================================
-- 9. RENAME CONSTRAINTS
-- =============================================================================

-- communities (was organizations)
DO $$ BEGIN
  ALTER TABLE public.communities RENAME CONSTRAINT organizations_owner_user_id_fkey TO communities_owner_user_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.communities RENAME CONSTRAINT organizations_discord_invite_url_check TO communities_discord_invite_url_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- community_staff (was organization_staff)
DO $$ BEGIN
  ALTER TABLE public.community_staff RENAME CONSTRAINT organization_staff_organization_id_fkey TO community_staff_community_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_staff RENAME CONSTRAINT organization_staff_user_id_fkey TO community_staff_user_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- community_invitations (was organization_invitations)
DO $$ BEGIN
  ALTER TABLE public.community_invitations RENAME CONSTRAINT organization_invitations_organization_id_fkey TO community_invitations_community_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Fallback: older constraint name from baseline
DO $$ BEGIN
  ALTER TABLE public.community_invitations RENAME CONSTRAINT organization_invitations_invited_user_id_fkey TO community_invitations_invited_user_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_invitations RENAME CONSTRAINT organization_invitations_invited_by_user_id_fkey TO community_invitations_invited_by_user_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- community_requests (was organization_requests)
DO $$ BEGIN
  ALTER TABLE public.community_requests RENAME CONSTRAINT organization_requests_user_id_fkey TO community_requests_user_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_requests RENAME CONSTRAINT organization_requests_reviewed_by_fkey TO community_requests_reviewed_by_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_requests RENAME CONSTRAINT org_requests_name_length TO community_requests_name_length;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_requests RENAME CONSTRAINT org_requests_slug_format TO community_requests_slug_format;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_requests RENAME CONSTRAINT org_requests_slug_length TO community_requests_slug_length;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_requests RENAME CONSTRAINT org_requests_description_length TO community_requests_description_length;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_requests RENAME CONSTRAINT org_requests_admin_notes_length TO community_requests_admin_notes_length;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.community_requests RENAME CONSTRAINT organization_requests_discord_invite_url_check TO community_requests_discord_invite_url_check;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- community_admin_notes (was organization_admin_notes)
DO $$ BEGIN
  ALTER TABLE public.community_admin_notes RENAME CONSTRAINT organization_admin_notes_organization_id_fkey TO community_admin_notes_community_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- groups: FK to communities
DO $$ BEGIN
  ALTER TABLE public.groups RENAME CONSTRAINT groups_organization_id_fkey TO groups_community_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- tournaments: FK to communities
DO $$ BEGIN
  ALTER TABLE public.tournaments RENAME CONSTRAINT tournaments_organization_id_fkey TO tournaments_community_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- tournament_templates: FK to communities
DO $$ BEGIN
  ALTER TABLE public.tournament_templates RENAME CONSTRAINT tournament_templates_organization_id_fkey TO tournament_templates_community_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- audit_log: FK to communities
DO $$ BEGIN
  ALTER TABLE public.audit_log RENAME CONSTRAINT audit_log_organization_id_fkey TO audit_log_community_id_fkey;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- =============================================================================
-- 10. UPDATE PERMISSION KEYS
-- =============================================================================

UPDATE public.permissions SET key = 'community.manage'       WHERE key = 'org.manage';
UPDATE public.permissions SET key = 'community.staff.manage'  WHERE key = 'org.staff.manage';

-- =============================================================================
-- 11. DROP FUNCTIONS THAT HAVE NO DEPENDENT POLICIES
-- =============================================================================
-- has_org_permission and get_organization_tournament_counts have dependent
-- RLS policies on many tables (tournament_pairings, match_games, etc.).
-- Instead of dropping them (which would CASCADE-drop those policies),
-- we create the new functions first, then redefine the old names as
-- thin wrappers. This keeps all existing policies working.

-- Only drop functions with NO dependent policies.
-- Functions with dependent policies (is_org_owner, get_org_id_from_group_role,
-- user_has_org_role) will be redefined as wrappers in section 12b.
DROP FUNCTION IF EXISTS public.create_default_org_groups();
DROP FUNCTION IF EXISTS public.update_org_request_updated_at();

-- =============================================================================
-- 12. CREATE NEW FUNCTIONS
-- =============================================================================

-- has_community_permission: Check if current user has a permission in a community
CREATE OR REPLACE FUNCTION public.has_community_permission(
  p_community_id bigint,
  permission_key text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  current_user_id uuid := (SELECT auth.uid());
BEGIN
  -- Check 1: Is the user the community owner?
  -- Community owners have implicit all permissions
  IF EXISTS (
    SELECT 1 FROM public.communities c
    WHERE c.id = p_community_id
      AND c.owner_user_id = current_user_id
  ) THEN
    RETURN true;
  END IF;

  -- Check 2: Does the user have the permission via group roles?
  -- Path: user_group_roles → group_roles → groups (community) + roles → role_permissions → permissions
  IF EXISTS (
    SELECT 1
    FROM public.user_group_roles ugr
    INNER JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    INNER JOIN public.groups g ON gr.group_id = g.id
    INNER JOIN public.roles r ON gr.role_id = r.id
    INNER JOIN public.role_permissions rp ON r.id = rp.role_id
    INNER JOIN public.permissions p ON rp.permission_id = p.id
    WHERE g.community_id = p_community_id
      AND ugr.user_id = current_user_id
      AND p.key = permission_key
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$function$;

COMMENT ON FUNCTION public.has_community_permission(bigint, text) IS
  'Checks if the current authenticated user has a specific permission within a community. '
  'First checks if user is the community owner (implicit all permissions), '
  'then checks if user has the permission through their assigned roles.';

GRANT EXECUTE ON FUNCTION public.has_community_permission(bigint, text) TO authenticated;

-- get_community_tournament_counts: Batch count tournaments per community
CREATE OR REPLACE FUNCTION public.get_community_tournament_counts(community_ids bigint[])
RETURNS TABLE (
  community_id bigint,
  total_count bigint,
  active_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.community_id,
    COUNT(*)::bigint AS total_count,
    COUNT(*) FILTER (WHERE t.status = 'active')::bigint AS active_count
  FROM public.tournaments t
  WHERE t.community_id = ANY(community_ids)
    AND t.archived_at IS NULL
  GROUP BY t.community_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_community_tournament_counts(bigint[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_tournament_counts(bigint[]) TO anon;

COMMENT ON FUNCTION public.get_community_tournament_counts(bigint[]) IS
  'Returns tournament counts (total and active) for multiple communities in a single query. Used by community listing pages to avoid N+1 queries.';

-- is_community_owner: Check if a user owns a community
CREATE OR REPLACE FUNCTION public.is_community_owner(p_community_id bigint, p_user_id uuid)
RETURNS boolean
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.communities
    WHERE id = p_community_id AND owner_user_id = p_user_id
  )
$$;

-- get_community_id_from_group_role: Get community_id from a group_role_id
CREATE OR REPLACE FUNCTION public.get_community_id_from_group_role(p_group_role_id bigint)
RETURNS bigint
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT g.community_id
  FROM public.group_roles gr
  JOIN public.groups g ON gr.group_id = g.id
  WHERE gr.id = p_group_role_id
$$;

-- user_has_community_role: Check if user has a specific role in a community
CREATE OR REPLACE FUNCTION public.user_has_community_role(p_community_id bigint, p_user_id uuid, p_role_name text)
RETURNS boolean
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_group_roles ugr
    JOIN public.group_roles gr ON ugr.group_role_id = gr.id
    JOIN public.groups g ON gr.group_id = g.id
    JOIN public.roles r ON gr.role_id = r.id
    WHERE ugr.user_id = p_user_id
      AND g.community_id = p_community_id
      AND r.name = p_role_name
  )
$$;

-- get_role_name_from_group_role: unchanged logic, just recreate to ensure it exists
-- (it references no renamed objects, but we keep it for consistency)
CREATE OR REPLACE FUNCTION public.get_role_name_from_group_role(p_group_role_id bigint)
RETURNS text AS $$
  SELECT r.name
  FROM public.group_roles gr
  JOIN public.roles r ON gr.role_id = r.id
  WHERE gr.id = p_group_role_id
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- =============================================================================
-- 12b. BACKWARD-COMPAT WRAPPERS FOR OLD FUNCTION NAMES
-- =============================================================================
-- Many RLS policies on tournament-related tables (tournament_pairings,
-- tournament_standings, match_games, match_messages, teams, team_pokemon,
-- pokemon, tournament_opponent_history, tournament_player_stats) depend on
-- has_org_permission(). Rather than dropping and recreating all those policies,
-- we redefine the old function as a thin wrapper that delegates to the new one.
-- This keeps all existing policies working while new code uses the new name.

CREATE OR REPLACE FUNCTION public.has_org_permission(
  org_id bigint,
  permission_key text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.has_community_permission(org_id, permission_key);
$$;

CREATE OR REPLACE FUNCTION public.get_organization_tournament_counts(org_ids bigint[])
RETURNS TABLE(organization_id bigint, total_count bigint, active_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT community_id AS organization_id, total_count, active_count
  FROM public.get_community_tournament_counts(org_ids);
$$;

-- Wrappers for helper functions with dependent policies
CREATE OR REPLACE FUNCTION public.is_org_owner(p_org_id bigint, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.is_community_owner(p_org_id, p_user_id); $$;

CREATE OR REPLACE FUNCTION public.get_org_id_from_group_role(p_group_role_id bigint)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.get_community_id_from_group_role(p_group_role_id); $$;

CREATE OR REPLACE FUNCTION public.user_has_org_role(p_org_id bigint, p_user_id uuid, p_role_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT public.user_has_community_role(p_org_id, p_user_id, p_role_name); $$;

-- =============================================================================
-- 13. UPDATE TRIGGER FUNCTIONS
-- =============================================================================

-- handle_invitation_acceptance: Now references community_staff and community_id
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

    -- Create community_staff record
    -- Use ON CONFLICT DO NOTHING for idempotency (in case staff record already exists)
    INSERT INTO public.community_staff (
      community_id,
      user_id,
      created_at
    )
    VALUES (
      NEW.community_id,
      NEW.invited_user_id,
      NOW()
    )
    ON CONFLICT (community_id, user_id) DO NOTHING;

    -- TODO: Role assignment via user_group_roles needs proper implementation.
    -- The invited user becomes staff but currently receives no RBAC permissions.

  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.handle_invitation_acceptance() IS
  'Trigger function that automatically creates community_staff record when an invitation status changes to "accepted". Uses ON CONFLICT DO NOTHING for idempotency.';

-- create_default_community_groups: Auto-create default groups on community insert
CREATE OR REPLACE FUNCTION public.create_default_community_groups()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_org_admin_role_id bigint;
  v_org_head_judge_role_id bigint;
  v_org_judge_role_id bigint;
  v_admins_group_id bigint;
  v_head_judges_group_id bigint;
  v_judges_group_id bigint;
BEGIN
  -- Get role IDs (role names stay as org_admin etc. — those are RBAC role names, not UI labels)
  SELECT id INTO v_org_admin_role_id FROM public.roles WHERE name = 'org_admin' AND scope = 'community';
  SELECT id INTO v_org_head_judge_role_id FROM public.roles WHERE name = 'org_head_judge' AND scope = 'community';
  SELECT id INTO v_org_judge_role_id FROM public.roles WHERE name = 'org_judge' AND scope = 'community';

  -- Create Admins group
  INSERT INTO public.groups (community_id, name, description)
  VALUES (NEW.id, 'Admins', 'Community administrators with full management access')
  RETURNING id INTO v_admins_group_id;

  -- Create Head Judges group
  INSERT INTO public.groups (community_id, name, description)
  VALUES (NEW.id, 'Head Judges', 'Senior judges who manage tournament operations and other judges')
  RETURNING id INTO v_head_judges_group_id;

  -- Create Judges group
  INSERT INTO public.groups (community_id, name, description)
  VALUES (NEW.id, 'Judges', 'Tournament judges who handle match rulings')
  RETURNING id INTO v_judges_group_id;

  -- Link groups to roles
  INSERT INTO public.group_roles (group_id, role_id) VALUES
    (v_admins_group_id, v_org_admin_role_id),
    (v_head_judges_group_id, v_org_head_judge_role_id),
    (v_judges_group_id, v_org_judge_role_id);

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_default_community_groups() IS
  'Automatically creates default groups (Admins, Head Judges, Judges) when a new community is created';

-- update_community_request_updated_at: Replaces update_org_request_updated_at
CREATE OR REPLACE FUNCTION public.update_community_request_updated_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 14. CREATE TRIGGERS ON RENAMED TABLES
-- =============================================================================

-- Invitation acceptance trigger on community_invitations
CREATE TRIGGER on_invitation_accepted
  AFTER UPDATE ON public.community_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_invitation_acceptance();

-- Default groups trigger on communities
CREATE TRIGGER create_default_community_groups_trigger
  AFTER INSERT ON public.communities
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_community_groups();

-- Updated_at trigger on community_admin_notes
CREATE OR REPLACE TRIGGER update_community_admin_notes_updated_at
  BEFORE UPDATE ON public.community_admin_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Updated_at trigger on community_requests
CREATE TRIGGER update_community_request_updated_at
  BEFORE UPDATE ON public.community_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_community_request_updated_at();

-- =============================================================================
-- 15. RECREATE RLS POLICIES
-- =============================================================================

-- ---------------------------------------------------------------------------
-- communities (was organizations)
-- ---------------------------------------------------------------------------

-- Everyone can view communities
CREATE POLICY "Communities are viewable by everyone"
  ON public.communities FOR SELECT
  USING (true);

-- Authenticated users can create communities (owner must be self)
CREATE POLICY "Users can create communities"
  ON public.communities FOR INSERT TO authenticated
  WITH CHECK (owner_user_id = (SELECT auth.uid()));

-- Community owners can update their own community
CREATE POLICY "Community owners can update"
  ON public.communities FOR UPDATE TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

-- Community owners can delete their own community
CREATE POLICY "Community owners can delete"
  ON public.communities FOR DELETE TO authenticated
  USING (owner_user_id = (SELECT auth.uid()));

-- Site admins can update any community
CREATE POLICY "Site admins can update communities"
  ON public.communities FOR UPDATE TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- Site admins can view all communities (including non-active)
CREATE POLICY "Site admins can view all communities"
  ON public.communities FOR SELECT TO authenticated
  USING (public.is_site_admin());

-- ---------------------------------------------------------------------------
-- community_staff (was organization_staff)
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view staff in their communities"
  ON public.community_staff FOR SELECT TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_staff.community_id
        AND c.owner_user_id = (SELECT auth.uid())
    ))
    OR (user_id = (SELECT auth.uid()))
    OR public.has_community_permission(community_id, 'community.manage'::text)
  );

CREATE POLICY "Community admins can add staff"
  ON public.community_staff FOR INSERT TO authenticated
  WITH CHECK (
    public.has_community_permission(community_id, 'community.staff.manage'::text)
  );

CREATE POLICY "Community admins can remove staff"
  ON public.community_staff FOR DELETE TO authenticated
  USING (
    -- Cannot remove the community owner
    NOT EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_staff.community_id
        AND c.owner_user_id = community_staff.user_id
    )
    AND
    public.has_community_permission(community_id, 'community.staff.manage'::text)
  );

-- ---------------------------------------------------------------------------
-- community_invitations (was organization_invitations)
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view invitations to their communities"
  ON public.community_invitations FOR SELECT TO authenticated
  USING (
    (EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = community_invitations.community_id
        AND c.owner_user_id = (SELECT auth.uid())
    ))
    OR (invited_user_id = (SELECT auth.uid()))
    OR public.has_community_permission(community_id, 'community.staff.manage'::text)
  );

CREATE POLICY "Community admins can create invitations"
  ON public.community_invitations FOR INSERT TO authenticated
  WITH CHECK (
    public.has_community_permission(community_id, 'community.staff.manage'::text)
    AND (invited_by_user_id = (SELECT auth.uid()))
  );

CREATE POLICY "Invited users can update their invitation status"
  ON public.community_invitations FOR UPDATE TO authenticated
  USING (invited_user_id = (SELECT auth.uid()))
  WITH CHECK (
    (invited_user_id = (SELECT auth.uid()))
    AND (status = ANY (ARRAY['accepted'::invitation_status, 'declined'::invitation_status]))
  );

CREATE POLICY "Community admins can delete pending invitations"
  ON public.community_invitations FOR DELETE TO authenticated
  USING (
    status = 'pending'
    AND public.has_community_permission(community_id, 'community.staff.manage'::text)
  );

-- ---------------------------------------------------------------------------
-- community_requests (was organization_requests)
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own community requests"
  ON public.community_requests FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create community requests"
  ON public.community_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Site admins can view all community requests"
  ON public.community_requests FOR SELECT TO authenticated
  USING (public.is_site_admin());

CREATE POLICY "Site admins can update community requests"
  ON public.community_requests FOR UPDATE TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- ---------------------------------------------------------------------------
-- community_admin_notes (was organization_admin_notes)
-- ---------------------------------------------------------------------------

CREATE POLICY "Site admins can view community admin notes"
  ON public.community_admin_notes FOR SELECT TO authenticated
  USING (public.is_site_admin());

CREATE POLICY "Site admins can create community admin notes"
  ON public.community_admin_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_site_admin());

CREATE POLICY "Site admins can update community admin notes"
  ON public.community_admin_notes FOR UPDATE TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

CREATE POLICY "Site admins can delete community admin notes"
  ON public.community_admin_notes FOR DELETE TO authenticated
  USING (public.is_site_admin());

-- ---------------------------------------------------------------------------
-- tournaments — recreate policies with has_community_permission
-- ---------------------------------------------------------------------------

CREATE POLICY "Community staff can create tournaments"
  ON public.tournaments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = tournaments.community_id
        AND (
          c.owner_user_id = (SELECT auth.uid())
          OR public.has_community_permission(tournaments.community_id, 'tournament.create')
        )
    )
  );

CREATE POLICY "Community staff can update tournaments"
  ON public.tournaments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.communities c
      WHERE c.id = tournaments.community_id
        AND (
          c.owner_user_id = (SELECT auth.uid())
          OR public.has_community_permission(tournaments.community_id, 'tournament.manage')
        )
    )
  );

-- ---------------------------------------------------------------------------
-- audit_log — recreate policy with has_community_permission
-- ---------------------------------------------------------------------------

CREATE POLICY "Tournament staff can view audit logs"
  ON public.audit_log FOR SELECT TO authenticated
  USING (
    -- Via tournament
    (
      tournament_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.tournaments t
        WHERE t.id = tournament_id
          AND public.has_community_permission(t.community_id, 'tournament.manage')
      )
    )
    OR
    -- Via community directly
    (
      community_id IS NOT NULL
      AND public.has_community_permission(community_id, 'tournament.manage')
    )
    OR
    -- Site admins can see everything
    public.is_site_admin()
  );

-- ---------------------------------------------------------------------------
-- feature_usage — recreate policy with communities reference
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own feature usage"
  ON public.feature_usage FOR SELECT TO public
  USING (
    ((entity_type::text = 'alt'::text) AND (entity_id IN (
      SELECT alts.id FROM public.alts
      WHERE alts.user_id = (SELECT auth.uid())
    )))
    OR ((entity_type::text = 'community'::text) AND (entity_id IN (
      SELECT c.id FROM public.communities c
      WHERE c.owner_user_id = (SELECT auth.uid())
    )))
  );

-- ---------------------------------------------------------------------------
-- subscriptions — recreate policy with communities reference
-- ---------------------------------------------------------------------------

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT TO public
  USING (
    ((entity_type::text = 'alt'::text) AND (entity_id IN (
      SELECT alts.id FROM public.alts
      WHERE alts.user_id = (SELECT auth.uid())
    )))
    OR ((entity_type::text = 'community'::text) AND (entity_id IN (
      SELECT c.id FROM public.communities c
      WHERE c.owner_user_id = (SELECT auth.uid())
    )))
  );

-- ---------------------------------------------------------------------------
-- user_group_roles — recreate policies with community helper functions
-- ---------------------------------------------------------------------------

-- Users can view their own group roles
CREATE POLICY "Users can view their own group roles"
  ON public.user_group_roles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Service role can manage all group roles
CREATE POLICY "Service role can manage group roles"
  ON public.user_group_roles FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Community owners can manage user_group_roles for their community's groups
CREATE POLICY "Community owners can add users to their groups"
  ON public.user_group_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.is_community_owner(
      public.get_community_id_from_group_role(group_role_id),
      (SELECT auth.uid())
    )
  );

CREATE POLICY "Community owners can update their group roles"
  ON public.user_group_roles FOR UPDATE TO authenticated
  USING (
    public.is_community_owner(
      public.get_community_id_from_group_role(group_role_id),
      (SELECT auth.uid())
    )
  );

CREATE POLICY "Community owners can remove users from their groups"
  ON public.user_group_roles FOR DELETE TO authenticated
  USING (
    public.is_community_owner(
      public.get_community_id_from_group_role(group_role_id),
      (SELECT auth.uid())
    )
  );

-- Community admins can manage lower-level roles
CREATE POLICY "Community admins can add users to lower groups"
  ON public.user_group_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.get_role_name_from_group_role(group_role_id) IN ('org_head_judge', 'org_judge')
    AND public.user_has_community_role(
      public.get_community_id_from_group_role(group_role_id),
      (SELECT auth.uid()),
      'org_admin'
    )
  );

CREATE POLICY "Community admins can remove users from lower groups"
  ON public.user_group_roles FOR DELETE TO authenticated
  USING (
    public.get_role_name_from_group_role(group_role_id) IN ('org_head_judge', 'org_judge')
    AND public.user_has_community_role(
      public.get_community_id_from_group_role(group_role_id),
      (SELECT auth.uid()),
      'org_admin'
    )
  );

-- Head judges can manage judges
CREATE POLICY "Head judges can add users to judge groups"
  ON public.user_group_roles FOR INSERT TO authenticated
  WITH CHECK (
    public.get_role_name_from_group_role(group_role_id) = 'org_judge'
    AND public.user_has_community_role(
      public.get_community_id_from_group_role(group_role_id),
      (SELECT auth.uid()),
      'org_head_judge'
    )
  );

CREATE POLICY "Head judges can remove users from judge groups"
  ON public.user_group_roles FOR DELETE TO authenticated
  USING (
    public.get_role_name_from_group_role(group_role_id) = 'org_judge'
    AND public.user_has_community_role(
      public.get_community_id_from_group_role(group_role_id),
      (SELECT auth.uid()),
      'org_head_judge'
    )
  );

-- =============================================================================
-- 16. UPDATE TABLE/COLUMN COMMENTS
-- =============================================================================

COMMENT ON TABLE public.communities IS
  'Communities (formerly organizations) that host tournaments and manage staff.';

COMMENT ON COLUMN public.communities.owner_user_id IS
  'The user who owns this community. Uses user_id (not alt_id).';

COMMENT ON TABLE public.community_staff IS
  'Community staff members (user-level). Staff roles and permissions are tied to users, not alts.';

COMMENT ON COLUMN public.community_staff.community_id IS
  'The community this staff member belongs to.';

COMMENT ON TABLE public.community_invitations IS
  'Invitations to join a community as staff. Uses user_id (staff identity), not alt_id (tournament identity). Acceptance automatically creates community_staff record via trigger.';

COMMENT ON COLUMN public.community_invitations.community_id IS
  'The community the invitation is for.';

COMMENT ON TABLE public.community_requests IS
  'Requests to create new communities, submitted by users and reviewed by site admins.';

COMMENT ON TABLE public.community_admin_notes IS
  'Internal admin notes for communities (admin-only access).';

COMMENT ON COLUMN public.community_admin_notes.community_id IS
  'The community these notes are about.';

COMMENT ON COLUMN public.groups.community_id IS
  'The community this group belongs to.';

COMMENT ON COLUMN public.tournaments.community_id IS
  'The community that hosts this tournament.';

COMMENT ON COLUMN public.tournament_templates.community_id IS
  'The community that owns this template.';

COMMENT ON COLUMN public.audit_log.community_id IS
  'Related community (formerly organization).';

COMMIT;
