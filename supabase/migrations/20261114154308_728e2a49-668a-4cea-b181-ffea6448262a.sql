CREATE OR REPLACE FUNCTION private.is_verified_student(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT svr.status = 'approved'
    FROM public.student_verification_requests AS svr
    WHERE svr.user_id = p_user_id
    ORDER BY svr.created_at DESC, svr.id DESC
    LIMIT 1
  ), false);
$$;

REVOKE ALL ON FUNCTION private.is_verified_student(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_verified_student(uuid) TO authenticated;

DROP POLICY IF EXISTS "Students submit pending verification requests" ON public.student_verification_requests;
CREATE POLICY "Students submit pending verification requests"
  ON public.student_verification_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND status = 'pending'
    AND review_note IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND NOT private.is_verified_student(auth.uid())
  );