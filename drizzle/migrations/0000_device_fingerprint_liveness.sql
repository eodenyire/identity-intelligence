ALTER TABLE public.verification_sessions ADD COLUMN IF NOT EXISTS device_fingerprint text;
ALTER TABLE public.verification_sessions ADD COLUMN IF NOT EXISTS liveness_challenge jsonb;
CREATE INDEX IF NOT EXISTS idx_sessions_device_fp ON public.verification_sessions(device_fingerprint);