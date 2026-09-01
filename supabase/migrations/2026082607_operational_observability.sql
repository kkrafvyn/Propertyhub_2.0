CREATE TABLE IF NOT EXISTS public.operational_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  service TEXT NOT NULL,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('debug','info','warning','error','critical')),
  status TEXT NOT NULL DEFAULT 'recorded' CHECK (status IN ('recorded','acknowledged','resolved')),
  correlation_id TEXT,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS operational_events_service_idx ON public.operational_events(service, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS operational_events_org_idx ON public.operational_events(organization_id, created_at DESC);
ALTER TABLE public.operational_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organization members view operational events" ON public.operational_events FOR SELECT USING (organization_id IS NULL OR EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=operational_events.organization_id AND m.user_id=auth.uid()));
CREATE POLICY "Authenticated services record operational events" ON public.operational_events FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
GRANT SELECT, INSERT, UPDATE ON public.operational_events TO authenticated;