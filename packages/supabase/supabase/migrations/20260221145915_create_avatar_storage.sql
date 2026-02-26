-- Create uploads storage bucket (public — served without auth tokens)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  2097152, -- 2 MiB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for uploads bucket
-- Wrapped in DO/EXCEPTION because the Supabase CLI migration runner
-- uses the `postgres` role which lacks privileges on storage.objects
-- in local dev. Policies are created on hosted Supabase (where postgres
-- IS a superuser) and gracefully skipped locally.
DO $$
BEGIN
  -- Anyone can read uploads (public bucket)
  DROP POLICY IF EXISTS "Anyone can read uploads" ON storage.objects;
  CREATE POLICY "Anyone can read uploads"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'uploads');

  -- Authenticated users can upload to their own folder
  DROP POLICY IF EXISTS "Users can upload to own folder" ON storage.objects;
  CREATE POLICY "Users can upload to own folder"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  -- Authenticated users can update files in their own folder
  DROP POLICY IF EXISTS "Users can update own files" ON storage.objects;
  CREATE POLICY "Users can update own files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

  -- Authenticated users can delete files in their own folder
  DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;
  CREATE POLICY "Users can delete own files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'uploads'
      AND (storage.foldername(name))[1] = auth.uid()::text
    );

EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Storage policies skipped (insufficient privileges in local dev).';
END $$;
