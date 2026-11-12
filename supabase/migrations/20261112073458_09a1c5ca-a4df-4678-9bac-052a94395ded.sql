CREATE TABLE public.student_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  submitted_name text NOT NULL,
  roll_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_verification_requests TO authenticated;
GRANT ALL ON public.student_verification_requests TO service_role;
ALTER TABLE public.student_verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students view own verification requests or admins view all"
  ON public.student_verification_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Students submit pending verification requests"
  ON public.student_verification_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND review_note IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
  );
CREATE POLICY "Admins manage student verification requests"
  ON public.student_verification_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE UNIQUE INDEX student_verification_one_pending_per_student
  ON public.student_verification_requests (user_id)
  WHERE status = 'pending';
CREATE INDEX student_verification_status_created_idx
  ON public.student_verification_requests (status, created_at DESC);

CREATE OR REPLACE FUNCTION public.update_student_verification_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER update_student_verification_requests_updated_at
  BEFORE UPDATE ON public.student_verification_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_student_verification_updated_at();

CREATE OR REPLACE FUNCTION public.is_verified_student(p_user_id uuid)
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
REVOKE ALL ON FUNCTION public.is_verified_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_verified_student(uuid) TO authenticated;

DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
CREATE POLICY "Verified students and admins can create posts"
  ON public.posts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (public.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );
DROP POLICY IF EXISTS "Users can update own posts or admin" ON public.posts;
CREATE POLICY "Verified students can update own posts or admin"
  ON public.posts FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id AND public.is_verified_student(auth.uid()))
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    (auth.uid() = user_id AND public.is_verified_student(auth.uid()))
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
CREATE POLICY "Verified students and admins can like posts"
  ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (public.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );

DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
CREATE POLICY "Verified students can comment on posts and students can use Q&A"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      (
        post_id IS NOT NULL
        AND answer_id IS NULL
        AND (public.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
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
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own eligible comments"
  ON public.comments FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_id
    AND (post_id IS NULL OR public.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  )
  WITH CHECK (
    auth.uid() = user_id
    AND (post_id IS NULL OR public.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );

DROP POLICY IF EXISTS "Authenticated users can like comments" ON public.comment_likes;
CREATE POLICY "Verified students can like post comments"
  ON public.comment_likes FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_likes.comment_id
        AND (c.post_id IS NULL OR public.is_verified_student(auth.uid()) OR public.has_role(auth.uid(), 'admin'::public.app_role))
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
      'is_verified', public.is_verified_student(p.id)
    ) INTO result
    FROM public.profiles p
    WHERE p.id = lookup_value::uuid;
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
      'is_verified', public.is_verified_student(p.id)
    ) INTO result
    FROM public.profiles p
    WHERE p.username = lookup_value;
  END IF;

  RETURN result;
END;
$$;