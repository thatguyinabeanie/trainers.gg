-- =============================================================================
-- Restore SELECT access to community assets in the uploads bucket
-- =============================================================================
-- Migration 20260615195840_fix_uploads_bucket_listing.sql narrowed the uploads
-- bucket SELECT policy to "{uid}/" paths only (authenticated users, own folder).
-- That correctly closes the broad bucket-enumeration linter warning, but it also
-- removed the only SELECT path for the "communities/" prefix.
--
-- Community logos and banners are stored at communities/{id}/logo.jpg etc. and
-- are PUBLIC assets — they render on public pages for unauthenticated visitors.
-- On hosted Supabase (where storage clients run as "authenticated" under RLS,
-- not as service-role), community owners could no longer SELECT/list those
-- objects, causing logo/banner replace + delete operations to silently fail.
-- The regression was masked locally because local dev uses service-role for
-- storage operations.
--
-- This migration is purely additive: it restores community-folder visibility
-- without touching the "{uid}/" own-folder policy from 20260615195840.
--
-- Two policies are added:
--   1. Authenticated users can read/list any file in communities/
--      (required for community owners to manage their assets)
--   2. Anon callers can read/list any file in communities/
--      (required for logos/banners to render on public pages)
-- =============================================================================

DO $$
BEGIN
  -- Authenticated users can read / list files in the shared communities/ prefix.
  -- Mirrors the role targeting of the community INSERT/UPDATE/DELETE policies in
  -- 20260404193000_community_storage_folder.sql.
  DROP POLICY IF EXISTS "Community members can read community folder" ON storage.objects;
  CREATE POLICY "Community members can read community folder"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = 'communities'
    );

  -- Anon callers can read / list files in the communities/ prefix.
  -- Community logos and banners are public assets displayed on pages that are
  -- accessible without authentication.
  DROP POLICY IF EXISTS "Public can read community folder" ON storage.objects;
  CREATE POLICY "Public can read community folder"
    ON storage.objects FOR SELECT
    TO anon
    USING (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = 'communities'
    );

EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Storage policies skipped (insufficient privileges in local dev).';
END $$;
