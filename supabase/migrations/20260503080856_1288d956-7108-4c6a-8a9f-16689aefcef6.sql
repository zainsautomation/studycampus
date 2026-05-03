CREATE OR REPLACE FUNCTION public.bump_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  v_user_id := COALESCE(
    NULLIF(to_jsonb(NEW) ->> 'user_id', '')::uuid,
    NULLIF(to_jsonb(NEW) ->> 'viewer_id', '')::uuid
  );

  IF v_user_id IS NOT NULL THEN
    UPDATE public.profiles
    SET last_seen_at = now()
    WHERE id = v_user_id;
  END IF;

  RETURN NEW;
END;
$$;