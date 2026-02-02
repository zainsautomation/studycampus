-- Fix duplicate points on re-likes by adding idempotency check
CREATE OR REPLACE FUNCTION public.on_post_like_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_author_id uuid;
  v_existing_transaction uuid;
BEGIN
  -- Get the post author
  SELECT user_id INTO v_post_author_id FROM posts WHERE id = NEW.post_id;
  
  -- Check if points were already awarded for this specific post like
  -- This prevents duplicate points when a user unlikes and re-likes
  SELECT id INTO v_existing_transaction 
  FROM point_transactions 
  WHERE reference_id = NEW.post_id 
    AND reference_type = 'post' 
    AND action = 'post_liked'
    AND user_id = v_post_author_id;
  
  -- Only award points if:
  -- 1. Post author exists
  -- 2. Liker is not the post author (no self-like points)
  -- 3. Points haven't been awarded for this post yet
  IF v_post_author_id IS NOT NULL 
     AND v_post_author_id != NEW.user_id 
     AND v_existing_transaction IS NULL THEN
    PERFORM award_points(v_post_author_id, 'post_liked', 1, 'post', NEW.post_id);
  END IF;
  
  RETURN NEW;
END;
$$;