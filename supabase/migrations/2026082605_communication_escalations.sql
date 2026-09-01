CREATE TABLE IF NOT EXISTS public.communication_escalation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'high' CHECK (priority IN ('high','urgent')),
  delay_minutes INTEGER NOT NULL CHECK (delay_minutes > 0),
  channels TEXT[] NOT NULL CHECK (channels <@ ARRAY['in_app','push','sms','whatsapp']::TEXT[]),
  escalation_user_ids UUID[] NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.communication_delivery_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  recipient_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app','push','sms','whatsapp')),
  attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
  status TEXT NOT NULL CHECK (status IN ('queued','sent','delivered','failed','escalated')),
  provider_reference TEXT,
  error_message TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS communication_escalation_policy_org_idx ON public.communication_escalation_policies(organization_id, active);
CREATE INDEX IF NOT EXISTS communication_delivery_attempt_org_idx ON public.communication_delivery_attempts(organization_id, attempted_at DESC);
ALTER TABLE public.communication_escalation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_delivery_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organization members manage escalation policies" ON public.communication_escalation_policies FOR ALL USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=organization_id AND m.user_id=auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=organization_id AND m.user_id=auth.uid()));
CREATE POLICY "Organization members view delivery attempts" ON public.communication_delivery_attempts FOR SELECT USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=communication_delivery_attempts.organization_id AND m.user_id=auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communication_escalation_policies TO authenticated;
GRANT SELECT ON public.communication_delivery_attempts TO authenticated;