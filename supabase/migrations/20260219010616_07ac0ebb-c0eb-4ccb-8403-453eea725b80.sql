
-- Manually trigger achievement checks for all users with points
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN SELECT DISTINCT user_id FROM user_points
  LOOP
    PERFORM check_and_award_achievements(v_user.user_id);
  END LOOP;
END;
$$;
