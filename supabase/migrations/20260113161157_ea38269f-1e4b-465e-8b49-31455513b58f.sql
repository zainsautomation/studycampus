-- Part 2: Per-note download control
ALTER TABLE public.notes 
ADD COLUMN is_downloadable boolean DEFAULT true;

-- Part 3: Enhanced profiles with username and bio
ALTER TABLE public.profiles 
ADD COLUMN username text UNIQUE,
ADD COLUMN bio text;

-- Create index for faster username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);