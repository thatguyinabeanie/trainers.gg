-- =============================================================================
-- Restrict uploads bucket listing to own folder
-- =============================================================================
-- The Supabase security linter flagged the uploads bucket for having a broad
-- SELECT policy ("Anyone can read uploads") that allows any caller to list ALL
-- files in the bucket via the Storage list API.
--
-- The uploads bucket stores profile avatars (public by design). Public URL
-- access (/storage/v1/object/public/uploads/...) is unaffected by RLS — that
-- path bypasses policies for public buckets. So avatar <img src> tags continue
-- to work without auth.
--
-- The fix:
--   • Drop the broad anon-readable SELECT policy (no longer needed for public
--     URL access since the bucket is public=true).
--   • Add a path-restricted policy so authenticated users can list and manage
--     only their own folder ({user_id}/filename).
--
-- This clears the "Public Bucket Allows Listing" linter warning without
-- breaking avatar display on public pages.
-- =============================================================================

-- Storage policies require elevated privileges not available to the postgres
-- role in local dev. Wrap in DO/EXCEPTION as the existing storage migration
-- (20260221145915_create_avatar_storage.sql) does.
DO $$
BEGIN
  -- Remove the broad "Anyone can read uploads" policy that allowed full
  -- bucket enumeration by unauthenticated callers.
  DROP POLICY IF EXISTS "Anyone can read uploads" ON storage.objects;

  -- Authenticated users may list and read objects in their own folder only.
  DROP POLICY IF EXISTS "Users can list own uploads" ON storage.objects;
  CREATE POLICY "Users can list own uploads"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Storage policies skipped (insufficient privileges in local dev).';
END $$;
