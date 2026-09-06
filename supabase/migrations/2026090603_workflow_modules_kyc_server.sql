-- Approval chains, workspace module catalog, dashboard config support, KYC-enforced bookings

-- ---------------------------------------------------------------------------
-- 1. Organization approval chains
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_approval_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL CHECK (domain IN (
    'maintenance', 'procurement', 'finance', 'lease', 'disbursement', 'listing', 'custom'
  )),
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, domain, name)
);

CREATE INDEX IF NOT EXISTS idx_approval_chains_org_domain
  ON public.organization_approval_chains(organization_id, domain, enabled);

ALTER TABLE public.organization_approval_chains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read approval chains" ON public.organization_approval_chains;
CREATE POLICY "Org members read approval chains"
  ON public.organization_approval_chains FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_approval_chains.organization_id
        AND om.user_id = auth.uid()
    )
    OR public.is_platform_admin()
  );

DROP POLICY IF EXISTS "Org managers manage approval chains" ON public.organization_approval_chains;
CREATE POLICY "Org managers manage approval chains"
  ON public.organization_approval_chains FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_approval_chains.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'manager', 'organization_admin', 'managing_director')
    )
    OR public.is_platform_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = organization_approval_chains.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'manager', 'organization_admin', 'managing_director')
    )
    OR public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 2. Workspace module marketplace catalog
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.workspace_module_catalog (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('core', 'operations', 'commercial', 'finance', 'advanced')),
  description TEXT NOT NULL DEFAULT '',
  capability_slug TEXT,
  integration_slug TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS enabled_workspace_modules TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.workspace_module_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read workspace module catalog" ON public.workspace_module_catalog;
CREATE POLICY "Anyone can read workspace module catalog"
  ON public.workspace_module_catalog FOR SELECT
  USING (is_active = TRUE);

INSERT INTO public.workspace_module_catalog (slug, name, category, description, capability_slug, sort_order)
VALUES
  ('properties', 'Properties', 'core', 'Property and unit portfolio management.', 'management', 10),
  ('users', 'Users & Teams', 'core', 'Team members, roles, and invitations.', NULL, 20),
  ('communications', 'Communications', 'core', 'Inbox, messaging, and client communications.', 'management', 30),
  ('maintenance', 'Maintenance', 'operations', 'Work orders, technicians, and SLAs.', 'facilities', 40),
  ('inspections', 'Inspections', 'operations', 'Field inspections and checklists.', 'facilities', 50),
  ('utilities', 'Utilities & Metering', 'operations', 'Sub-metering and utility billing.', 'facilities', 60),
  ('sales', 'Sales', 'commercial', 'Listings, leads, and deal pipeline.', 'sales', 70),
  ('crm', 'CRM', 'commercial', 'Contacts, tasks, and customer 360.', 'sales', 80),
  ('leasing', 'Leasing', 'commercial', 'Applications, leases, and tenant onboarding.', 'leasing', 90),
  ('accounting', 'Accounting', 'finance', 'GL, journal entries, and financial reports.', 'management', 100),
  ('collections', 'Collections', 'finance', 'Arrears, payment plans, and cases.', 'management', 110),
  ('procurement', 'Procurement', 'finance', 'Vendors, purchase orders, and payables.', 'management', 120),
  ('ai', 'AI & Automation', 'advanced', 'AI briefing, lease analyzer, and automations.', NULL, 130),
  ('analytics', 'Analytics', 'advanced', 'Portfolio analytics and market intelligence.', NULL, 140),
  ('integrations', 'API & Integrations', 'advanced', 'Third-party connectors and webhooks.', NULL, 150)
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. KYC policy helpers + secure booking RPC
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.resolve_listing_jurisdiction(p_listing_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    NULLIF(UPPER(TRIM(p.country)), ''),
    'GLOBAL'
  )
  FROM public.listings l
  JOIN public.properties p ON p.id = l.property_id
  WHERE l.id = p_listing_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.normalize_jurisdiction_id(p_raw TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v TEXT := UPPER(TRIM(COALESCE(p_raw, '')));
BEGIN
  IF v IN ('GH', 'GHA', 'GHANA') THEN RETURN 'GH'; END IF;
  IF v IN ('NG', 'NGA', 'NIGERIA') THEN RETURN 'NG'; END IF;
  IF v IN ('KE', 'KEN', 'KENYA') THEN RETURN 'KE'; END IF;
  IF v IN ('ZA', 'ZAF', 'SOUTH AFRICA') THEN RETURN 'ZA'; END IF;
  IF v IN ('US', 'USA', 'UNITED STATES') THEN RETURN 'US'; END IF;
  IF v IN ('GB', 'UK', 'UNITED KINGDOM') THEN RETURN 'GB'; END IF;
  IF v IN ('EU', 'EUROPE') THEN RETURN 'EU'; END IF;
  IF v IN ('AE', 'UAE') THEN RETURN 'AE'; END IF;
  IF v IN ('CA', 'CANADA') THEN RETURN 'CA'; END IF;
  IF v IN ('AU', 'AUSTRALIA') THEN RETURN 'AU'; END IF;
  IF v IN ('IN', 'INDIA') THEN RETURN 'IN'; END IF;
  IF LENGTH(v) = 2 THEN RETURN v; END IF;
  RETURN 'GLOBAL';
END;
$$;

CREATE OR REPLACE FUNCTION public.consumer_kyc_required_for_listing(p_listing_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT pkp.consumer_booking_required
      FROM public.platform_kyc_policies pkp
      WHERE pkp.jurisdiction_id = public.normalize_jurisdiction_id(public.resolve_listing_jurisdiction(p_listing_id))
        AND pkp.enabled = TRUE
    ),
    TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.workspace_kyc_required_for_jurisdiction(p_jurisdiction_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT pkp.workspace_enrollment_required
      FROM public.platform_kyc_policies pkp
      WHERE pkp.jurisdiction_id = public.normalize_jurisdiction_id(p_jurisdiction_id)
        AND pkp.enabled = TRUE
    ),
    TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.create_short_stay_booking(
  p_listing_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_guest_note TEXT DEFAULT NULL,
  p_booking_mode TEXT DEFAULT 'instant',
  p_currency TEXT DEFAULT 'GHS'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest UUID := auth.uid();
  v_listing public.listings%ROWTYPE;
  v_nights INT;
  v_total_minor INT;
  v_booking_id UUID;
BEGIN
  IF v_guest IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_out <= p_check_in THEN
    RAISE EXCEPTION 'Invalid check-in or check-out dates';
  END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF public.consumer_kyc_required_for_listing(p_listing_id)
     AND NOT public.is_user_kyc_verified(v_guest) THEN
    RAISE EXCEPTION 'Identity verification (KYC) is required to book in this market';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.short_stay_bookings b
    WHERE b.listing_id = p_listing_id
      AND b.status IN ('pending', 'confirmed')
      AND b.check_in < p_check_out
      AND b.check_out > p_check_in
  ) THEN
    RAISE EXCEPTION 'Those dates overlap with an existing booking';
  END IF;

  v_nights := GREATEST(1, (p_check_out - p_check_in));
  v_total_minor := COALESCE(v_listing.price, 0) * v_nights;

  INSERT INTO public.short_stay_bookings (
    listing_id,
    organization_id,
    guest_user_id,
    check_in,
    check_out,
    nights,
    total_minor,
    currency,
    status,
    guest_note,
    booking_mode
  )
  VALUES (
    p_listing_id,
    v_listing.organization_id,
    v_guest,
    p_check_in,
    p_check_out,
    v_nights,
    v_total_minor,
    COALESCE(NULLIF(TRIM(p_currency), ''), v_listing.currency, 'GHS'),
    'pending',
    p_guest_note,
    COALESCE(NULLIF(TRIM(p_booking_mode), ''), 'instant')
  )
  RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_short_stay_booking(UUID, DATE, DATE, TEXT, TEXT, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Guests can create bookings" ON public.short_stay_bookings;
CREATE POLICY "Guests cannot direct insert bookings"
  ON public.short_stay_bookings FOR INSERT
  WITH CHECK (false);
