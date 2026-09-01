-- Phase 2 ERP: unified client-communication/service-desk records.
CREATE TABLE public.service_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.estate_units(id) ON DELETE SET NULL,
  contact_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'sms', 'email', 'whatsapp', 'phone', 'web')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'triaged', 'assigned', 'waiting_customer', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  subject TEXT NOT NULL,
  summary TEXT,
  related_issue_id UUID REFERENCES public.estate_issues(id) ON DELETE SET NULL,
  related_payment_id UUID REFERENCES public.unit_payments(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.service_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.service_cases(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  body TEXT,
  channel TEXT CHECK (channel IS NULL OR channel IN ('in_app', 'sms', 'email', 'whatsapp', 'phone', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX service_cases_org_status_idx ON public.service_cases(organization_id, status, created_at DESC);
ALTER TABLE public.service_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_case_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organization members manage service cases" ON public.service_cases FOR ALL USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = service_cases.organization_id AND m.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = service_cases.organization_id AND m.user_id = auth.uid()));
CREATE POLICY "Organization members manage service events" ON public.service_case_events FOR ALL USING (EXISTS (SELECT 1 FROM public.service_cases c JOIN public.organization_members m ON m.organization_id = c.organization_id WHERE c.id = service_case_events.case_id AND m.user_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.service_cases c JOIN public.organization_members m ON m.organization_id = c.organization_id WHERE c.id = service_case_events.case_id AND m.user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.service_cases, public.service_case_events TO authenticated;
