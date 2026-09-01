-- Store only a provider reference and non-sensitive metadata. The actual
-- PayAngels secret remains in Supabase Edge Function secrets.
CREATE TABLE IF NOT EXISTS public.payment_provider_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider = 'payangels'),
  label TEXT NOT NULL,
  secret_name TEXT NOT NULL,
  public_key_last4 TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider, label)
);
ALTER TABLE public.payment_provider_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance members view provider credential metadata" ON public.payment_provider_credentials FOR SELECT USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=payment_provider_credentials.organization_id AND m.user_id=auth.uid()));
CREATE POLICY "Managers manage provider credential metadata" ON public.payment_provider_credentials FOR ALL USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=payment_provider_credentials.organization_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager'))) WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id=payment_provider_credentials.organization_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager')));
GRANT SELECT, INSERT, UPDATE ON public.payment_provider_credentials TO authenticated;