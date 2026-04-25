ALTER TABLE public.ai_api_keys
ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'lovable';

ALTER TABLE public.ai_api_keys
DROP CONSTRAINT IF EXISTS ai_api_keys_provider_check;

ALTER TABLE public.ai_api_keys
ADD CONSTRAINT ai_api_keys_provider_check
CHECK (provider IN ('lovable', 'gemini'));