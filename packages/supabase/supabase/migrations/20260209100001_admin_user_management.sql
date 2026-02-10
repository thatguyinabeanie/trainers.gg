-- =============================================================================
-- Admin User Management & Impersonation
-- =============================================================================
-- Adds admin user management capabilities:
-- 1. New audit actions for user suspension, role changes, and impersonation
-- 2. Impersonation sessions table (mirrors sudo_sessions pattern)
-- 3. RPC functions for impersonation session management
-- =============================================================================

-- =============================================================================
-- Add new audit actions
-- =============================================================================
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.user_suspended';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.user_unsuspended';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.role_granted';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.role_revoked';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.impersonation_started';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.impersonation_ended';

-- =============================================================================
-- TABLE: impersonation_sessions
-- =============================================================================
-- Tracks when site admins impersonate other users.
-- Mirrors the sudo_sessions pattern: create on start, set ended_at on end.

CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  admin_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  reason text,
  ip_address inet,
  user_agent text,
  CONSTRAINT impersonation_end_after_start CHECK (ended_at IS NULL OR ended_at > started_at),
  CONSTRAINT impersonation_different_users CHECK (admin_user_id != target_user_id)
);

ALTER TABLE public.impersonation_sessions OWNER TO postgres;

COMMENT ON TABLE public.impersonation_sessions IS 'Tracks impersonation sessions for site admins';
COMMENT ON COLUMN public.impersonation_sessions.admin_user_id IS 'Site admin performing the impersonation';
COMMENT ON COLUMN public.impersonation_sessions.target_user_id IS 'User being impersonated';
COMMENT ON COLUMN public.impersonation_sessions.reason IS 'Admin-provided reason for impersonation';

-- Indexes for common query patterns
CREATE INDEX impersonation_sessions_admin_user_id_idx
  ON public.impersonation_sessions (admin_user_id);
CREATE INDEX impersonation_sessions_target_user_id_idx
  ON public.impersonation_sessions (target_user_id);
CREATE INDEX impersonation_sessions_active_idx
  ON public.impersonation_sessions (admin_user_id, started_at DESC)
  WHERE ended_at IS NULL;

-- =============================================================================
-- RLS: impersonation_sessions
-- =============================================================================
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Only site admins can view impersonation sessions
CREATE POLICY "Site admins can view impersonation sessions"
  ON public.impersonation_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_site_admin());

-- Only site admins can create impersonation sessions for themselves
CREATE POLICY "Site admins can create impersonation sessions"
  ON public.impersonation_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_site_admin()
    AND admin_user_id = (SELECT auth.uid())
  );

-- Only site admins can end their own impersonation sessions
CREATE POLICY "Site admins can end impersonation sessions"
  ON public.impersonation_sessions
  FOR UPDATE
  TO authenticated
  USING (
    public.is_site_admin()
    AND admin_user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    public.is_site_admin()
    AND admin_user_id = (SELECT auth.uid())
  );

-- No DELETE policy — impersonation sessions are immutable history

-- =============================================================================
-- FUNCTION: get_active_impersonation_session
-- =============================================================================
-- Returns the active impersonation session for the current user, if any.
-- A session is active if ended_at IS NULL and started_at is within the timeout.

CREATE OR REPLACE FUNCTION public.get_active_impersonation_session(timeout_minutes int DEFAULT 30)
RETURNS TABLE (
  id bigint,
  admin_user_id uuid,
  target_user_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  reason text,
  ip_address inet,
  user_agent text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.id, s.admin_user_id, s.target_user_id, s.started_at, s.ended_at,
         s.reason, s.ip_address, s.user_agent
  FROM public.impersonation_sessions s
  WHERE s.admin_user_id = (SELECT auth.uid())
    AND s.ended_at IS NULL
    AND s.started_at > (now() - (timeout_minutes || ' minutes')::interval)
    AND public.is_site_admin()
  ORDER BY s.started_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_active_impersonation_session IS
  'Returns active impersonation session for current admin user if within timeout';

-- =============================================================================
-- FUNCTION: is_impersonating
-- =============================================================================
-- Convenience function to check if the current user is impersonating someone.

CREATE OR REPLACE FUNCTION public.is_impersonating()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_active_impersonation_session()
  );
$$;

COMMENT ON FUNCTION public.is_impersonating IS
  'Returns true if current user has an active impersonation session';
