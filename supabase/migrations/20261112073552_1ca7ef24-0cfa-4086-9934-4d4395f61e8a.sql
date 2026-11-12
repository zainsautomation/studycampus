CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

DROP POLICY IF EXISTS "Verified students and admins can create posts" ON public.posts;
DROP POLICY IF EXISTS "Verified students can update own posts or admin" ON public.posts;
DROP POLICY IF EXISTS "Verified students and admins can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Verified students can comment on posts and students can use Q&A" ON public.comments;
DROP POLICY IF EXISTS "Users can update own eligible comments" ON public.comments;
DROP POLICY IF EXISTS "Verified students can like post comments" ON public.comment_likes;

CREATE OR REPLACE FUNCTION private.is_verified_student(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_verification_requests svr
    WHERE svr.user_id = p_user_id
      AND svr.status = 'approved'
  );
$$;
REVOKE ALL ON FUNCTION private.is_verified_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_verified_student(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.is_verified_student(uuid);

CREATE POLICY "Verified students and admins can create posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (private.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );
CREATE POLICY "Verified students can update own posts or admin"
  ON public.posts FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id AND private.is_verified_student(auth.uid()))
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    (auth.uid() = user_id AND private.is_verified_student(auth.uid()))
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );
CREATE POLICY "Verified students and admins can like posts"
  ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (private.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );
CREATE POLICY "Verified students can comment on posts and students can use Q&A"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (
        post_id IS NOT NULL
        AND answer_id IS NULL
        AND (private.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
        AND EXISTS (SELECT 1 FROM public.posts p WHERE p.id = comments.post_id)
      )
      OR (post_id IS NULL AND answer_id IS NOT NULL)
      OR (
        post_id IS NULL
        AND answer_id IS NULL
        AND parent_comment_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.comments parent
          WHERE parent.id = comments.parent_comment_id AND parent.post_id IS NULL
        )
      )
    )
  );
CREATE POLICY "Users can update own eligible comments"
  ON public.comments FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND (post_id IS NULL OR private.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
  WITH CHECK (
    auth.uid() = user_id
    AND (post_id IS NULL OR private.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );
CREATE POLICY "Verified students can like post comments"
  ON public.comment_likes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_likes.comment_id
        AND (c.post_id IS NULL OR private.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
    )
  );

CREATE OR REPLACE FUNCTION public.get_public_profile(lookup_value text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result json;
  is_uuid boolean;
BEGIN
  is_uuid := lookup_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

  IF is_uuid THEN
    SELECT json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'username', p.username,
      'bio', p.bio,
      'avatar_url', p.avatar_url,
      'cover_url', p.cover_url,
      'is_public', p.is_public,
      'created_at', p.created_at,
      'social_links', p.social_links,
      'is_verified', private.is_verified_student(p.id)
    ) INTO result FROM public.profiles p WHERE p.id = lookup_value::uuid;
  ELSE
    SELECT json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'username', p.username,
      'bio', p.bio,
      'avatar_url', p.avatar_url,
      'cover_url', p.cover_url,
      'is_public', p.is_public,
      'created_at', p.created_at,
      'social_links', p.social_links,
      'is_verified', private.is_verified_student(p.id)
    ) INTO result FROM public.profiles p WHERE p.username = lookup_value;
  END IF;
  RETURN result;
END;
$$;