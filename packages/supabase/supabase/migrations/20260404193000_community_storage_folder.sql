-- Add storage policies allowing community owners to upload to a
-- shared communities/ folder (e.g. communities/{id}/logo.jpg).
-- The existing user-folder policies are left intact.
DO $$
BEGIN
  -- Community owners can upload to communities/{communityId}/
  DROP POLICY IF EXISTS "Community owners can upload to community folder" ON storage.objects;
  CREATE POLICY "Community owners can upload to community folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = 'communities'
      AND EXISTS (
        SELECT 1 FROM public.communities
        WHERE id::text = (storage.foldername(name))[2]
          AND owner_user_id = (select auth.uid())
      )
    );

  -- Community owners can update files in communities/{communityId}/
  DROP POLICY IF EXISTS "Community owners can update community folder" ON storage.objects;
  CREATE POLICY "Community owners can update community folder"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = 'communities'
      AND EXISTS (
        SELECT 1 FROM public.communities
        WHERE id::text = (storage.foldername(name))[2]
          AND owner_user_id = (select auth.uid())
      )
    );

  -- Community owners can delete files in communities/{communityId}/
  DROP POLICY IF EXISTS "Community owners can delete community folder" ON storage.objects;
  CREATE POLICY "Community owners can delete community folder"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = 'communities'
      AND EXISTS (
        SELECT 1 FROM public.communities
        WHERE id::text = (storage.foldername(name))[2]
          AND owner_user_id = (select auth.uid())
      )
    );

EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Storage policies skipped (insufficient privileges in local dev).';
END $$;
