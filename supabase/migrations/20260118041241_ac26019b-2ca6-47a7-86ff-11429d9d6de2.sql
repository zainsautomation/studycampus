-- Phase 3: Update post like points from 2 to 1
CREATE OR REPLACE FUNCTION public.on_post_like_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id uuid;
BEGIN
  SELECT user_id INTO v_post_author_id FROM posts WHERE id = NEW.post_id;
  
  IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.user_id THEN
    -- Changed from 2 to 1 point
    PERFORM award_points(v_post_author_id, 'post_liked', 1, NEW.post_id, 'post');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Phase 5: Add comment likes
-- Add likes_count column to comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes_count integer DEFAULT 0;

-- Create comment_likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Enable RLS on comment_likes
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS policies for comment_likes
CREATE POLICY "Anyone can view comment likes"
ON comment_likes FOR SELECT USING (true);

CREATE POLICY "Authenticated users can like comments"
ON comment_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike their own likes"
ON comment_likes FOR DELETE
USING (auth.uid() = user_id);

-- Function to update comment likes count
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes_count = GREATEST(COALESCE(likes_count, 0) - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$;

-- Create trigger for comment likes count
DROP TRIGGER IF EXISTS comment_likes_count_trigger ON comment_likes;
CREATE TRIGGER comment_likes_count_trigger
AFTER INSERT OR DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- Phase 6: Add is_public column to profiles for profile visibility
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- Create index for public profiles lookup
CREATE INDEX IF NOT EXISTS idx_profiles_is_public ON profiles(is_public) WHERE is_public = true;

-- Update RLS policy to allow viewing public profiles
DROP POLICY IF EXISTS "Users can view own profile or admins can view all" ON profiles;
DROP POLICY IF EXISTS "Users can view public profiles" ON profiles;

CREATE POLICY "Users can view public profiles or own profile"
ON profiles FOR SELECT
USING (
  auth.uid() = id 
  OR is_public = true 
  OR has_role(auth.uid(), 'admin'::app_role)
);