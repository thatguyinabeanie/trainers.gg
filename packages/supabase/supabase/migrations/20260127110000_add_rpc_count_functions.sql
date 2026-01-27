-- Migration: Add RPC functions for efficient batch counting
-- These functions allow fetching counts for multiple records in a single query,
-- avoiding PostgREST's 1000-row pagination limit when counting via joins.

-- Function: Get registration counts for multiple tournaments
CREATE OR REPLACE FUNCTION public.get_registration_counts(tournament_ids bigint[])
RETURNS TABLE (
  tournament_id bigint,
  registration_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.tournament_id,
    COUNT(*)::bigint AS registration_count
  FROM tournament_registrations tr
  WHERE tr.tournament_id = ANY(tournament_ids)
  GROUP BY tr.tournament_id;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_registration_counts(bigint[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_registration_counts(bigint[]) TO anon;

COMMENT ON FUNCTION public.get_registration_counts(bigint[]) IS 
  'Returns registration counts for multiple tournaments in a single query. Used by tournament listing pages to avoid N+1 queries.';

-- Function: Get tournament counts (active and total) for multiple organizations
CREATE OR REPLACE FUNCTION public.get_organization_tournament_counts(org_ids bigint[])
RETURNS TABLE (
  organization_id bigint,
  total_count bigint,
  active_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.organization_id,
    COUNT(*)::bigint AS total_count,
    COUNT(*) FILTER (WHERE t.status = 'active')::bigint AS active_count
  FROM tournaments t
  WHERE t.organization_id = ANY(org_ids)
    AND t.archived_at IS NULL
  GROUP BY t.organization_id;
END;
$$;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_organization_tournament_counts(bigint[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_organization_tournament_counts(bigint[]) TO anon;

COMMENT ON FUNCTION public.get_organization_tournament_counts(bigint[]) IS 
  'Returns tournament counts (total and active) for multiple organizations in a single query. Used by organization listing pages to avoid N+1 queries.';
