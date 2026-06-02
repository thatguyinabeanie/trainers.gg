-- Harden coaching RLS + badge function (PR #339 review).
-- - coach_profiles: only expose ACTIVE coaches; allow owner insert/update only while is_coach.
-- - get_coach_badges: pin search_path='', only answer for public alts (no private-alt
--   existence probing), and fall back to users.username when main_alt is missing.

DROP POLICY IF EXISTS "Coach profiles are viewable by everyone" ON public.coach_profiles;
DROP POLICY IF EXISTS "Active coach profiles are viewable" ON public.coach_profiles;
CREATE POLICY "Active coach profiles are viewable"
  ON public.coach_profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = coach_profiles.user_id AND u.is_coach)
  );

DROP POLICY IF EXISTS "Coaches can update their own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can update their own profile"
  ON public.coach_profiles FOR UPDATE TO authenticated
  USING (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.is_coach)
  )
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.is_coach)
  );

DROP POLICY IF EXISTS "Coaches can insert their own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can insert their own profile"
  ON public.coach_profiles FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = (select auth.uid()) AND u.is_coach)
  );

CREATE OR REPLACE FUNCTION public.get_coach_badges(p_alt_ids bigint[])
RETURNS TABLE(alt_id bigint, show_coach_badge boolean, coach_handle text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    a.id AS alt_id,
    (
      COALESCE((SELECT ff.enabled FROM public.feature_flags ff WHERE ff.key = 'coaching'), false)
      AND u.is_coach
    ) AS show_coach_badge,
    CASE
      WHEN COALESCE((SELECT ff.enabled FROM public.feature_flags ff WHERE ff.key = 'coaching'), false)
           AND u.is_coach
      THEN COALESCE(ma.username, u.username)
      ELSE NULL
    END AS coach_handle
  FROM public.alts a
  JOIN public.users u ON u.id = a.user_id
  LEFT JOIN public.alts ma ON ma.id = u.main_alt_id
  WHERE a.id = ANY(p_alt_ids)
    AND a.is_public;
$$;

GRANT EXECUTE ON FUNCTION public.get_coach_badges(bigint[]) TO anon, authenticated;
