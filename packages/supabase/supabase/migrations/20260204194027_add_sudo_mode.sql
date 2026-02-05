-- =============================================================================
-- Sudo Mode System
-- =============================================================================
-- Allows site admins to explicitly activate elevated permissions for admin
-- panel access. Requires both the site_admin role AND an active sudo session.
--
-- Security principles:
-- 1. Having site_admin role is necessary but NOT sufficient
-- 2. Sudo mode must be explicitly activated
-- 3. All sudo activations/deactivations are logged in audit_log
-- 4. Sessions auto-expire after inactivity period
-- 5. Only site admins can create/view sudo sessions
-- =============================================================================

-- =============================================================================
-- Add new audit actions for sudo mode
-- =============================================================================
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.sudo_activated';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.sudo_deactivated';

-- =============================================================================
-- TABLE: sudo_sessions
-- =============================================================================
-- Tracks active and historical sudo mode sessions for site admins.
-- When a site admin activates sudo mode, a session is created.
-- When they deactivate it (or it expires), ended_at is set.

CREATE TABLE IF NOT EXISTS public.sudo_sessions (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  ip_address inet,
  user_agent text,
  -- Session is active if ended_at is NULL and started_at is recent
  -- Application layer enforces timeout (e.g., 30 minutes)
  CONSTRAINT sudo_session_end_after_start CHECK (ended_at IS NULL OR ended_at > started_at)
);

ALTER TABLE public.sudo_sessions OWNER TO postgres;

COMMENT ON TABLE public.sudo_sessions IS 'Tracks sudo mode sessions for site admins';
COMMENT ON COLUMN public.sudo_sessions.id IS 'Primary key';
COMMENT ON COLUMN public.sudo_sessions.user_id IS 'Site admin who activated sudo mode';
COMMENT ON COLUMN public.sudo_sessions.started_at IS 'When sudo mode was activated';
COMMENT ON COLUMN public.sudo_sessions.ended_at IS 'When sudo mode was deactivated (NULL if still active)';
COMMENT ON COLUMN public.sudo_sessions.ip_address IS 'IP address of the request that activated sudo';
COMMENT ON COLUMN public.sudo_sessions.user_agent IS 'User agent of the request that activated sudo';

-- Indexes for common query patterns
CREATE INDEX sudo_sessions_user_id_idx ON public.sudo_sessions (user_id);
CREATE INDEX sudo_sessions_active_idx ON public.sudo_sessions (user_id, started_at DESC) WHERE ended_at IS NULL;
CREATE INDEX sudo_sessions_started_at_idx ON public.sudo_sessions (started_at DESC);

-- =============================================================================
-- RLS: sudo_sessions
-- =============================================================================
ALTER TABLE public.sudo_sessions ENABLE ROW LEVEL SECURITY;

-- Only site admins can view sudo sessions
DROP POLICY IF EXISTS "Site admins can view sudo sessions" ON public.sudo_sessions;
CREATE POLICY "Site admins can view sudo sessions"
  ON public.sudo_sessions
  FOR SELECT
  TO authenticated
  USING (public.is_site_admin());

-- Only site admins can create sudo sessions (via application)
-- INSERT is handled by server actions with proper validation
DROP POLICY IF EXISTS "Site admins can create sudo sessions" ON public.sudo_sessions;
CREATE POLICY "Site admins can create sudo sessions"
  ON public.sudo_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_site_admin()
    AND user_id = (SELECT auth.uid())
  );

-- Only site admins can end their own sudo sessions
DROP POLICY IF EXISTS "Site admins can end their sudo sessions" ON public.sudo_sessions;
CREATE POLICY "Site admins can end their sudo sessions"
  ON public.sudo_sessions
  FOR UPDATE
  TO authenticated
  USING (
    public.is_site_admin()
    AND user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    public.is_site_admin()
    AND user_id = (SELECT auth.uid())
  );

-- No DELETE policy - sudo sessions are immutable history once created
-- Use UPDATE to set ended_at instead of deleting

-- =============================================================================
-- FUNCTION: get_active_sudo_session
-- =============================================================================
-- Returns the active sudo session for the current user, if any.
-- A session is considered active if:
-- 1. ended_at is NULL
-- 2. started_at is within the last 30 minutes (configurable timeout)
-- 3. User has site_admin role

CREATE OR REPLACE FUNCTION public.get_active_sudo_session(timeout_minutes int DEFAULT 30)
RETURNS TABLE (
  id bigint,
  user_id uuid,
  started_at timestamptz,
  ended_at timestamptz,
  ip_address inet,
  user_agent text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT s.id, s.user_id, s.started_at, s.ended_at, s.ip_address, s.user_agent
  FROM public.sudo_sessions s
  WHERE s.user_id = (SELECT auth.uid())
    AND s.ended_at IS NULL
    AND s.started_at > (now() - (timeout_minutes || ' minutes')::interval)
    AND public.is_site_admin()
  ORDER BY s.started_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_active_sudo_session IS 'Returns active sudo session for current user if within timeout period';

-- =============================================================================
-- FUNCTION: is_sudo_active
-- =============================================================================
-- Convenience function to check if the current user has an active sudo session.
-- Used in RLS policies and application code.

CREATE OR REPLACE FUNCTION public.is_sudo_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.get_active_sudo_session()
  );
$$;

COMMENT ON FUNCTION public.is_sudo_active IS 'Returns true if current user has an active sudo session';
