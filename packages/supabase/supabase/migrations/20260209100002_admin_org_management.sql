-- =============================================================================
-- Admin Organization Management
-- =============================================================================
-- Adds admin capabilities for managing organizations:
-- 1. 'suspended' status for organizations
-- 2. admin_notes column for internal notes
-- 3. New audit actions for org admin operations
-- 4. RLS policy for site admins to update organizations
-- =============================================================================

-- =============================================================================
-- Add 'suspended' to organization_status enum
-- =============================================================================
ALTER TYPE public.organization_status ADD VALUE IF NOT EXISTS 'suspended';

-- =============================================================================
-- Add admin_notes column to organizations
-- =============================================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS admin_notes text;

COMMENT ON COLUMN public.organizations.admin_notes IS
  'Internal admin notes (not visible to organization members)';

-- =============================================================================
-- Add new audit actions for org management
-- =============================================================================
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.org_approved';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.org_rejected';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.org_suspended';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.org_unsuspended';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.org_ownership_transferred';

-- =============================================================================
-- RLS: Allow site admins to update organizations
-- =============================================================================
-- Site admins can update any organization (for approve/reject/suspend/transfer)
CREATE POLICY "Site admins can update organizations"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- Site admins can view all organizations (including non-active)
CREATE POLICY "Site admins can view all organizations"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (public.is_site_admin());
