
-- Add whats_new_checked_at column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS whats_new_checked_at timestamptz NOT NULL DEFAULT now();

-- Admin SELECT policy for note_views
CREATE POLICY "Admins can view all note views"
ON public.note_views
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));
