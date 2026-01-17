-- User points summary table
CREATE TABLE public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  total_points integer DEFAULT 0,
  weekly_points integer DEFAULT 0,
  level integer DEFAULT 1,
  rank_title text DEFAULT 'Freshman',
  streak_days integer DEFAULT 0,
  last_activity_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Point transaction history
CREATE TABLE public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action text NOT NULL,
  points integer NOT NULL,
  reference_type text,
  reference_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Achievement definitions
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  category text DEFAULT 'general',
  points_reward integer DEFAULT 0,
  criteria_type text NOT NULL,
  criteria_value integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- User earned achievements
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at timestamptz DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- User points policies
CREATE POLICY "Users can view all points" ON public.user_points FOR SELECT USING (true);
CREATE POLICY "System can manage points" ON public.user_points FOR ALL USING (true);

-- Point transactions policies
CREATE POLICY "Users can view own transactions" ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON public.point_transactions FOR INSERT WITH CHECK (true);

-- Achievements policies
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Admins can manage achievements" ON public.achievements FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- User achievements policies
CREATE POLICY "Users can view all user achievements" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "System can manage user achievements" ON public.user_achievements FOR ALL USING (true);

-- Function to calculate level from points
CREATE OR REPLACE FUNCTION public.calculate_level(total_points integer)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN GREATEST(1, FLOOR(SQRT(total_points::float / 100)) + 1)::integer;
END;
$$;

-- Function to get rank title from level
CREATE OR REPLACE FUNCTION public.get_rank_title(level integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN level >= 20 THEN 'Legend'
    WHEN level >= 15 THEN 'Master'
    WHEN level >= 10 THEN 'Senior'
    WHEN level >= 7 THEN 'Junior'
    WHEN level >= 4 THEN 'Sophomore'
    ELSE 'Freshman'
  END;
END;
$$;

-- Function to award points
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id uuid,
  p_action text,
  p_points integer,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_total integer;
  v_new_level integer;
  v_new_rank text;
  v_today date := CURRENT_DATE;
  v_last_date date;
  v_streak integer;
BEGIN
  -- Insert transaction
  INSERT INTO point_transactions (user_id, action, points, reference_type, reference_id)
  VALUES (p_user_id, p_action, p_points, p_reference_type, p_reference_id);
  
  -- Get or create user_points record
  INSERT INTO user_points (user_id, total_points, weekly_points, last_activity_date)
  VALUES (p_user_id, p_points, p_points, v_today)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_points.total_points + p_points,
    weekly_points = CASE 
      WHEN EXTRACT(DOW FROM user_points.updated_at) > EXTRACT(DOW FROM now()) 
      THEN p_points 
      ELSE user_points.weekly_points + p_points 
    END,
    last_activity_date = v_today,
    streak_days = CASE
      WHEN user_points.last_activity_date = v_today - 1 THEN user_points.streak_days + 1
      WHEN user_points.last_activity_date = v_today THEN user_points.streak_days
      ELSE 1
    END,
    updated_at = now()
  RETURNING total_points INTO v_new_total;
  
  -- Calculate new level and rank
  v_new_level := calculate_level(v_new_total);
  v_new_rank := get_rank_title(v_new_level);
  
  -- Update level and rank
  UPDATE user_points 
  SET level = v_new_level, rank_title = v_new_rank
  WHERE user_id = p_user_id;
END;
$$;

-- Trigger function for questions
CREATE OR REPLACE FUNCTION public.on_question_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM award_points(NEW.user_id, 'question_asked', 5, 'question', NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger function for answers
CREATE OR REPLACE FUNCTION public.on_answer_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM award_points(NEW.user_id, 'answer_posted', 10, 'answer', NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger function for answer accepted
CREATE OR REPLACE FUNCTION public.on_answer_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_question_user_id uuid;
BEGIN
  IF NEW.is_accepted = true AND (OLD.is_accepted IS NULL OR OLD.is_accepted = false) THEN
    -- Award points to answerer
    PERFORM award_points(NEW.user_id, 'answer_accepted', 25, 'answer', NEW.id);
    
    -- Award points to question author for accepting
    SELECT user_id INTO v_question_user_id FROM questions WHERE id = NEW.question_id;
    IF v_question_user_id IS NOT NULL THEN
      PERFORM award_points(v_question_user_id, 'accepted_answer', 5, 'question', NEW.question_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger function for posts
CREATE OR REPLACE FUNCTION public.on_post_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM award_points(NEW.user_id, 'post_created', 3, 'post', NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger function for comments
CREATE OR REPLACE FUNCTION public.on_comment_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM award_points(NEW.user_id, 'comment_posted', 2, 'comment', NEW.id);
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER trigger_question_points
  AFTER INSERT ON public.questions
  FOR EACH ROW
  EXECUTE FUNCTION on_question_insert();

CREATE TRIGGER trigger_answer_points
  AFTER INSERT ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION on_answer_insert();

CREATE TRIGGER trigger_answer_accepted_points
  AFTER UPDATE OF is_accepted ON public.answers
  FOR EACH ROW
  EXECUTE FUNCTION on_answer_accepted();

CREATE TRIGGER trigger_post_points
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION on_post_insert();

CREATE TRIGGER trigger_comment_points
  AFTER INSERT ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION on_comment_insert();

-- Seed initial achievements
INSERT INTO public.achievements (key, name, description, icon, category, points_reward, criteria_type, criteria_value) VALUES
  ('first_question', 'First Steps', 'Ask your first question', 'HelpCircle', 'community', 10, 'count', 1),
  ('helpful_5', 'Helping Hand', 'Post 5 answers', 'MessageSquare', 'community', 25, 'count', 5),
  ('problem_solver', 'Problem Solver', 'Get 3 answers accepted as best', 'CheckCircle', 'community', 50, 'count', 3),
  ('bookworm', 'Bookworm', 'Save 10 notes', 'Bookmark', 'learning', 25, 'count', 10),
  ('top_contributor', 'Top Contributor', 'Earn 500 total points', 'Trophy', 'milestone', 100, 'milestone', 500),
  ('rising_star', 'Rising Star', 'Reach Level 5', 'Star', 'milestone', 50, 'milestone', 5),
  ('community_pillar', 'Community Pillar', 'Post 20 answers', 'Users', 'community', 75, 'count', 20),
  ('active_learner', 'Active Learner', 'View 50 notes', 'Eye', 'learning', 30, 'count', 50),
  ('engaged', 'Engaged', 'Post 10 comments', 'MessageCircle', 'community', 20, 'count', 10),
  ('scholar', 'Scholar', 'Reach Level 10', 'GraduationCap', 'milestone', 100, 'milestone', 10),
  ('week_streak', '7-Day Streak', 'Log in for 7 consecutive days', 'Flame', 'streak', 35, 'streak', 7),
  ('first_post', 'Social Butterfly', 'Create your first post', 'Feather', 'community', 10, 'count', 1);