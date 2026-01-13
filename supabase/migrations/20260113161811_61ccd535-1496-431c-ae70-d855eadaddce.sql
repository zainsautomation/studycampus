-- Part 5: Anonymous posting feature

-- Add anonymous_posts_enabled to app_settings
INSERT INTO app_settings (key, value) 
VALUES ('anonymous_posts_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Add is_anonymous column to posts, questions, and requests
ALTER TABLE public.posts ADD COLUMN is_anonymous boolean DEFAULT false;
ALTER TABLE public.questions ADD COLUMN is_anonymous boolean DEFAULT false;
ALTER TABLE public.requests ADD COLUMN is_anonymous boolean DEFAULT false;