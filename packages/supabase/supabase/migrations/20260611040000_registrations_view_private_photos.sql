-- Migration: Public registrations view + lock base SELECT + private rental photos
--            (RLS audit finding #3 / decision #3)
--
-- ROOT CAUSE
-- ----------
-- public.tournament_registrations carried a permissive SELECT policy
-- ("Tournament registrations are viewable", USING (true)) from the baseline.
-- Because anon/authenticated reach the table over the PostgREST API, this
-- leaked EVERY column of EVERY registration to anyone with the anon key,
-- including staff-internal fields:
--   drop_notes            (free-text staff notes about a drop / DQ)
--   dropped_by            (which staff user dropped the player)
--   rental_team_photo_key / rental_team_photo_url
--                         (and the `uploads` bucket is PUBLIC, so the photo
--                          objects themselves were fetchable by URL)
-- Public-facing features (the tournament detail page, open team-sheet lists)
-- only ever needed a small set of SAFE columns.
--
-- STRATEGY (mirrors RLS audit #1, the public_user_profiles view)
-- --------------------------------------------------------------
-- 1. Expose ONLY the safe public columns through a dedicated view
--    public.public_tournament_registrations. security_invoker = false so the
--    view reads past the caller's own-row/staff RLS on the base table, but it
--    can only ever project the safe columns it selects — the staff-internal
--    columns are simply not in the view.
-- 2. Lock public.tournament_registrations SELECT to own (the registration's
--    alt belongs to auth.uid()) + staff (tournament.manage on the tournament's
--    community). Staff retain FULL-ROW read — they need drop_notes for disputes
--    and a staff drop-notes UI is planned. service_role bypasses RLS, so
--    server-side/edge code is unaffected.
-- 3. Rental team photos must NOT be public. Create a PRIVATE storage bucket
--    `rental-photos` with owner+staff-only read RLS. New uploads target this
--    bucket and the read path generates a short-lived signed URL server-side.

-- ---------------------------------------------------------------------------
-- 1. Safe public projection of tournament_registrations.
--    Included safe columns (all confirmed to exist on the table):
--      id, tournament_id, alt_id, status, registered_at, checked_in_at,
--      team_name, team_submitted_at, display_name_option, show_country_flag,
--      in_game_name, team_id
--    team_id is included because it is NOT staff-internal: the public open
--    team-sheet list joins registration -> team_id -> teams, and teams already
--    has its own public RLS for open team sheets. Without team_id the public
--    team list cannot resolve which team belongs to which registration.
--    Deliberately EXCLUDED (staff-internal / sensitive):
--      drop_notes, drop_category, dropped_by, dropped_at,
--      rental_team_photo_url, rental_team_photo_key,
--      rental_team_photo_uploaded_at, rental_team_photo_verified,
--      rental_team_photo_verified_by, rental_team_photo_verified_at,
--      team_locked, created_at
--
--    security_invoker = false: the view runs with the view owner's privileges,
--    so it reads past the new own/staff RLS on the base table while exposing
--    only the safe columns projected here.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.public_tournament_registrations
  WITH (security_invoker = false) AS
SELECT
  id,
  tournament_id,
  alt_id,
  status,
  registered_at,
  checked_in_at,
  team_name,
  team_submitted_at,
  display_name_option,
  show_country_flag,
  in_game_name,
  team_id
FROM public.tournament_registrations;

COMMENT ON VIEW public.public_tournament_registrations IS
  'RLS audit #3: safe public projection of public.tournament_registrations. '
  'Exposes only non-staff-internal columns; PUBLIC reads (tournament detail '
  'page, open team-sheet lists) point here instead of the locked-down base '
  'table. security_invoker=false so it reads past the own/staff RLS while '
  'projecting only safe columns. SELECT-only — never grant write access.';

-- SELECT only — never grant write access to the view.
GRANT SELECT ON public.public_tournament_registrations TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Lock public.tournament_registrations SELECT to own + staff.
--    Drops the baseline "Tournament registrations are viewable" USING (true)
--    policy. INSERT/UPDATE/DELETE policies are untouched (own-alt scoped).
--    service_role bypasses RLS entirely, so server/edge reads are unaffected.
--
--    Own:   the registration's alt belongs to the current user.
--    Staff: the user holds tournament.manage on the tournament's community.
--           has_community_permission() already uses (SELECT auth.uid())
--           internally and is SECURITY DEFINER, so it is initplan-safe here.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tournament registrations are viewable" ON public.tournament_registrations;

DROP POLICY IF EXISTS "Registrations readable by owner or staff" ON public.tournament_registrations;
CREATE POLICY "Registrations readable by owner or staff"
  ON public.tournament_registrations FOR SELECT
  TO authenticated
  USING (
    alt_id IN (
      SELECT a.id FROM public.alts a WHERE a.user_id = (SELECT auth.uid())
    )
    OR EXISTS (
      SELECT 1
      FROM public.tournaments t
      WHERE t.id = tournament_registrations.tournament_id
        AND public.has_community_permission(t.community_id, 'tournament.manage')
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Private rental-photos storage bucket + owner/staff-only read RLS.
--    The legacy `uploads` bucket is PUBLIC; rental photos must not be. New
--    uploads target `rental-photos`; the read path generates a signed URL.
--
--    Path convention (matches getUploadPath): {userId}/{file}. The first path
--    segment is the uploader's auth uid, which the INSERT/owner policies key
--    off. Staff read is granted via tournament.manage on any tournament the
--    uploading user is registered for with a rental photo in this bucket.
--
--    NOTE: existing rental photo objects already living in the PUBLIC `uploads`
--    bucket are NOT migrated here — moving object bytes between buckets is a
--    data migration handled separately. New uploads + the signed-URL read path
--    land in this migration; the existing-object move is a follow-up.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'rental-photos',
  'rental-photos',
  false, -- PRIVATE — objects are only reachable via signed URLs
  2097152, -- 2 MiB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for the rental-photos bucket.
-- Wrapped in DO/EXCEPTION because the Supabase CLI migration runner uses the
-- `postgres` role which lacks privileges on storage.objects in local dev.
-- Policies are created on hosted Supabase (where postgres IS a superuser) and
-- gracefully skipped locally — same pattern as the avatar/uploads migration.
DO $$
BEGIN
  -- Owners can read their own rental photos (first path segment = their uid).
  DROP POLICY IF EXISTS "Owners read own rental photos" ON storage.objects;
  CREATE POLICY "Owners read own rental photos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'rental-photos'
      AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

  -- Staff can read rental photos for tournaments they manage. The uploading
  -- user's uid is the first path segment; resolve it to alts -> registrations
  -- -> tournaments and check tournament.manage on the community.
  DROP POLICY IF EXISTS "Staff read managed rental photos" ON storage.objects;
  CREATE POLICY "Staff read managed rental photos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'rental-photos'
      AND EXISTS (
        SELECT 1
        FROM public.tournament_registrations tr
        JOIN public.tournaments t ON t.id = tr.tournament_id
        JOIN public.alts a ON a.id = tr.alt_id
        WHERE tr.rental_team_photo_key IS NOT NULL
          AND a.user_id::text = (storage.foldername(name))[1]
          AND public.has_community_permission(t.community_id, 'tournament.manage')
      )
    );

  -- Authenticated users can upload to their own folder.
  DROP POLICY IF EXISTS "Users upload own rental photos" ON storage.objects;
  CREATE POLICY "Users upload own rental photos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'rental-photos'
      AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

  -- Authenticated users can update files in their own folder.
  DROP POLICY IF EXISTS "Users update own rental photos" ON storage.objects;
  CREATE POLICY "Users update own rental photos"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'rental-photos'
      AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

  -- Authenticated users can delete files in their own folder.
  DROP POLICY IF EXISTS "Users delete own rental photos" ON storage.objects;
  CREATE POLICY "Users delete own rental photos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'rental-photos'
      AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'rental-photos storage policies skipped (insufficient privileges in local dev).';
END $$;
