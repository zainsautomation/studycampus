-- Create table for permanent Google Drive connections
CREATE TABLE public.google_drive_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  email TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Add comment
COMMENT ON TABLE public.google_drive_connections IS 'Stores encrypted OAuth tokens for permanent Google Drive connections';

-- Enable RLS
ALTER TABLE public.google_drive_connections ENABLE ROW LEVEL SECURITY;

-- Admins can view their own connection
CREATE POLICY "Admins can view own connection"
  ON public.google_drive_connections
  FOR SELECT
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

-- Admins can insert their own connection
CREATE POLICY "Admins can insert own connection"
  ON public.google_drive_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

-- Admins can update their own connection
CREATE POLICY "Admins can update own connection"
  ON public.google_drive_connections
  FOR UPDATE
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

-- Admins can delete their own connection
CREATE POLICY "Admins can delete own connection"
  ON public.google_drive_connections
  FOR DELETE
  USING (auth.uid() = user_id AND public.has_role(auth.uid(), 'admin'));

-- Create trigger for updated_at
CREATE TRIGGER update_google_drive_connections_updated_at
  BEFORE UPDATE ON public.google_drive_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();