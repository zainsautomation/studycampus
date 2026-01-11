-- Add downloads_enabled setting to app_settings if not exists
INSERT INTO public.app_settings (key, value)
VALUES ('downloads_enabled', 'true'::jsonb)
ON CONFLICT (key) DO NOTHING;