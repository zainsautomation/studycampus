
UPDATE storage.buckets SET public = true WHERE id = 'notes';
DROP POLICY IF EXISTS "Authenticated users can read notes" ON storage.objects;
