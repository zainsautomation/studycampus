ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_complete boolean NOT NULL DEFAULT false;

-- Backfill: existing users (signed up via email+invite) are already onboarded
UPDATE public.profiles SET onboarding_complete = true WHERE onboarding_complete = false;

-- Update handle_new_user so email signups (which already use invite code) start as complete,
-- but OAuth signups (no full_name in metadata) start as incomplete.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_full_name text := NEW.raw_user_meta_data->>'full_name';
  v_provider text := NEW.raw_app_meta_data->>'provider';
  v_is_oauth boolean := v_provider IS NOT NULL AND v_provider <> 'email';
BEGIN
  INSERT INTO public.profiles (id, full_name, email, avatar_url, onboarding_complete)
  VALUES (
    NEW.id,
    COALESCE(v_full_name, NEW.raw_user_meta_data->>'name'),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url',
    NOT v_is_oauth  -- email signups already provided invite code; oauth users must complete onboarding
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');

  RETURN NEW;
END;
$function$;