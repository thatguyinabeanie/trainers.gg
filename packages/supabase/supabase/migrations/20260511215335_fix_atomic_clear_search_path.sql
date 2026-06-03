-- Pin search_path on SECURITY DEFINER function for consistency with
-- the repo's hardening standard. The original function was created
-- without SET search_path — this redefines it with the correct
-- hardening to prevent object-shadowing attacks.
--
-- All table references are schema-qualified so the practical risk
-- without search_path was low, but adding it matches every other
-- SECURITY DEFINER function in the codebase.

CREATE OR REPLACE FUNCTION limitless.atomic_clear_tournament(
  p_tournament_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  DELETE FROM limitless.match_results WHERE tournament_id = p_tournament_id;
  DELETE FROM limitless.standings WHERE tournament_id = p_tournament_id;
  DELETE FROM limitless.phases WHERE tournament_id = p_tournament_id;
END;
$$;
