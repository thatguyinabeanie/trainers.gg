-- Returns synced + imported counts per format_id for the limitless.tournaments table.
-- Called from the limitless-import edge function via supabase.rpc().
CREATE OR REPLACE FUNCTION limitless.tournament_stats()
RETURNS TABLE (
  format_id text,
  synced bigint,
  imported bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    t.format_id,
    COUNT(*)::bigint AS synced,
    COUNT(t.data_imported_at)::bigint AS imported
  FROM limitless.tournaments t
  GROUP BY t.format_id
  ORDER BY COUNT(*) DESC;
$$;

-- Allow the service role (edge functions) to call this function.
-- No anon/authenticated access needed — admin-only endpoint.
GRANT EXECUTE ON FUNCTION limitless.tournament_stats() TO service_role;
