CREATE TABLE IF NOT EXISTS public.esignature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.organization_documents(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  provider_request_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','viewed','partially_signed','completed','declined','expired','failed')),
  signers JSONB NOT NULL DEFAULT '[]'::JSONB,
  signing_url TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_request_id)
);
CREATE INDEX IF NOT EXISTS esignature_requests_org_status_idx ON public.esignature_requests(organization_id, status, created_at DESC);
ALTER TABLE public.esignature_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organization members access esignature requests" ON public.esignature_requests FOR ALL USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=esignature_requests.organization_id AND m.user_id=auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=esignature_requests.organization_id AND m.user_id=auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.esignature_requests TO authenticated;