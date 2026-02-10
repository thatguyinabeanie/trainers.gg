-- ============================================================================
-- Restrict analytics RPCs to site admins only
--
-- Previously these SECURITY DEFINER functions were granted EXECUTE to the
-- `authenticated` role, meaning any logged-in user could call them directly
-- and access platform-wide operational data (tournament counts, org tier
-- distribution, daily signup counts).
--
-- This migration recreates all three functions with an `is_site_admin()`
-- guard inside the function body. Non-admin callers receive an empty result
-- set. The `get_user_growth_stats` lookback parameter is also clamped to
-- [1, 365] to prevent unbounded historical queries.
-- ============================================================================

-- 1. Tournament counts grouped by status (admin-only)
CREATE OR REPLACE FUNCTION public.get_tournament_counts_by_status()
RETURNS TABLE (status text, count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.status::text, count(*)::int
  FROM tournaments t
  WHERE public.is_site_admin()
  GROUP BY t.status;
$$;

-- 2. Organization counts grouped by status and tier (admin-only)
CREATE OR REPLACE FUNCTION public.get_organization_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN NOT public.is_site_admin() THEN '{}'::jsonb
    ELSE (
      SELECT jsonb_build_object(
        'by_status', (
          SELECT coalesce(jsonb_object_agg(s.status::text, s.cnt), '{}'::jsonb)
          FROM (
            SELECT o.status, count(*)::int AS cnt
            FROM organizations o
            GROUP BY o.status
          ) s
        ),
        'by_tier', (
          SELECT coalesce(jsonb_object_agg(t.tier::text, t.cnt), '{}'::jsonb)
          FROM (
            SELECT o.tier, count(*)::int AS cnt
            FROM organizations o
            GROUP BY o.tier
          ) t
        )
      )
    )
  END;
$$;

-- 3. User growth stats with admin check and bounded lookback (admin-only)
CREATE OR REPLACE FUNCTION public.get_user_growth_stats(lookback_days int DEFAULT 30)
RETURNS TABLE (date date, count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date_trunc('day', u.created_at)::date AS date, count(*)::int
  FROM users u
  WHERE public.is_site_admin()
    AND u.created_at >= (current_date - GREATEST(1, LEAST(lookback_days, 365)))
  GROUP BY 1
  ORDER BY 1;
$$;
