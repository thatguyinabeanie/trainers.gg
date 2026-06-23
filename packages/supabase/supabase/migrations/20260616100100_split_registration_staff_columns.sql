-- =============================================================================
-- P1b: Split staff-internal columns out of tournament_registrations
-- =============================================================================
-- RATIONALE
-- ----------
-- tournament_registrations is a "realtime-six" table — authenticated users
-- can SELECT it directly for live Realtime subscriptions. The base table also
-- carries staff-internal columns (drop_notes, dropped_by, rental photos, etc.)
-- that a dropped player must NOT be able to read about themselves.
--
-- Decision (locked in docs/decisions/2026-06-15-database-security-hardening.md
-- § P1b): staff drop/rental-photo columns are STAFF-ONLY. Move them to a new
-- tournament_registration_staff table with staff-only RLS policies.
--
-- PLAYER/STAFF BOUNDARY
-- ---------------------
-- Stays on tournament_registrations (player-readable):
--   id, alt_id, tournament_id, status, registered_at, checked_in_at,
--   team_name, team_id, team_submitted_at, team_locked, display_name_option,
--   show_country_flag, in_game_name, created_at
--   (plus all anon-granted safe columns from 20260615195810)
--
-- Moves to tournament_registration_staff (staff-only, NO player access):
--   drop_category, drop_notes, dropped_by, dropped_at
--   rental_team_photo_url, rental_team_photo_key,
--   rental_team_photo_uploaded_at, rental_team_photo_verified,
--   rental_team_photo_verified_by, rental_team_photo_verified_at
--
-- KEY: a dropped player must never read drop_notes/drop_category/dropped_by
-- about their own registration — it is staff-internal dispute/DQ information.
--
-- REALTIME-SIX NOTE
-- -----------------
-- tournament_registrations retains authenticated SELECT (for live subscriptions
-- in the manage view). The Realtime payload on the base table will no longer
-- include the moved columns, which is correct — staff monitor the staff table
-- via a separate subscription path.
--
-- AUDIT TRIGGER DEPENDENCY
-- ------------------------
-- audit_registration_status_change() reads NEW.drop_category / drop_notes /
-- dropped_by directly from the tournament_registrations trigger row. After
-- dropping those columns, the function is recreated below to JOIN to
-- tournament_registration_staff instead.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Create the staff-only side table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tournament_registration_staff (
  -- 1-to-1 with tournament_registrations; CASCADE so deleting the
  -- registration automatically removes staff notes.
  registration_id   bigint  PRIMARY KEY
                    REFERENCES public.tournament_registrations(id)
                    ON DELETE CASCADE,

  -- Drop metadata (staff-only — players must NOT read these)
  drop_category     public.drop_category,
  drop_notes        text,
  dropped_by        uuid    REFERENCES public.users(id) ON DELETE SET NULL,
  dropped_at        timestamptz,

  -- Rental team photo (staff-only — upload key / signed-URL path is internal)
  rental_team_photo_url           text,
  rental_team_photo_key           text,
  rental_team_photo_uploaded_at   timestamptz,
  rental_team_photo_verified      boolean DEFAULT false,
  -- verified_by references alts (a staff alt), FK migrated to alts in
  -- 20260121214424 (originally referenced profiles, then public.alts).
  rental_team_photo_verified_by   bigint  REFERENCES public.alts(id)
                                          ON DELETE SET NULL,
  rental_team_photo_verified_at   timestamptz
);

COMMENT ON TABLE public.tournament_registration_staff IS
  'Staff-internal columns split from tournament_registrations (P1b security '
  'hardening). Players must never SELECT from this table — staff-only RLS. '
  'Stores drop metadata (drop_notes, dropped_by, etc.) and rental team photo '
  'state. Joined to the base table by registration_id (1-to-1, CASCADE).';

COMMENT ON COLUMN public.tournament_registration_staff.drop_category IS
  'Reason category for why the player was dropped (no_show, conduct, disqualification, other)';
COMMENT ON COLUMN public.tournament_registration_staff.drop_notes IS
  'Free-text staff notes explaining why the player was dropped — STAFF ONLY';
COMMENT ON COLUMN public.tournament_registration_staff.dropped_by IS
  'User ID of the staff member who dropped the player';
COMMENT ON COLUMN public.tournament_registration_staff.dropped_at IS
  'Timestamp when the player was dropped from the tournament';
COMMENT ON COLUMN public.tournament_registration_staff.rental_team_photo_url IS
  'Rental team screenshot URL — STAFF ONLY (signed URL generated server-side)';
COMMENT ON COLUMN public.tournament_registration_staff.rental_team_photo_key IS
  'Storage key for rental photo in the rental-photos private bucket — STAFF ONLY';
COMMENT ON COLUMN public.tournament_registration_staff.rental_team_photo_uploaded_at IS
  'When rental team photo was uploaded';
COMMENT ON COLUMN public.tournament_registration_staff.rental_team_photo_verified IS
  'Whether the rental team photo has been verified by staff';
COMMENT ON COLUMN public.tournament_registration_staff.rental_team_photo_verified_by IS
  'Alt ID of the staff member who verified the rental team photo';
COMMENT ON COLUMN public.tournament_registration_staff.rental_team_photo_verified_at IS
  'Timestamp when the rental team photo was verified';

-- ---------------------------------------------------------------------------
-- 2. Enable RLS and create staff-only policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.tournament_registration_staff ENABLE ROW LEVEL SECURITY;

-- Staff check: the caller holds tournament.manage on the community that owns
-- the tournament linked to this registration. Mirrors the staff branch of the
-- "Registrations readable by owner or staff" policy on the base table
-- (20260611040000_registrations_view_private_photos.sql).
-- has_community_permission() is SECURITY DEFINER and uses (SELECT auth.uid())
-- internally — it is initplan-safe here.

-- SELECT: staff only — no player access, no anon access
DROP POLICY IF EXISTS "Staff read registration staff data" ON public.tournament_registration_staff;
CREATE POLICY "Staff read registration staff data"
  ON public.tournament_registration_staff FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tournaments t
      WHERE t.id = (
        SELECT tr.tournament_id
        FROM public.tournament_registrations tr
        WHERE tr.id = registration_id
      )
      AND public.has_community_permission(t.community_id, 'tournament.manage')
    )
  );

-- INSERT: staff only — upsert path (e.g. dropPlayer, rental photo upload)
DROP POLICY IF EXISTS "Staff insert registration staff data" ON public.tournament_registration_staff;
CREATE POLICY "Staff insert registration staff data"
  ON public.tournament_registration_staff FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tournaments t
      WHERE t.id = (
        SELECT tr.tournament_id
        FROM public.tournament_registrations tr
        WHERE tr.id = registration_id
      )
      AND public.has_community_permission(t.community_id, 'tournament.manage')
    )
  );

-- UPDATE: staff only
DROP POLICY IF EXISTS "Staff update registration staff data" ON public.tournament_registration_staff;
CREATE POLICY "Staff update registration staff data"
  ON public.tournament_registration_staff FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tournaments t
      WHERE t.id = (
        SELECT tr.tournament_id
        FROM public.tournament_registrations tr
        WHERE tr.id = registration_id
      )
      AND public.has_community_permission(t.community_id, 'tournament.manage')
    )
  );

-- DELETE: staff only (for photo removal etc.)
DROP POLICY IF EXISTS "Staff delete registration staff data" ON public.tournament_registration_staff;
CREATE POLICY "Staff delete registration staff data"
  ON public.tournament_registration_staff FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tournaments t
      WHERE t.id = (
        SELECT tr.tournament_id
        FROM public.tournament_registrations tr
        WHERE tr.id = registration_id
      )
      AND public.has_community_permission(t.community_id, 'tournament.manage')
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------
-- dropped_by on the new table (mirrors the existing partial index on the base
-- table for FK cascade performance — carried over from 20260220233417).
CREATE INDEX IF NOT EXISTS idx_registration_staff_dropped_by
  ON public.tournament_registration_staff (dropped_by)
  WHERE dropped_by IS NOT NULL;

-- rental_team_photo_verified_by for FK cascade performance.
CREATE INDEX IF NOT EXISTS idx_registration_staff_photo_verified_by
  ON public.tournament_registration_staff (rental_team_photo_verified_by)
  WHERE rental_team_photo_verified_by IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 4. Backfill: copy existing staff-column data from the base table
-- ---------------------------------------------------------------------------
-- Only rows where at least one staff column is non-null get a staff row.
-- ON CONFLICT DO NOTHING makes the backfill idempotent on replay.
INSERT INTO public.tournament_registration_staff (
  registration_id,
  drop_category,
  drop_notes,
  dropped_by,
  dropped_at,
  rental_team_photo_url,
  rental_team_photo_key,
  rental_team_photo_uploaded_at,
  rental_team_photo_verified,
  rental_team_photo_verified_by,
  rental_team_photo_verified_at
)
SELECT
  id,
  drop_category,
  drop_notes,
  dropped_by,
  dropped_at,
  rental_team_photo_url,
  rental_team_photo_key,
  rental_team_photo_uploaded_at,
  rental_team_photo_verified,
  rental_team_photo_verified_by,
  rental_team_photo_verified_at
FROM public.tournament_registrations
WHERE
  drop_category              IS NOT NULL
  OR drop_notes              IS NOT NULL
  OR dropped_by              IS NOT NULL
  OR dropped_at              IS NOT NULL
  OR rental_team_photo_url   IS NOT NULL
  OR rental_team_photo_key   IS NOT NULL
  OR rental_team_photo_uploaded_at IS NOT NULL
  OR (rental_team_photo_verified IS NOT NULL AND rental_team_photo_verified = true)
  OR rental_team_photo_verified_by IS NOT NULL
  OR rental_team_photo_verified_at IS NOT NULL
ON CONFLICT (registration_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Update the audit trigger to JOIN to tournament_registration_staff
-- ---------------------------------------------------------------------------
-- audit_registration_status_change() previously read NEW.drop_category,
-- NEW.drop_notes, and NEW.dropped_by directly from the trigger row. Those
-- columns no longer exist on tournament_registrations after step 6 below.
-- Recreate the function to SELECT the drop metadata from the staff table.
CREATE OR REPLACE FUNCTION public.audit_registration_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = ''
AS $$
DECLARE
  v_community_id bigint;
  v_actor_user_id uuid;
  v_drop_category text;
  v_drop_notes    text;
  v_dropped_by    uuid;
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get community context from the tournament
  SELECT t.community_id
    INTO v_community_id
    FROM public.tournaments t
   WHERE t.id = NEW.tournament_id;

  -- -----------------------------------------------------------------------
  -- registration.dropped — player dropped from tournament
  -- -----------------------------------------------------------------------
  IF NEW.status = 'dropped' THEN
    -- Fetch drop metadata from the staff table (columns moved from base table
    -- in 20260616100100_split_registration_staff_columns.sql).
    SELECT
      s.drop_category::text,
      s.drop_notes,
      s.dropped_by
    INTO
      v_drop_category,
      v_drop_notes,
      v_dropped_by
    FROM public.tournament_registration_staff s
    WHERE s.registration_id = NEW.id;

    -- Actor is the staff member who dropped the player, falling back to the
    -- current session user (self-drop case).
    v_actor_user_id := COALESCE(v_dropped_by, (SELECT auth.uid()));

    INSERT INTO public.audit_log
      (action, actor_user_id, tournament_id, community_id, metadata)
    VALUES (
      'registration.dropped',
      v_actor_user_id,
      NEW.tournament_id,
      v_community_id,
      jsonb_build_object(
        'registration_id', NEW.id,
        'alt_id',          NEW.alt_id,
        'previous_status', OLD.status::text,
        'drop_category',   v_drop_category,
        'drop_notes',      v_drop_notes,
        'dropped_by',      v_dropped_by
      )
    );
  END IF;

  -- -----------------------------------------------------------------------
  -- registration.checked_in — player checked in to tournament
  -- -----------------------------------------------------------------------
  IF NEW.status = 'checked_in' THEN
    v_actor_user_id := (SELECT auth.uid());

    INSERT INTO public.audit_log
      (action, actor_user_id, tournament_id, community_id, metadata)
    VALUES (
      'registration.checked_in',
      v_actor_user_id,
      NEW.tournament_id,
      v_community_id,
      jsonb_build_object(
        'registration_id', NEW.id,
        'alt_id',          NEW.alt_id,
        'previous_status', OLD.status::text
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach the trigger (CREATE OR REPLACE FUNCTION above replaces the body;
-- the trigger binding is unchanged, but we explicitly recreate it for clarity
-- and idempotency across schema replays).
DROP TRIGGER IF EXISTS audit_registration_status_change_trigger ON public.tournament_registrations;
CREATE TRIGGER audit_registration_status_change_trigger
  AFTER UPDATE ON public.tournament_registrations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_registration_status_change();

-- ---------------------------------------------------------------------------
-- 5b. Drop storage policy that depends on rental_team_photo_key
-- ---------------------------------------------------------------------------
-- The storage.objects policy "Staff read managed rental photos" (created in
-- 20260611040000_registrations_view_private_photos.sql) references
-- tournament_registrations.rental_team_photo_key in its USING clause.
-- It must be dropped before step 6 or PostgreSQL refuses the DROP COLUMN.
-- It is recreated in step 7 below, referencing the staff table instead.
-- DO/EXCEPTION matches the pattern in 20260611040000 for local dev compat.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Staff read managed rental photos" ON storage.objects;
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Staff read managed rental photos policy drop skipped (insufficient privileges in local dev).';
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Drop the moved columns from the base table
-- ---------------------------------------------------------------------------
-- The public_tournament_registrations view (20260615195810) only selects the
-- 12 safe columns (id, tournament_id, alt_id, status, registered_at,
-- checked_in_at, team_name, team_submitted_at, display_name_option,
-- show_country_flag, in_game_name, team_id) — none of the moved columns are
-- referenced there, so no view recreation is needed.
--
-- The anon column-level GRANT SELECT from 20260615195810 also does NOT include
-- any of the moved columns — no grant change needed.
--
-- team_locked and created_at are NOT dropped: team_locked is player-facing
-- (gates the team-edit UI) and created_at is a standard audit column.
ALTER TABLE public.tournament_registrations
  DROP COLUMN IF EXISTS drop_category,
  DROP COLUMN IF EXISTS drop_notes,
  DROP COLUMN IF EXISTS dropped_by,
  DROP COLUMN IF EXISTS dropped_at,
  DROP COLUMN IF EXISTS rental_team_photo_url,
  DROP COLUMN IF EXISTS rental_team_photo_key,
  DROP COLUMN IF EXISTS rental_team_photo_uploaded_at,
  DROP COLUMN IF EXISTS rental_team_photo_verified,
  DROP COLUMN IF EXISTS rental_team_photo_verified_by,
  DROP COLUMN IF EXISTS rental_team_photo_verified_at;

-- Drop the now-redundant partial index on dropped_by that lived on the base
-- table (created by 20260220233417). The equivalent index is now on the staff
-- table (idx_registration_staff_dropped_by, step 3 above).
DROP INDEX IF EXISTS public.idx_tournament_registrations_dropped_by;

-- ---------------------------------------------------------------------------
-- 7. Recreate storage policy for staff rental-photo read
-- ---------------------------------------------------------------------------
-- rental_team_photo_key was moved from tournament_registrations to
-- tournament_registration_staff earlier in this migration. The old storage
-- policy referenced the base-table column — recreate it to join through the
-- staff table instead. DO/EXCEPTION handles local dev compatibility.
DO $$
BEGIN
  DROP POLICY IF EXISTS "Staff read managed rental photos" ON storage.objects;
  CREATE POLICY "Staff read managed rental photos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'rental-photos'
      AND EXISTS (
        SELECT 1
        FROM public.tournament_registration_staff trs
        JOIN public.tournament_registrations tr ON tr.id = trs.registration_id
        JOIN public.tournaments t ON t.id = tr.tournament_id
        JOIN public.alts a ON a.id = tr.alt_id
        WHERE trs.rental_team_photo_key IS NOT NULL
          AND a.user_id::text = (storage.foldername(name))[1]
          AND public.has_community_permission(t.community_id, 'tournament.manage')
      )
    );
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Staff read managed rental photos policy recreation skipped (insufficient privileges in local dev).';
END;
$$;
