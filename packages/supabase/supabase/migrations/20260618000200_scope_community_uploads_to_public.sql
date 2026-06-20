-- =============================================================================
-- T4: Scope the anon community-uploads SELECT policy to active (public)
--     communities only
-- =============================================================================
-- RATIONALE
-- ----------
-- 20260615210000_fix_community_uploads_select_policy.sql added two policies:
--
--   "Community members can read community folder" (TO authenticated)
--   "Public can read community folder"            (TO anon)
--
-- Both match ANY object whose first path segment is "communities" in the
-- uploads bucket — including assets that belong to pending, rejected, or
-- suspended communities. A suspended community's logo or banner should not be
-- enumerable or readable by unauthenticated callers.
--
-- This migration narrows the anon policy: anon callers may only read
-- community assets when the community record has status = 'active'. Active
-- is the canonical "public" state used throughout the query layer
-- (see listPublicCommunities in packages/supabase/src/queries/communities.ts).
--
-- The authenticated policy ("Community members can read community folder") is
-- intentionally left broader — community owners need to manage (read/replace/
-- delete) their own assets even while their community is pending or suspended.
--
-- NOTE: communities.id is bigint; (storage.foldername(name))[2] is text.
-- The cast c.id::text is required for the comparison.
--
-- Public community logos and banners continue to render for unauthenticated
-- visitors. Assets belonging to non-active communities are no longer
-- enumerable or readable by anon callers.
-- =============================================================================

DO $$
BEGIN
  -- Narrow the anon policy to active (public) communities only.
  -- The bucket/folder check is preserved verbatim from the previous migration;
  -- the EXISTS sub-select is the new scope guard.
  DROP POLICY IF EXISTS "Public can read community folder" ON storage.objects;
  CREATE POLICY "Public can read community folder"
    ON storage.objects FOR SELECT
    TO anon
    USING (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = 'communities'
      AND EXISTS (
        SELECT 1
        FROM public.communities c
        WHERE c.id::text = (storage.foldername(name))[2]
          AND c.status = 'active'
      )
    );

EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Storage policy skipped (insufficient privileges in local dev).';
END $$;
