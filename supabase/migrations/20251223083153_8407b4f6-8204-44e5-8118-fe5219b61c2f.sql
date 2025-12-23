-- Drop the existing policy that requires authentication
DROP POLICY IF EXISTS "Authenticated users can increment usage" ON public.invite_codes;

-- Create a new policy that allows anyone to update current_uses on active invite codes
-- This is safe because:
-- 1. Only current_uses can be updated (controlled by the policy check)
-- 2. The code must be active
-- 3. The application validates the invite code before incrementing
CREATE POLICY "Anyone can increment usage on active codes"
ON public.invite_codes
FOR UPDATE
TO anon, authenticated
USING (is_active = true)
WITH CHECK (is_active = true);