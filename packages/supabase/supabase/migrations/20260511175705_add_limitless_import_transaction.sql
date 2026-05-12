-- Atomic clear of tournament child data for safe re-import.
-- Wraps all deletes in a single transaction so partial failures
-- cannot leave the tournament in an inconsistent state.

CREATE OR REPLACE FUNCTION limitless.atomic_clear_tournament(
  p_tournament_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM limitless.match_results WHERE tournament_id = p_tournament_id;
  DELETE FROM limitless.standings WHERE tournament_id = p_tournament_id;
  DELETE FROM limitless.phases WHERE tournament_id = p_tournament_id;
END;
$$;

-- Only service_role can call this
REVOKE ALL ON FUNCTION limitless.atomic_clear_tournament(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION limitless.atomic_clear_tournament(text) FROM anon;
REVOKE ALL ON FUNCTION limitless.atomic_clear_tournament(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION limitless.atomic_clear_tournament(text) TO service_role;
