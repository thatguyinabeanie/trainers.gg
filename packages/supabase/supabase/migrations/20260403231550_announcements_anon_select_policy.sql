-- Allow anonymous (unauthenticated) users to read active announcements.
--
-- The AnnouncementBanner component uses createStaticClient() (anon role, no
-- auth session) so it can render in ISR/static pages. The existing SELECT
-- policy only targets `authenticated`, so anon requests are blocked by RLS —
-- causing a silent query error.
--
-- Announcements are public information displayed to ALL site visitors.

-- Anon users can read active, currently scheduled announcements
CREATE POLICY "Anon users can read active announcements"
  ON public.announcements
  FOR SELECT
  TO anon
  USING (
    is_active = true
    AND start_at <= now()
    AND (end_at IS NULL OR end_at > now())
  );
