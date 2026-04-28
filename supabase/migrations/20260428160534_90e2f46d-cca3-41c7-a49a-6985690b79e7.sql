
-- 1. Restrict email column on profiles: revoke from anon/authenticated, only service_role can read
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated, public;

-- 2. RPC for users to fetch their own email safely
CREATE OR REPLACE FUNCTION public.get_my_email()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_email() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_email() TO authenticated;

-- 3. RPC for admins to fetch any user's email
CREATE OR REPLACE FUNCTION public.get_user_email_admin(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id = _user_id;
  RETURN v_email;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_email_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_email_admin(uuid) TO authenticated;

-- 4. Bulk admin RPC for listing emails (used by ManageUsers / MCQ results)
CREATE OR REPLACE FUNCTION public.get_user_emails_admin(_user_ids uuid[])
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT p.id, p.email
    FROM public.profiles p
    WHERE p.id = ANY(_user_ids);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_emails_admin(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_emails_admin(uuid[]) TO authenticated;

-- 5. Make 'notes' bucket private (signed URLs from now on)
UPDATE storage.buckets SET public = false WHERE id = 'notes';

-- 6. Add RLS-style storage policies for notes bucket (authenticated read)
DROP POLICY IF EXISTS "Authenticated users can read notes" ON storage.objects;
CREATE POLICY "Authenticated users can read notes"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'notes');

-- 7. Lock down the publicly-callable parser is handled in code (auth check in edge function)
