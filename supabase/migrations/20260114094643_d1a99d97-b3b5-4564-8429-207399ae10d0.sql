-- Add storage_type column to notes table
ALTER TABLE public.notes 
ADD COLUMN storage_type text DEFAULT 'supabase' CHECK (storage_type IN ('supabase', 'google_drive'));

-- Add Google Drive folder ID column for notes stored in Google Drive
ALTER TABLE public.notes 
ADD COLUMN google_drive_folder_id text;

-- Add Google Drive settings to app_settings
INSERT INTO public.app_settings (key, value) 
VALUES 
  ('default_storage_type', '"supabase"'),
  ('google_drive_default_folder_id', 'null'),
  ('google_drive_default_folder_name', 'null'),
  ('google_drive_auto_organize_by_subject', 'true')
ON CONFLICT (key) DO NOTHING;