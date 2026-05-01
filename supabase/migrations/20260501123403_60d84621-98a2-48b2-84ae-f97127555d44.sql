-- Create profile_views table to track which profiles a user has viewed
CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id uuid NOT NULL,
  viewed_profile_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (viewer_id, viewed_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewer ON public.profile_views(viewer_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed ON public.profile_views(viewed_profile_id);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Users can record their own profile views
CREATE POLICY "Users can record own profile views"
ON public.profile_views FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

CREATE POLICY "Users can update own profile views"
ON public.profile_views FOR UPDATE
USING (auth.uid() = viewer_id);

-- Viewers can see their own history; admins can see all
CREATE POLICY "Users can view own profile views"
ON public.profile_views FOR SELECT
USING (auth.uid() = viewer_id OR has_role(auth.uid(), 'admin'::app_role));