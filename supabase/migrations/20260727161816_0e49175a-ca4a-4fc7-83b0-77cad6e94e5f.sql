
-- Atomic invite code increment (server-computed, ignores client-supplied count)
CREATE OR REPLACE FUNCTION public.increment_invite_code_usage(_code_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean := false;
BEGIN
  UPDATE public.invite_codes
     SET current_uses = COALESCE(current_uses, 0) + 1
   WHERE id = _code_id
     AND is_active = true
     AND (max_uses IS NULL OR COALESCE(current_uses, 0) < max_uses)
     AND (expires_at IS NULL OR expires_at > now());
  IF FOUND THEN v_ok := true; END IF;
  RETURN v_ok;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_invite_code_usage(uuid) FROM PUBLIC, anon, authenticated;
-- service_role retains via default

-- Lock down email column on profiles (no direct client reads; use RPCs)
REVOKE SELECT (email) ON public.profiles FROM anon, authenticated;

-- Revoke EXECUTE on internal-only SECURITY DEFINER functions (triggers/utilities)
-- These are called by triggers or admin paths only.
REVOKE EXECUTE ON FUNCTION public.bump_last_seen() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_and_award_achievements(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_check_achievements() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_comment_likes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_answer_accepted() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_answer_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_comment_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_mcq_attempt_complete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_post_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_post_like_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_question_insert() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_email_admin(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_emails_admin(uuid[]) FROM PUBLIC, anon;
