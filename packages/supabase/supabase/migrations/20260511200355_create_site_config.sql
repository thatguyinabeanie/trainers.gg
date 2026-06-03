-- Site-wide configuration key-value store for admin operational settings.
-- Used by cron jobs and background processors (e.g., auto-import toggle).
CREATE TABLE IF NOT EXISTS public.site_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

COMMENT ON TABLE public.site_config IS 'Key-value store for site-wide admin operational settings (e.g., auto_import_enabled).';

-- Enable RLS
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

-- Only site admins can read config (role_id = 1 is site_admin)
DROP POLICY IF EXISTS "Site admins can read config" ON public.site_config;
CREATE POLICY "Site admins can read config"
  ON public.site_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
        AND role_id = 1
    )
  );

-- Only site admins can insert config
DROP POLICY IF EXISTS "Site admins can insert config" ON public.site_config;
CREATE POLICY "Site admins can insert config"
  ON public.site_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
        AND role_id = 1
    )
  );

-- Only site admins can update config
DROP POLICY IF EXISTS "Site admins can update config" ON public.site_config;
CREATE POLICY "Site admins can update config"
  ON public.site_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
        AND role_id = 1
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = (select auth.uid())
        AND role_id = 1
    )
  );

-- Service role (cron jobs) bypasses RLS, so no separate policy needed.

-- Seed auto-import as disabled by default
INSERT INTO public.site_config (key, value)
VALUES ('auto_import_enabled', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
