-- Fix RLS policy for mcq_attempts to allow completing attempts
-- The current policy prevents updating status from 'in_progress' to 'completed'

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can update own in-progress attempts" ON public.mcq_attempts;

-- Create a new policy that allows users to update their own attempts
-- USING: Can only update rows that belong to the user AND are in_progress
-- WITH CHECK: The updated row must still belong to the user (status can change to completed)
CREATE POLICY "Users can update own in-progress attempts" 
ON public.mcq_attempts 
FOR UPDATE 
USING (auth.uid() = user_id AND status = 'in_progress')
WITH CHECK (auth.uid() = user_id);