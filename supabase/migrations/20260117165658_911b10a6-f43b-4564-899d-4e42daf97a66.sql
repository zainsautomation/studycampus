-- Create post-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true);

-- RLS Policies for post-images bucket
CREATE POLICY "Users can upload post images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own post images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'post-images' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Anyone can view post images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'post-images');