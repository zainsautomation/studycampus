-- Allow authenticated users to update current_uses on invite_codes during signup
CREATE POLICY "Authenticated users can increment usage"
ON public.invite_codes
FOR UPDATE
TO authenticated
USING (is_active = true)
WITH CHECK (is_active = true);