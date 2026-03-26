-- Fix security advisory: skill_bracket_for_rating has mutable search_path.
-- Adding SET search_path = '' prevents search_path injection attacks.

CREATE OR REPLACE FUNCTION public.skill_bracket_for_rating(p_rating numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN p_rating >= 1800 THEN 'expert'
    WHEN p_rating >= 1500 THEN 'advanced'
    WHEN p_rating >= 1200 THEN 'intermediate'
    ELSE 'beginner'
  END;
$$;
