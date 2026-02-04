-- =============================================================================
-- Fix mutable search_path on generate_bracket_order
-- =============================================================================
--
-- Supabase security advisor flagged:
--   function_search_path_mutable: Function `public.generate_bracket_order`
--   has a role mutable search_path
--
-- Fix: add SET search_path = '' to pin the search path.

CREATE OR REPLACE FUNCTION public.generate_bracket_order(p_bracket_size integer)
RETURNS integer[]
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_smaller integer[];
  v_result integer[];
  v_seed integer;
BEGIN
  IF p_bracket_size = 1 THEN
    RETURN ARRAY[1];
  END IF;
  IF p_bracket_size = 2 THEN
    RETURN ARRAY[1, 2];
  END IF;

  v_smaller := public.generate_bracket_order(p_bracket_size / 2);
  v_result := ARRAY[]::integer[];

  FOREACH v_seed IN ARRAY v_smaller LOOP
    v_result := v_result || v_seed;
    v_result := v_result || (p_bracket_size + 1 - v_seed);
  END LOOP;

  RETURN v_result;
END;
$$;
