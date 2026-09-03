-- Phase 3: counsel sign-offs, jurisdiction revenue attribution, expanded tenant signing

CREATE TABLE IF NOT EXISTS public.jurisdiction_lease_counsel_signoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  jurisdiction_id TEXT NOT NULL,
  subdivision_code TEXT,
  counsel_name TEXT NOT NULL,
  counsel_firm TEXT,
  template_version TEXT NOT NULL DEFAULT '2026.09',
  notes TEXT,
  signed_off_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  signed_off_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, jurisdiction_id, subdivision_code)
);

CREATE TABLE IF NOT EXISTS public.revenue_jurisdiction_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  jurisdiction_id TEXT NOT NULL,
  subdivision_code TEXT,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('lease_esign_sent', 'lease_esign_completed', 'lease_esign_voided')
  ),
  amount_minor BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GHS',
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  esignature_request_id UUID REFERENCES public.esignature_requests(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS jurisdiction_counsel_signoffs_org_idx
  ON public.jurisdiction_lease_counsel_signoffs(organization_id, jurisdiction_id);

CREATE INDEX IF NOT EXISTS revenue_jurisdiction_events_org_month_idx
  ON public.revenue_jurisdiction_events(organization_id, jurisdiction_id, created_at DESC);

ALTER TABLE public.jurisdiction_lease_counsel_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_jurisdiction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage counsel signoffs"
  ON public.jurisdiction_lease_counsel_signoffs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = jurisdiction_lease_counsel_signoffs.organization_id
      AND m.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = jurisdiction_lease_counsel_signoffs.organization_id
      AND m.user_id = auth.uid()
  ));

CREATE POLICY "Org members view jurisdiction revenue events"
  ON public.revenue_jurisdiction_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = revenue_jurisdiction_events.organization_id
      AND m.user_id = auth.uid()
  ));

CREATE POLICY "Org members record jurisdiction revenue events"
  ON public.revenue_jurisdiction_events FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = revenue_jurisdiction_events.organization_id
      AND m.user_id = auth.uid()
  ));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jurisdiction_lease_counsel_signoffs TO authenticated;
GRANT SELECT, INSERT ON public.revenue_jurisdiction_events TO authenticated;
