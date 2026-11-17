DROP POLICY IF EXISTS "Users can unlike their own likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Verified students can unlike post comment likes" ON public.comment_likes;
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