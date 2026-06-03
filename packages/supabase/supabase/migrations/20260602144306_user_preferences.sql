-- =============================================================================
-- User Preferences
-- =============================================================================
-- General-purpose per-user UI preferences. Each user has at most one row.
-- The `preferences` JSONB column holds an app-defined settings object
-- (e.g. builder default-view choices). When no row exists, app defaults apply.

CREATE TABLE IF NOT EXISTS public.user_preferences (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_user_id_unique UNIQUE (user_id)
);

ALTER TABLE public.user_preferences OWNER TO postgres;

COMMENT ON TABLE public.user_preferences IS 'Per-user general UI preferences (e.g. builder default views)';
COMMENT ON COLUMN public.user_preferences.preferences IS 'App-defined JSONB settings object';
COMMENT ON COLUMN public.user_preferences.user_id IS 'User who owns these preferences';

-- =============================================================================
-- RLS: user_preferences
-- =============================================================================

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can read their own preferences
DROP POLICY IF EXISTS "Users can read own preferences" ON public.user_preferences;
CREATE POLICY "Users can read own preferences"
  ON public.user_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Users can insert their own preferences
DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can update their own preferences
DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- No DELETE policy: this table is upsert-only. Resetting preferences is an
-- UPDATE to the defaults object, never a row delete.

-- =============================================================================
-- FUNCTION: updated_at trigger for user_preferences
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_user_preferences_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_user_preferences_updated_at
  ON public.user_preferences;
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_preferences_updated_at();
