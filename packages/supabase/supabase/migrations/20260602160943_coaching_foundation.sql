-- Coaching foundation: account-level coach status, editable coach profiles,
-- and a privacy-safe badge-resolution function.
--
-- WHY a SECURITY DEFINER function for badges: tournament/standings queries run
-- client-side and the alts RLS is "viewable by everyone". Joining users.is_coach
-- into those queries would leak a private alt -> coach-account link. get_coach_badges
-- returns ONLY a boolean + the public coach handle, computed server-side, and gates
-- on the GLOBAL coaching flag so badges never appear before release.

ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.coach_granted';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.coach_revoked';

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_coach boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.coach_profiles (
  user_id       uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  headline      text,
  bio           text,
  formats       text[] NOT NULL DEFAULT '{}',
  links         jsonb  NOT NULL DEFAULT '[]'::jsonb,
  service_types text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Coach profiles are viewable by everyone" ON public.coach_profiles;
CREATE POLICY "Coach profiles are viewable by everyone"
  ON public.coach_profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Coaches can update their own profile" ON public.coach_profiles;
CREATE POLICY "Coaches can update their own profile"
  ON public.coach_profiles FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE OR REPLACE FUNCTION public.get_coach_badges(p_alt_ids bigint[])
RETURNS TABLE(alt_id bigint, show_coach_badge boolean, coach_handle text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id AS alt_id,
    (
      COALESCE((SELECT ff.enabled FROM public.feature_flags ff WHERE ff.key = 'coaching'), false)
      AND a.is_public
      AND u.is_coach
    ) AS show_coach_badge,
    CASE
      WHEN COALESCE((SELECT ff.enabled FROM public.feature_flags ff WHERE ff.key = 'coaching'), false)
           AND a.is_public
           AND u.is_coach
      THEN ma.username
      ELSE NULL
    END AS coach_handle
  FROM public.alts a
  JOIN public.users u ON u.id = a.user_id
  LEFT JOIN public.alts ma ON ma.id = u.main_alt_id
  WHERE a.id = ANY(p_alt_ids);
$$;

GRANT EXECUTE ON FUNCTION public.get_coach_badges(bigint[]) TO anon, authenticated;
