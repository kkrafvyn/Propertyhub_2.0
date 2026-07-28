-- Purge demo marketplace data and add owner-controlled smart property access.

-- Demo cleanup (idempotent)
DELETE FROM public.property_media WHERE storage_path LIKE 'demo/%';

DELETE FROM public.listing_verification_checks
WHERE evidence ->> 'source' = 'ghana_seed_backfill';

DELETE FROM public.listings
WHERE organization_id IN (
  SELECT id FROM public.organizations
  WHERE slug IN ('accra-prime-homes', 'coastal-realty-gh')
);

DELETE FROM public.properties
WHERE organization_id IN (
  SELECT id FROM public.organizations
  WHERE slug IN ('accra-prime-homes', 'coastal-realty-gh')
);

DELETE FROM public.organization_members
WHERE organization_id IN (
  SELECT id FROM public.organizations
  WHERE slug IN ('accra-prime-homes', 'coastal-realty-gh')
);

DELETE FROM public.organizations
WHERE slug IN ('accra-prime-homes', 'coastal-realty-gh');

DELETE FROM public.ghana_market_locations;

UPDATE public.listings
SET
  quality_breakdown = quality_breakdown - 'seededGhanaTrustBaseline',
  last_quality_checked_at = CASE
    WHEN quality_breakdown ? 'seededGhanaTrustBaseline' THEN NULL
    ELSE last_quality_checked_at
  END
WHERE quality_breakdown ? 'seededGhanaTrustBaseline';

UPDATE public.properties
SET
  ghana_post_gps = NULL,
  address_verified = FALSE,
  address_verified_at = NULL,
  location_confidence = 0,
  flood_risk_level = 'unknown'
WHERE country = 'Ghana'
  AND (
    address ILIKE '%East Legon%'
    OR address ILIKE '%Cantonments%'
    OR address ILIKE '%Labone%'
    OR address ILIKE '%Airport Residential%'
  )
  AND ghana_post_gps IN ('GA-456-2198', 'GA-052-3914', 'GA-034-9012', 'GA-153-7740', 'GA-123-4567');

DELETE FROM public.users WHERE email = 'demo@baytmiftah.app';

DO $$
BEGIN
  DELETE FROM auth.users WHERE email = 'demo@baytmiftah.app';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping auth.users demo cleanup — requires service role.';
END $$;

-- Owner must explicitly grant smart property access to tenants.
ALTER TABLE public.resident_home_profiles
  ADD COLUMN IF NOT EXISTS smart_access_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS smart_access_granted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS smart_access_granted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS smart_access_revoked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_resident_home_smart_access
  ON public.resident_home_profiles(lease_id, smart_access_enabled);

-- RLS: organization members manage devices; tenants only see granted devices.
DROP POLICY IF EXISTS "Org members manage smart devices" ON public.smart_devices;
CREATE POLICY "Org members manage smart devices"
ON public.smart_devices FOR ALL
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = smart_devices.organization_id
      AND om.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.listings lst
    JOIN public.organization_members om ON om.organization_id = lst.organization_id
    WHERE lst.id = smart_devices.listing_id
      AND om.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.leases l
    JOIN public.organization_members om ON om.organization_id = l.organization_id
    WHERE l.id = smart_devices.lease_id
      AND om.user_id = auth.uid()
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = smart_devices.organization_id
      AND om.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.listings lst
    JOIN public.organization_members om ON om.organization_id = lst.organization_id
    WHERE lst.id = smart_devices.listing_id
      AND om.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.leases l
    JOIN public.organization_members om ON om.organization_id = l.organization_id
    WHERE l.id = smart_devices.lease_id
      AND om.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tenants view granted smart devices" ON public.smart_devices;
CREATE POLICY "Tenants view granted smart devices"
ON public.smart_devices FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.leases l
    JOIN public.resident_home_profiles rhp ON rhp.lease_id = l.id
    WHERE l.tenant_user_id = auth.uid()
      AND l.status = 'active'
      AND rhp.smart_access_enabled = TRUE
      AND (
        smart_devices.lease_id = l.id
        OR (
          smart_devices.listing_id IS NOT NULL
          AND smart_devices.listing_id = l.listing_id
        )
      )
  )
);

DROP POLICY IF EXISTS "Org members view smart device events" ON public.smart_device_events;
CREATE POLICY "Org members view smart device events"
ON public.smart_device_events FOR SELECT
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM public.smart_devices sd
  JOIN public.organization_members om ON om.organization_id = sd.organization_id
    WHERE sd.id = smart_device_events.device_id
      AND om.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.smart_devices sd
    JOIN public.listings lst ON lst.id = sd.listing_id
    JOIN public.organization_members om ON om.organization_id = lst.organization_id
    WHERE sd.id = smart_device_events.device_id
      AND om.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tenants view granted smart device events" ON public.smart_device_events;
CREATE POLICY "Tenants view granted smart device events"
ON public.smart_device_events FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.smart_devices sd
    JOIN public.leases l ON l.status = 'active' AND l.tenant_user_id = auth.uid()
    JOIN public.resident_home_profiles rhp ON rhp.lease_id = l.id
    WHERE sd.id = smart_device_events.device_id
      AND rhp.smart_access_enabled = TRUE
      AND (sd.lease_id = l.id OR sd.listing_id = l.listing_id)
  )
);

DROP POLICY IF EXISTS "Org members insert smart device events" ON public.smart_device_events;
CREATE POLICY "Org members insert smart device events"
ON public.smart_device_events FOR INSERT
WITH CHECK (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM public.smart_devices sd
    JOIN public.organization_members om ON om.organization_id = sd.organization_id
    WHERE sd.id = smart_device_events.device_id
      AND om.user_id = auth.uid()
  )
);

GRANT INSERT ON public.smart_device_events TO authenticated;
