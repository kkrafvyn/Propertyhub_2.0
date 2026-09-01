CREATE TABLE public.estate_ai_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE, estate_id UUID REFERENCES public.managed_estates(id) ON DELETE SET NULL,
  agent_type TEXT NOT NULL CHECK (agent_type IN ('property_management','finance','operations','executive','communications')), risk_level TEXT NOT NULL CHECK (risk_level IN ('low','medium','high')),
  trigger_type TEXT NOT NULL, target_type TEXT, target_id UUID, recommendation TEXT NOT NULL, action_status TEXT NOT NULL DEFAULT 'recommended' CHECK (action_status IN ('recommended','approved','rejected','executed')),
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL, approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), decided_at TIMESTAMPTZ
);
ALTER TABLE public.estate_ai_action_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organization staff view estate AI logs" ON public.estate_ai_action_logs FOR SELECT USING (EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=organization_id AND m.user_id=auth.uid()));
CREATE POLICY "Organization managers manage estate AI logs" ON public.estate_ai_action_logs FOR ALL USING (EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=organization_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager'))) WITH CHECK (EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=organization_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager')));
GRANT SELECT, INSERT, UPDATE ON public.estate_ai_action_logs TO authenticated;
