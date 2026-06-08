-- =============================================================================
-- get_format_events RPC — distinct events for usage-timeline annotation pins
--
-- WHY: event_usage holds one row per (source, event_key, division, species), so
-- a single event expands to hundreds of rows. A plain PostgREST select would
-- return thousands of duplicates and risk the 1000-row cap silently truncating
-- recent events. DISTINCT collapses to one row per (event_key, event_date,
-- source) server-side; the distinct-event count for a format is small.
--
-- SECURITY INVOKER: runs with the caller's privileges, so RLS on event_usage
-- (public read, USING (true)) still applies — anon (createStaticClient) can read.
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
  ORDER BY eu.event_date;
$$;

GRANT EXECUTE ON FUNCTION public.get_format_events(text) TO anon, authenticated;
