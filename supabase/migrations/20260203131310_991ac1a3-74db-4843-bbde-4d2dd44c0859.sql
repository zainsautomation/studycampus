-- Function to check and award achievements based on user activity
CREATE OR REPLACE FUNCTION public.check_and_award_achievements(p_user_id uuid)
RETURNS TABLE(achievement_key text, achievement_name text, points_reward integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement RECORD;
  v_count integer;
  v_user_points RECORD;
BEGIN
  -- Get user's current stats
  SELECT * INTO v_user_points FROM user_points WHERE user_id = p_user_id;
  
  -- Loop through all achievements
  FOR v_achievement IN SELECT * FROM achievements LOOP
    -- Skip if already earned
    IF EXISTS (
      SELECT 1 FROM user_achievements 
      WHERE user_id = p_user_id AND achievement_id = v_achievement.id
    ) THEN
      CONTINUE;
    END IF;
    
    -- Check criteria based on type
    CASE v_achievement.criteria_type
      WHEN 'count' THEN
        -- Count-based achievements
        CASE v_achievement.key
          WHEN 'first_question' THEN
            SELECT COUNT(*) INTO v_count FROM questions WHERE user_id = p_user_id;
          WHEN 'first_post' THEN
            SELECT COUNT(*) INTO v_count FROM posts WHERE user_id = p_user_id;
          WHEN 'helpful_5' THEN
            SELECT COUNT(*) INTO v_count FROM answers WHERE user_id = p_user_id;
          WHEN 'community_pillar' THEN
            SELECT COUNT(*) INTO v_count FROM answers WHERE user_id = p_user_id;
          WHEN 'problem_solver' THEN
            SELECT COUNT(*) INTO v_count FROM answers 
            WHERE user_id = p_user_id AND is_accepted = true;
          WHEN 'engaged' THEN
            SELECT COUNT(*) INTO v_count FROM comments WHERE user_id = p_user_id;
          WHEN 'bookworm' THEN
            SELECT COUNT(*) INTO v_count FROM saved_notes WHERE user_id = p_user_id;
          WHEN 'active_learner' THEN
            SELECT COUNT(*) INTO v_count FROM note_views WHERE user_id = p_user_id;
          ELSE
            v_count := 0;
        END CASE;
        
        IF v_count >= v_achievement.criteria_value THEN
          INSERT INTO user_achievements (user_id, achievement_id)
          VALUES (p_user_id, v_achievement.id)
          ON CONFLICT DO NOTHING;
          
          IF FOUND THEN
            achievement_key := v_achievement.key;
            achievement_name := v_achievement.name;
            points_reward := v_achievement.points_reward;
            RETURN NEXT;
          END IF;
        END IF;
        
      WHEN 'milestone' THEN
        -- Milestone achievements (level or points)
        IF v_user_points IS NOT NULL THEN
          CASE v_achievement.key
            WHEN 'rising_star' THEN
              IF v_user_points.level >= v_achievement.criteria_value THEN
                INSERT INTO user_achievements (user_id, achievement_id)
                VALUES (p_user_id, v_achievement.id)
                ON CONFLICT DO NOTHING;
                
                IF FOUND THEN
                  achievement_key := v_achievement.key;
                  achievement_name := v_achievement.name;
                  points_reward := v_achievement.points_reward;
                  RETURN NEXT;
                END IF;
              END IF;
            WHEN 'scholar' THEN
              IF v_user_points.level >= v_achievement.criteria_value THEN
                INSERT INTO user_achievements (user_id, achievement_id)
                VALUES (p_user_id, v_achievement.id)
                ON CONFLICT DO NOTHING;
                
                IF FOUND THEN
                  achievement_key := v_achievement.key;
                  achievement_name := v_achievement.name;
                  points_reward := v_achievement.points_reward;
                  RETURN NEXT;
                END IF;
              END IF;
            WHEN 'top_contributor' THEN
              IF v_user_points.total_points >= v_achievement.criteria_value THEN
                INSERT INTO user_achievements (user_id, achievement_id)
                VALUES (p_user_id, v_achievement.id)
                ON CONFLICT DO NOTHING;
                
                IF FOUND THEN
                  achievement_key := v_achievement.key;
                  achievement_name := v_achievement.name;
                  points_reward := v_achievement.points_reward;
                  RETURN NEXT;
                END IF;
              END IF;
            ELSE
              NULL;
          END CASE;
        END IF;
        
      WHEN 'streak' THEN
        IF v_user_points IS NOT NULL AND 
           v_user_points.streak_days >= v_achievement.criteria_value THEN
          INSERT INTO user_achievements (user_id, achievement_id)
          VALUES (p_user_id, v_achievement.id)
          ON CONFLICT DO NOTHING;
          
          IF FOUND THEN
            achievement_key := v_achievement.key;
            achievement_name := v_achievement.name;
            points_reward := v_achievement.points_reward;
            RETURN NEXT;
          END IF;
        END IF;
      ELSE
        NULL;
    END CASE;
  END LOOP;
  
  RETURN;
END;
$$;

-- Trigger function to check achievements after points update
CREATE OR REPLACE FUNCTION public.trigger_check_achievements()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM check_and_award_achievements(NEW.user_id);
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS after_points_update ON public.user_points;

CREATE TRIGGER after_points_update
  AFTER INSERT OR UPDATE ON public.user_points
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_achievements();

-- Add unique constraint to prevent duplicate achievements if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_achievements_user_achievement_unique'
  ) THEN
    ALTER TABLE public.user_achievements 
    ADD CONSTRAINT user_achievements_user_achievement_unique 
    UNIQUE (user_id, achievement_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;