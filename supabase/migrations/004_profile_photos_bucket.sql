-- Profile photo storage bucket.
-- Photos are stored at: avatars/{user_id}/avatar.{ext}
-- The bucket is public so profile photos are visible to all visitors without
-- an authenticated session.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp']
)
ON CONFLICT (id) DO NOTHING;

-- Authenticated users may upload / replace their own avatar.
-- The path must start with the caller's UUID so no user can overwrite another's file.
CREATE POLICY "avatars_owner_write" ON storage.objects
  FOR ALL TO authenticated
  USING  (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Everyone (including unauthenticated visitors) can read profile photos.
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'avatars');
