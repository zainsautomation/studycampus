
DROP POLICY IF EXISTS "Admins can upload notes files" ON storage.objects;
CREATE POLICY "Admins can upload notes files" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'notes'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
  AND COALESCE((metadata->>'size')::bigint, 0) <= 52428800
  AND (
    metadata->>'mimetype' IN (
      'application/pdf',
      'image/jpeg','image/png','image/gif','image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    )
  )
);

DROP POLICY IF EXISTS "Users can upload post images" ON storage.objects;
CREATE POLICY "Users can upload post images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND COALESCE((metadata->>'size')::bigint, 0) <= 5242880
  AND metadata->>'mimetype' IN ('image/jpeg','image/png','image/gif','image/webp')
);

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
  AND COALESCE((metadata->>'size')::bigint, 0) <= 3145728
  AND metadata->>'mimetype' IN ('image/jpeg','image/png','image/gif','image/webp')
);
