ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone;

-- Allow users to update their own last_seen via the existing UPDATE policy (already covers auth.uid() = id).
-- Backfill last_seen_at with updated_at as a reasonable starting point.
UPDATE public.profiles SET last_seen_at = updated_at WHERE last_seen_at IS NULL;