-- ============================================================================
-- Analytics RPCs for server-side aggregation
--
-- These replace client-side GROUP BY logic in the admin analytics queries.
-- All functions are SECURITY DEFINER with restricted search_path,
-- marked STABLE (read-only), and limited to the authenticated role.
-- ============================================================================

-- 1. Tournament counts grouped by status
-- Returns: TABLE (status text, count int)
CREATE OR REPLACE FUNCTION public.get_tournament_counts_by_status()
RETURNS TABLE (status text, count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT status::text, count(*)::int
  FROM tournaments
  GROUP BY status;
$$;

-- Restrict access to authenticated users only
REVOKE ALL ON FUNCTION public.get_tournament_counts_by_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tournament_counts_by_status() TO authenticated;

-- 2. Organization counts grouped by status and tier (returned as jsonb)
-- Returns: jsonb with two keys: by_status and by_tier
CREATE OR REPLACE FUNCTION public.get_organization_counts()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'by_status', (
      SELECT coalesce(jsonb_object_agg(status::text, cnt), '{}'::jsonb)
      FROM (
        SELECT status, count(*)::int AS cnt
        FROM organizations
        GROUP BY status
      ) s
    ),
    'by_tier', (
      SELECT coalesce(jsonb_object_agg(tier::text, cnt), '{}'::jsonb)
      FROM (
        SELECT tier, count(*)::int AS cnt
        FROM organizations
        GROUP BY tier
      ) t
    )
  );
$$;

-- Restrict access to authenticated users only
REVOKE ALL ON FUNCTION public.get_organization_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_organization_counts() TO authenticated;

-- 3. User growth stats (daily signup counts for the last N days)
-- Returns: TABLE (date date, count int)
CREATE OR REPLACE FUNCTION public.get_user_growth_stats(lookback_days int DEFAULT 30)
RETURNS TABLE (date date, count int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT date_trunc('day', created_at)::date AS date, count(*)::int
  FROM users
  WHERE created_at >= (current_date - lookback_days)
  GROUP BY 1
  ORDER BY 1;
$$;

-- Restrict access to authenticated users only
REVOKE ALL ON FUNCTION public.get_user_growth_stats(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_growth_stats(int) TO authenticated;
