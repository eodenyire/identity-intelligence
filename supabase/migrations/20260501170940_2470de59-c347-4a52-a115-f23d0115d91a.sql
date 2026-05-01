-- Enums
CREATE TYPE public.verification_status AS ENUM ('pending', 'in_progress', 'verified', 'flagged', 'rejected', 'expired');
CREATE TYPE public.document_type AS ENUM ('id_front', 'id_back', 'selfie', 'liveness');
CREATE TYPE public.id_document_type AS ENUM ('passport', 'national_id', 'drivers_license', 'voter_id');

-- verification_sessions
CREATE TABLE public.verification_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  public_token TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  country TEXT,
  id_type public.id_document_type NOT NULL DEFAULT 'national_id',
  status public.verification_status NOT NULL DEFAULT 'pending',
  trust_score INTEGER,
  ai_analysis JSONB,
  reviewer_notes TEXT,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sessions_user ON public.verification_sessions(user_id);
CREATE INDEX idx_sessions_token ON public.verification_sessions(public_token);
CREATE INDEX idx_sessions_status ON public.verification_sessions(status);

ALTER TABLE public.verification_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators view own sessions" ON public.verification_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Operators create sessions" ON public.verification_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Operators update own sessions" ON public.verification_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Operators delete own sessions" ON public.verification_sessions
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER tg_sessions_updated BEFORE UPDATE ON public.verification_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- verification_documents
CREATE TABLE public.verification_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
  doc_type public.document_type NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  ocr_data JSONB,
  face_match_score NUMERIC,
  liveness_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_docs_session ON public.verification_documents(session_id);

ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators view docs of own sessions" ON public.verification_documents
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.verification_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));
CREATE POLICY "Operators delete docs of own sessions" ON public.verification_documents
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM public.verification_sessions s
    WHERE s.id = session_id AND s.user_id = auth.uid()
  ));

-- webhook_endpoints
CREATE TABLE public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  signing_secret TEXT NOT NULL,
  enabled_events TEXT[] NOT NULL DEFAULT ARRAY['verification.completed','verification.flagged','verification.rejected'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhooks_user ON public.webhook_endpoints(user_id);

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators view own webhooks" ON public.webhook_endpoints
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Operators create webhooks" ON public.webhook_endpoints
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Operators update own webhooks" ON public.webhook_endpoints
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Operators delete own webhooks" ON public.webhook_endpoints
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER tg_webhooks_updated BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- webhook_deliveries
CREATE TABLE public.webhook_deliveries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.verification_sessions(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_webhook ON public.webhook_deliveries(webhook_id);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators view own deliveries" ON public.webhook_deliveries
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.webhook_endpoints w
    WHERE w.id = webhook_id AND w.user_id = auth.uid()
  ));

-- Public-token RPC for customer flow (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.get_session_by_token(_token TEXT)
RETURNS TABLE (
  id UUID,
  customer_name TEXT,
  id_type public.id_document_type,
  country TEXT,
  status public.verification_status,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, customer_name, id_type, country, status, expires_at
  FROM public.verification_sessions
  WHERE public_token = _token AND expires_at > now()
  LIMIT 1;
$$;

-- Storage bucket for verification documents (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('verifications', 'verifications', false);

CREATE POLICY "Operators read own verification files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'verifications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Operators upload to own folder" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'verifications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
CREATE POLICY "Operators delete own verification files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'verifications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );