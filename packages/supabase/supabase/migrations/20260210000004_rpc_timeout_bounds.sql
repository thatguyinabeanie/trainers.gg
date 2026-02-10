-- =============================================================================
-- RPC Timeout Bounds Validation
-- =============================================================================
-- Both get_active_sudo_session() and get_active_impersonation_session() are
-- SECURITY DEFINER functions that accept a caller-supplied timeout_minutes
-- parameter. Without validation, a caller could pass an extremely large value
-- (expanding the session window far beyond intent) or a negative/zero value
-- (collapsing it to nothing or causing unexpected behavior).
--
-- This migration recreates both functions with the timeout clamped to the
-- range [1, 120] minutes using GREATEST(1, LEAST(timeout_minutes, 120)).
-- =============================================================================

-- =============================================================================
-- FUNCTION: get_active_sudo_session (with bounds validation)
-- =============================================================================
-- Original: 20260204194027_add_sudo_mode.sql
-- Change: clamp timeout_minutes to [1, 120] before use

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
    -- Clamp timeout_minutes to [1, 120] to prevent callers from passing
    -- excessively large or non-positive values to a SECURITY DEFINER function.
    AND s.started_at > (now() - (GREATEST(1, LEAST(timeout_minutes, 120)) || ' minutes')::interval)
    AND public.is_site_admin()
  ORDER BY s.started_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_active_sudo_session IS
  'Returns active sudo session for current user if within timeout period (clamped to 1-120 min)';

-- =============================================================================
-- FUNCTION: get_active_impersonation_session (with bounds validation)
-- =============================================================================
-- Original: 20260209100001_admin_user_management.sql
-- Change: clamp timeout_minutes to [1, 120] before use

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
    -- Clamp timeout_minutes to [1, 120] to prevent callers from passing
    -- excessively large or non-positive values to a SECURITY DEFINER function.
    AND s.started_at > (now() - (GREATEST(1, LEAST(timeout_minutes, 120)) || ' minutes')::interval)
    AND public.is_site_admin()
  ORDER BY s.started_at DESC
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_active_impersonation_session IS
  'Returns active impersonation session for current admin user if within timeout (clamped to 1-120 min)';
