CREATE TABLE IF NOT EXISTS public.payment_provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'payangels' CHECK (provider = 'payangels'),
  label TEXT NOT NULL,
  secret_reference TEXT NOT NULL,
  public_key TEXT,
  last_four TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','revoked')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, label)
);
ALTER TABLE public.payment_provider_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance members manage PayAngels connections" ON public.payment_provider_connections FOR ALL USING (
  EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=payment_provider_connections.organization_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager','finance'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=payment_provider_connections.organization_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager','finance'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_provider_connections TO authenticated;