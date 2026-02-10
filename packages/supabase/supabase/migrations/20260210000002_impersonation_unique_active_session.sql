-- =============================================================================
-- Enforce single active impersonation session per admin
-- =============================================================================
-- Prevents multiple concurrent active sessions (ended_at IS NULL) for the
-- same admin user. Defense-in-depth alongside the application-level check
-- that ends existing sessions before creating new ones.

CREATE UNIQUE INDEX IF NOT EXISTS impersonation_sessions_unique_active_admin
  ON public.impersonation_sessions (admin_user_id)
  WHERE ended_at IS NULL;
