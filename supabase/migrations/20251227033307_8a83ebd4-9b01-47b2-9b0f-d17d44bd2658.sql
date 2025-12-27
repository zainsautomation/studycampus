-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Anyone can view active codes for validation" ON public.invite_codes;
DROP POLICY IF EXISTS "Anyone can increment usage on active codes" ON public.invite_codes;

-- The invite_codes table should only be accessible by admins now
-- Edge functions use service role key to bypass RLS for validation