-- Function to award points when a post is liked
CREATE OR REPLACE FUNCTION public.on_post_like_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id uuid;
BEGIN
  -- Get the post author
  SELECT user_id INTO v_post_author_id FROM posts WHERE id = NEW.post_id;
  
  -- Award 2 points to the post author (not the liker, and not self-likes)
  IF v_post_author_id IS NOT NULL AND v_post_author_id != NEW.user_id THEN
    PERFORM award_points(v_post_author_id, 'post_liked', 2, NEW.post_id, 'post');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on post_likes table
DROP TRIGGER IF EXISTS on_post_like_insert_trigger ON post_likes;
CREATE TRIGGER on_post_like_insert_trigger
AFTER INSERT ON post_likes
FOR EACH ROW
EXECUTE FUNCTION on_post_like_insert();

-- Add post_id column to comments table for post comments
ALTER TABLE comments ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES posts(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

-- Update RLS policy to allow viewing post comments
DROP POLICY IF EXISTS "Users can view comments" ON comments;
CREATE POLICY "Users can view comments" ON comments FOR SELECT USING (true);

-- Update insert policy to allow post comments
DROP POLICY IF EXISTS "Users can create comments" ON comments;
CREATE POLICY "Users can create comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);