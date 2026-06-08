-- =============================================================================
-- get_format_events — add tie-breaker to ORDER BY for deterministic results
--
-- WHY: ORDER BY event_date alone is non-deterministic when multiple events
-- share the same date. Adding event_key and source as tie-breakers makes the
-- result set stable across queries.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_format_events(p_format text)
RETURNS TABLE (event_key text, event_date date, source text)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT DISTINCT eu.event_key, eu.event_date, eu.source
  FROM public.event_usage eu
  WHERE eu.format = p_format
  ORDER BY eu.event_date, eu.event_key, eu.source;
$$;

GRANT EXECUTE ON FUNCTION public.get_format_events(text) TO anon, authenticated;
