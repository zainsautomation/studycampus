DROP POLICY IF EXISTS "Users can delete own posts or admin" ON public.posts;
CREATE POLICY "Verified students can delete own posts or admin"
  ON public.posts FOR DELETE TO authenticated
  USING (
    (auth.uid() = user_id AND private.is_verified_student(auth.uid()))
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Users and admins can delete comments" ON public.comments;
CREATE POLICY "Verified students can delete own post comments or Q&A comments"
  ON public.comments FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      auth.uid() = user_id
      AND (post_id IS NULL OR private.is_verified_student(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "Users can unlike own likes" ON public.post_likes;
CREATE POLICY "Verified students can unlike own post likes"
  ON public.post_likes FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    AND (private.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );

DROP POLICY IF EXISTS "Users can unlike own likes" ON public.comment_likes;
CREATE POLICY "Verified students can unlike post comment likes"
  ON public.comment_likes FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.comments AS c
      WHERE c.id = comment_likes.comment_id
        AND (c.post_id IS NULL OR private.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );

DROP POLICY IF EXISTS "Users can upload post images" ON storage.objects;
CREATE POLICY "Verified students can upload post images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'post-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
    AND COALESCE((metadata->>'size')::bigint, 0) <= 5242880
    AND metadata->>'mimetype' IN ('image/jpeg','image/png','image/gif','image/webp')
    AND (private.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );