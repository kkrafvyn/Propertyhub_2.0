-- Phase A-D deepening: workflows, wallet hub, host settings, resident home, notifications grouping

ALTER TABLE public.maintenance_requests
ADD COLUMN IF NOT EXISTS vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL;

ALTER TABLE public.organization_documents
ADD COLUMN IF NOT EXISTS document_folder TEXT;

ALTER TABLE public.notification_logs
ADD COLUMN IF NOT EXISTS notification_category TEXT;

CREATE TABLE IF NOT EXISTS public.saved_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  method_type TEXT NOT NULL DEFAULT 'mobile_money' CHECK (
    method_type IN ('mobile_money', 'card', 'bank_transfer')
  ),
  last_four TEXT,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.host_listing_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  house_rules TEXT,
  check_in_instructions TEXT,
  cleaning_notes TEXT,
  min_nights INTEGER NOT NULL DEFAULT 1 CHECK (min_nights >= 1),
  max_guests INTEGER NOT NULL DEFAULT 4 CHECK (max_guests >= 1),
  base_nightly_minor BIGINT CHECK (base_nightly_minor IS NULL OR base_nightly_minor >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.resident_home_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL UNIQUE REFERENCES public.leases(id) ON DELETE CASCADE,
  tenant_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  door_access_code TEXT,
  visitor_pass_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  energy_kwh NUMERIC(10, 2) NOT NULL DEFAULT 0,
  water_m3 NUMERIC(10, 2) NOT NULL DEFAULT 0,
  device_count INTEGER NOT NULL DEFAULT 0,
  announcements JSONB NOT NULL DEFAULT '[]'::jsonb,
  emergency_contact TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.mortgage_insurance_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  inquiry_type TEXT NOT NULL CHECK (inquiry_type IN ('mortgage', 'insurance')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'reviewing', 'quoted', 'closed', 'cancelled')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_payment_methods_user ON public.saved_payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_host_listing_settings_org ON public.host_listing_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_resident_home_tenant ON public.resident_home_profiles(tenant_user_id);
CREATE INDEX IF NOT EXISTS idx_mortgage_insurance_user ON public.mortgage_insurance_inquiries(user_id, inquiry_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_category ON public.notification_logs(user_id, notification_category, created_at DESC);

ALTER TABLE public.saved_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.host_listing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_home_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mortgage_insurance_inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their saved payment methods" ON public.saved_payment_methods;
CREATE POLICY "Users manage their saved payment methods"
ON public.saved_payment_methods FOR ALL
USING (auth.uid() = user_id OR public.is_platform_admin())
WITH CHECK (auth.uid() = user_id OR public.is_platform_admin());

DROP POLICY IF EXISTS "Org members manage host settings" ON public.host_listing_settings;
CREATE POLICY "Org members manage host settings"
ON public.host_listing_settings FOR ALL
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = host_listing_settings.organization_id
    AND om.user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = host_listing_settings.organization_id
    AND om.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tenants view resident home profile" ON public.resident_home_profiles;
CREATE POLICY "Tenants view resident home profile"
ON public.resident_home_profiles FOR SELECT
USING (auth.uid() = tenant_user_id OR public.is_platform_admin());

DROP POLICY IF EXISTS "Org managers manage resident home profile" ON public.resident_home_profiles;
CREATE POLICY "Org managers manage resident home profile"
ON public.resident_home_profiles FOR ALL
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.leases lease
    JOIN public.organization_members om ON om.organization_id = lease.organization_id
    WHERE lease.id = resident_home_profiles.lease_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.leases lease
    JOIN public.organization_members om ON om.organization_id = lease.organization_id
    WHERE lease.id = resident_home_profiles.lease_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Users manage their mortgage insurance inquiries" ON public.mortgage_insurance_inquiries;
CREATE POLICY "Users manage their mortgage insurance inquiries"
ON public.mortgage_insurance_inquiries FOR ALL
USING (auth.uid() = user_id OR public.is_platform_admin())
WITH CHECK (auth.uid() = user_id OR public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.ensure_resident_home_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'active' THEN
    INSERT INTO public.resident_home_profiles (lease_id, tenant_user_id)
    VALUES (NEW.id, NEW.tenant_user_id)
    ON CONFLICT (lease_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_resident_home_profile_on_lease ON public.leases;
CREATE TRIGGER ensure_resident_home_profile_on_lease
AFTER INSERT OR UPDATE OF status ON public.leases
FOR EACH ROW
EXECUTE FUNCTION public.ensure_resident_home_profile();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_payment_methods TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.host_listing_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resident_home_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mortgage_insurance_inquiries TO authenticated;
