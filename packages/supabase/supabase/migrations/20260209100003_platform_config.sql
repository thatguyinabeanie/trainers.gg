-- =============================================================================
-- Platform Configuration: Feature Flags & Announcements
-- =============================================================================
-- 1. feature_flags table — runtime feature toggles managed from admin UI
-- 2. announcements table — scheduled site-wide banners
-- 3. New audit actions for config changes
-- =============================================================================

-- =============================================================================
-- Add new audit actions
-- =============================================================================
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.flag_created';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.flag_toggled';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.flag_deleted';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.announcement_created';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.announcement_updated';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'admin.announcement_deleted';

-- =============================================================================
-- TABLE: feature_flags
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.feature_flags (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  key text NOT NULL UNIQUE,
  description text,
  enabled boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_flags OWNER TO postgres;

COMMENT ON TABLE public.feature_flags IS 'Runtime feature flags managed from the admin panel';
COMMENT ON COLUMN public.feature_flags.key IS 'Unique flag identifier (e.g., maintenance_mode)';
COMMENT ON COLUMN public.feature_flags.metadata IS 'Additional configuration (e.g., rollout percentage, allowed users)';

CREATE INDEX feature_flags_key_idx ON public.feature_flags (key);

-- =============================================================================
-- TABLE: announcements
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.announcements (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info'
    CHECK (type IN ('info', 'warning', 'error', 'success')),
  start_at timestamptz NOT NULL DEFAULT now(),
  end_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements OWNER TO postgres;

COMMENT ON TABLE public.announcements IS 'Scheduled site-wide announcement banners';
COMMENT ON COLUMN public.announcements.type IS 'Banner style: info (blue), warning (amber), error (red), success (green)';
COMMENT ON COLUMN public.announcements.start_at IS 'When the banner becomes visible';
COMMENT ON COLUMN public.announcements.end_at IS 'When the banner stops being visible (NULL = indefinite)';

CREATE INDEX announcements_active_idx
  ON public.announcements (is_active, start_at, end_at)
  WHERE is_active = true;

-- =============================================================================
-- RLS: feature_flags
-- =============================================================================
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read feature flags (needed for client-side checks)
CREATE POLICY "Authenticated users can read feature flags"
  ON public.feature_flags
  FOR SELECT
  TO authenticated
  USING (true);

-- Only site admins can create feature flags
CREATE POLICY "Site admins can create feature flags"
  ON public.feature_flags
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_site_admin());

-- Only site admins can update feature flags
CREATE POLICY "Site admins can update feature flags"
  ON public.feature_flags
  FOR UPDATE
  TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- Only site admins can delete feature flags
CREATE POLICY "Site admins can delete feature flags"
  ON public.feature_flags
  FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

-- =============================================================================
-- RLS: announcements
-- =============================================================================
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read active announcements within their schedule
CREATE POLICY "Authenticated users can read active announcements"
  ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    -- Site admins can see all announcements (for admin panel)
    public.is_site_admin()
    OR (
      -- Regular users only see active, currently scheduled announcements
      is_active = true
      AND start_at <= now()
      AND (end_at IS NULL OR end_at > now())
    )
  );

-- Only site admins can create announcements
CREATE POLICY "Site admins can create announcements"
  ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_site_admin());

-- Only site admins can update announcements
CREATE POLICY "Site admins can update announcements"
  ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (public.is_site_admin())
  WITH CHECK (public.is_site_admin());

-- Only site admins can delete announcements
CREATE POLICY "Site admins can delete announcements"
  ON public.announcements
  FOR DELETE
  TO authenticated
  USING (public.is_site_admin());

-- =============================================================================
-- Seed initial feature flags
-- =============================================================================
INSERT INTO public.feature_flags (key, description, enabled)
VALUES
  ('maintenance_mode', 'When enabled, non-authenticated users are redirected to the waitlist page', false),
  ('open_registration', 'When enabled, users can register without an invite', false)
ON CONFLICT (key) DO NOTHING;
