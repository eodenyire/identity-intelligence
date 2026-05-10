
-- compliance_screenings
CREATE TABLE public.compliance_screenings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'opensanctions',
  query_name TEXT NOT NULL,
  query_country TEXT,
  total_hits INTEGER NOT NULL DEFAULT 0,
  sanctions_hits INTEGER NOT NULL DEFAULT 0,
  pep_hits INTEGER NOT NULL DEFAULT 0,
  adverse_media_hits INTEGER NOT NULL DEFAULT 0,
  risk_level TEXT NOT NULL DEFAULT 'low',
  top_match_score NUMERIC,
  raw_response JSONB,
  hits JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.compliance_screenings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators view own screenings" ON public.compliance_screenings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Operators delete own screenings" ON public.compliance_screenings
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_compliance_session ON public.compliance_screenings(session_id);

-- audit_log
CREATE TABLE public.audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators view own audit log" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_audit_user ON public.audit_log(user_id, created_at DESC);

-- identity_credentials (reusable wallet credentials)
CREATE TABLE public.identity_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  credential_id TEXT NOT NULL UNIQUE,
  session_id UUID NOT NULL REFERENCES public.verification_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  subject_name TEXT NOT NULL,
  subject_country TEXT,
  trust_score INTEGER,
  jwt TEXT NOT NULL,
  claims JSONB NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '365 days'),
  revoked_at TIMESTAMPTZ
);

ALTER TABLE public.identity_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operators view own credentials" ON public.identity_credentials
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Operators update own credentials" ON public.identity_credentials
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Operators delete own credentials" ON public.identity_credentials
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_credential_session ON public.identity_credentials(session_id);
CREATE INDEX idx_credential_lookup ON public.identity_credentials(credential_id);
