
-- Create a security definer function that returns public profile data WITHOUT email
CREATE OR REPLACE FUNCTION public.get_public_profile(lookup_value text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  is_uuid boolean;
BEGIN
  is_uuid := lookup_value ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  
  IF is_uuid THEN
    SELECT json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'username', p.username,
      'bio', p.bio,
      'avatar_url', p.avatar_url,
      'cover_url', p.cover_url,
      'is_public', p.is_public,
      'created_at', p.created_at,
      'social_links', p.social_links
    ) INTO result
    FROM profiles p
    WHERE p.id = lookup_value::uuid;
  ELSE
    SELECT json_build_object(
      'id', p.id,
      'full_name', p.full_name,
      'username', p.username,
      'bio', p.bio,
      'avatar_url', p.avatar_url,
      'cover_url', p.cover_url,
      'is_public', p.is_public,
      'created_at', p.created_at,
      'social_links', p.social_links
    ) INTO result
    FROM profiles p
    WHERE p.username = lookup_value;
  END IF;
  
  RETURN result;
END;
$$;
