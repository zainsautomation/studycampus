
-- Function to bump last_seen_at on the profile of the acting user
CREATE OR REPLACE FUNCTION public.bump_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(NEW.user_id, NEW.viewer_id);
  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles SET last_seen_at = now() WHERE id = v_user_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach to activity tables
DROP TRIGGER IF EXISTS trg_bump_last_seen_questions ON public.questions;
CREATE TRIGGER trg_bump_last_seen_questions AFTER INSERT ON public.questions
FOR EACH ROW EXECUTE FUNCTION public.bump_last_seen();

DROP TRIGGER IF EXISTS trg_bump_last_seen_answers ON public.answers;
CREATE TRIGGER trg_bump_last_seen_answers AFTER INSERT ON public.answers
FOR EACH ROW EXECUTE FUNCTION public.bump_last_seen();

DROP TRIGGER IF EXISTS trg_bump_last_seen_posts ON public.posts;
CREATE TRIGGER trg_bump_last_seen_posts AFTER INSERT ON public.posts
FOR EACH ROW EXECUTE FUNCTION public.bump_last_seen();

DROP TRIGGER IF EXISTS trg_bump_last_seen_comments ON public.comments;
CREATE TRIGGER trg_bump_last_seen_comments AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.bump_last_seen();

DROP TRIGGER IF EXISTS trg_bump_last_seen_note_views ON public.note_views;
CREATE TRIGGER trg_bump_last_seen_note_views AFTER INSERT OR UPDATE ON public.note_views
FOR EACH ROW EXECUTE FUNCTION public.bump_last_seen();

DROP TRIGGER IF EXISTS trg_bump_last_seen_profile_views ON public.profile_views;
CREATE TRIGGER trg_bump_last_seen_profile_views AFTER INSERT OR UPDATE ON public.profile_views
FOR EACH ROW EXECUTE FUNCTION public.bump_last_seen();

DROP TRIGGER IF EXISTS trg_bump_last_seen_mcq_attempts ON public.mcq_attempts;
CREATE TRIGGER trg_bump_last_seen_mcq_attempts AFTER INSERT OR UPDATE ON public.mcq_attempts
FOR EACH ROW EXECUTE FUNCTION public.bump_last_seen();

-- RPC for client heartbeat (any logged-in user can call to update their own last_seen)
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

-- Backfill last_seen_at from latest known activity
WITH latest AS (
  SELECT user_id, MAX(ts) AS ts FROM (
    SELECT user_id, created_at AS ts FROM public.questions
    UNION ALL SELECT user_id, created_at FROM public.answers
    UNION ALL SELECT user_id, created_at FROM public.posts
    UNION ALL SELECT user_id, created_at FROM public.comments
    UNION ALL SELECT user_id, viewed_at FROM public.note_views
    UNION ALL SELECT viewer_id AS user_id, viewed_at FROM public.profile_views
    UNION ALL SELECT user_id, started_at FROM public.mcq_attempts
  ) s
  WHERE user_id IS NOT NULL
  GROUP BY user_id
)
UPDATE public.profiles p
SET last_seen_at = GREATEST(COALESCE(p.last_seen_at, 'epoch'::timestamptz), latest.ts)
FROM latest
WHERE p.id = latest.user_id;
