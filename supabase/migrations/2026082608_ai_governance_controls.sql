CREATE TABLE IF NOT EXISTS public.ai_agent_controls (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  daily_action_budget INTEGER NOT NULL DEFAULT 100 CHECK (daily_action_budget >= 0),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, agent_name)
);
ALTER TABLE public.ai_agent_controls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organization members view AI controls" ON public.ai_agent_controls FOR SELECT USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=ai_agent_controls.organization_id AND m.user_id=auth.uid()));
CREATE POLICY "Managers update AI controls" ON public.ai_agent_controls FOR ALL USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=ai_agent_controls.organization_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager'))) WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=ai_agent_controls.organization_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager')));
GRANT SELECT, INSERT, UPDATE ON public.ai_agent_controls TO authenticated;