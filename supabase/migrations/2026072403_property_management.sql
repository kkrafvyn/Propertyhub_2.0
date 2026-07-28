-- Property management: maintenance photos/ratings, tenant notices

ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS photo_urls TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tenant_rating INTEGER CHECK (tenant_rating IS NULL OR tenant_rating BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS tenant_rating_comment TEXT,
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.tenant_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notice_type TEXT NOT NULL DEFAULT 'general' CHECK (
    notice_type IN ('general', 'rent_increase', 'lease_renewal', 'termination', 'inspection', 'maintenance')
  ),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('draft', 'sent', 'acknowledged')),
  acknowledged_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_notices_tenant
  ON public.tenant_notices(tenant_user_id, created_at DESC);

ALTER TABLE public.tenant_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenants view own notices" ON public.tenant_notices;
CREATE POLICY "Tenants view own notices" ON public.tenant_notices FOR SELECT
USING (tenant_user_id = auth.uid());

DROP POLICY IF EXISTS "Org members manage notices" ON public.tenant_notices;
CREATE POLICY "Org members manage notices" ON public.tenant_notices FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = tenant_notices.organization_id
      AND om.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = tenant_notices.organization_id
      AND om.user_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE ON public.tenant_notices TO authenticated;
