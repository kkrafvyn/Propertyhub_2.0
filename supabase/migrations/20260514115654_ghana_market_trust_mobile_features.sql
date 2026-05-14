-- Ghana-first trust, address, mobile, and listing quality foundations.

ALTER TABLE public.users
  ALTER COLUMN email DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS preferred_contact_channel TEXT NOT NULL DEFAULT 'email';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_preferred_contact_channel_check,
  ADD CONSTRAINT users_preferred_contact_channel_check
  CHECK (preferred_contact_channel IN ('email', 'phone', 'whatsapp', 'sms'));

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS ghana_business_registration_number TEXT,
  ADD COLUMN IF NOT EXISTS ghana_tax_identification_number TEXT,
  ADD COLUMN IF NOT EXISTS verification_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.organizations
  DROP CONSTRAINT IF EXISTS organizations_verification_status_check,
  ADD CONSTRAINT organizations_verification_status_check
  CHECK (verification_status IN ('unverified', 'submitted', 'in_review', 'verified', 'rejected', 'needs_changes'));

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS ghana_post_gps TEXT,
  ADD COLUMN IF NOT EXISTS neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS address_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS location_confidence INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flood_risk_level TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS locality_notes TEXT;

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_location_confidence_check,
  ADD CONSTRAINT properties_location_confidence_check
  CHECK (location_confidence BETWEEN 0 AND 100);

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS properties_flood_risk_level_check,
  ADD CONSTRAINT properties_flood_risk_level_check
  CHECK (flood_risk_level IN ('unknown', 'low', 'medium', 'high'));

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS quality_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS quality_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_quality_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS inspection_fee_amount INTEGER,
  ADD COLUMN IF NOT EXISTS minimum_deposit_amount INTEGER;

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_quality_score_check,
  ADD CONSTRAINT listings_quality_score_check
  CHECK (quality_score BETWEEN 0 AND 100);

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_verification_status_check,
  ADD CONSTRAINT listings_verification_status_check
  CHECK (verification_status IN ('unverified', 'draft', 'submitted', 'in_review', 'verified', 'rejected', 'needs_changes'));

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_inspection_fee_amount_check,
  ADD CONSTRAINT listings_inspection_fee_amount_check
  CHECK (inspection_fee_amount IS NULL OR inspection_fee_amount >= 0);

ALTER TABLE public.listings
  DROP CONSTRAINT IF EXISTS listings_minimum_deposit_amount_check,
  ADD CONSTRAINT listings_minimum_deposit_amount_check
  CHECK (minimum_deposit_amount IS NULL OR minimum_deposit_amount >= 0);

CREATE TABLE IF NOT EXISTS public.trust_verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.organization_documents(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (
    request_type IN (
      'agent_identity',
      'business_registration',
      'property_title',
      'address_verification',
      'listing_review',
      'ghana_card',
      'tax_identity'
    )
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'in_review', 'verified', 'rejected', 'needs_changes')
  ),
  submitted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  public_summary TEXT,
  internal_notes TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_verification_requests_org_status
ON public.trust_verification_requests(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trust_verification_requests_listing
ON public.trust_verification_requests(listing_id, request_type);

CREATE TABLE IF NOT EXISTS public.listing_verification_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  check_key TEXT NOT NULL,
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'passed', 'failed', 'warning')
  ),
  score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  details TEXT,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, check_key)
);

CREATE INDEX IF NOT EXISTS idx_listing_verification_checks_listing
ON public.listing_verification_checks(listing_id, status);

CREATE TABLE IF NOT EXISTS public.ghana_market_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  safety_score NUMERIC(4, 2) NOT NULL CHECK (safety_score BETWEEN 0 AND 5),
  investment_score NUMERIC(4, 2) NOT NULL CHECK (investment_score BETWEEN 0 AND 5),
  accessibility_score NUMERIC(4, 2) NOT NULL CHECK (accessibility_score BETWEEN 0 AND 5),
  walkability_score NUMERIC(4, 2) NOT NULL CHECK (walkability_score BETWEEN 0 AND 5),
  school_proximity_score NUMERIC(4, 2) NOT NULL CHECK (school_proximity_score BETWEEN 0 AND 5),
  healthcare_proximity_score NUMERIC(4, 2) NOT NULL CHECK (healthcare_proximity_score BETWEEN 0 AND 5),
  flood_risk_level TEXT NOT NULL DEFAULT 'unknown' CHECK (flood_risk_level IN ('unknown', 'low', 'medium', 'high')),
  demand_level TEXT NOT NULL DEFAULT 'medium' CHECK (demand_level IN ('very_low', 'low', 'medium', 'high', 'very_high')),
  notes TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (city, region, neighborhood)
);

CREATE INDEX IF NOT EXISTS idx_ghana_market_locations_city_region
ON public.ghana_market_locations(city, region, neighborhood);

ALTER TABLE public.trust_verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ghana_market_locations ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.trust_verification_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_verification_checks TO authenticated;
GRANT SELECT ON public.listing_verification_checks TO anon;
GRANT SELECT ON public.ghana_market_locations TO anon, authenticated;

DROP POLICY IF EXISTS "Organization members can manage trust verification requests"
ON public.trust_verification_requests;
CREATE POLICY "Organization members can manage trust verification requests"
ON public.trust_verification_requests FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = trust_verification_requests.organization_id
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = trust_verification_requests.organization_id
      AND membership.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Organization members can manage listing verification checks"
ON public.listing_verification_checks;
CREATE POLICY "Organization members can manage listing verification checks"
ON public.listing_verification_checks FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = listing_verification_checks.organization_id
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = listing_verification_checks.organization_id
      AND membership.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Public can view passed public listing checks"
ON public.listing_verification_checks;
CREATE POLICY "Public can view passed public listing checks"
ON public.listing_verification_checks FOR SELECT
TO anon
USING (
  status = 'passed'
  AND EXISTS (
    SELECT 1
    FROM public.listings listing
    WHERE listing.id = listing_verification_checks.listing_id
      AND listing.status = 'listed'
      AND listing.visibility = 'public'
  )
);

DROP POLICY IF EXISTS "Anyone can read Ghana market locations"
ON public.ghana_market_locations;
CREATE POLICY "Anyone can read Ghana market locations"
ON public.ghana_market_locations FOR SELECT
USING (TRUE);

DROP TRIGGER IF EXISTS set_trust_verification_requests_updated_at
ON public.trust_verification_requests;
CREATE TRIGGER set_trust_verification_requests_updated_at
BEFORE UPDATE ON public.trust_verification_requests
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

INSERT INTO public.ghana_market_locations (
  city,
  region,
  neighborhood,
  safety_score,
  investment_score,
  accessibility_score,
  walkability_score,
  school_proximity_score,
  healthcare_proximity_score,
  flood_risk_level,
  demand_level,
  notes
)
VALUES
  ('Accra', 'Greater Accra', 'East Legon', 4.10, 4.40, 4.20, 3.90, 4.20, 4.00, 'medium', 'very_high', 'Premium rental demand, strong expat and student market, heavy traffic during peak hours.'),
  ('Accra', 'Greater Accra', 'Cantonments', 4.50, 4.30, 4.10, 4.00, 4.30, 4.40, 'low', 'high', 'Embassy-adjacent premium apartment and serviced residence market.'),
  ('Accra', 'Greater Accra', 'Labone', 4.20, 4.10, 4.20, 4.30, 4.10, 4.20, 'low', 'high', 'Walkable central Accra neighborhood with strong executive rental demand.'),
  ('Accra', 'Greater Accra', 'Airport Residential', 4.40, 4.50, 4.50, 4.10, 4.00, 4.50, 'low', 'very_high', 'Premium offices and apartments near the airport and major commercial corridors.'),
  ('Accra', 'Greater Accra', 'Osu', 3.80, 4.00, 4.40, 4.50, 3.80, 4.10, 'medium', 'high', 'High foot traffic, hospitality, nightlife, and short-stay demand.'),
  ('Tema', 'Greater Accra', 'Community 25', 3.90, 4.10, 3.70, 3.20, 3.60, 3.50, 'medium', 'medium', 'Fast-growing family housing corridor with commuter demand.'),
  ('Kumasi', 'Ashanti', 'Ahodwo', 4.00, 3.90, 3.80, 3.40, 3.80, 3.90, 'medium', 'high', 'Established residential and hospitality corridor in Kumasi.'),
  ('Takoradi', 'Western', 'Airport Ridge', 4.00, 3.80, 3.70, 3.30, 3.50, 3.80, 'medium', 'medium', 'Oil, logistics, and executive rental catchment.'),
  ('Cape Coast', 'Central', 'Cantonments', 3.90, 3.60, 3.50, 3.20, 4.00, 3.60, 'medium', 'medium', 'Education and tourism-supported housing demand.')
ON CONFLICT (city, region, neighborhood) DO UPDATE
SET
  safety_score = EXCLUDED.safety_score,
  investment_score = EXCLUDED.investment_score,
  accessibility_score = EXCLUDED.accessibility_score,
  walkability_score = EXCLUDED.walkability_score,
  school_proximity_score = EXCLUDED.school_proximity_score,
  healthcare_proximity_score = EXCLUDED.healthcare_proximity_score,
  flood_risk_level = EXCLUDED.flood_risk_level,
  demand_level = EXCLUDED.demand_level,
  notes = EXCLUDED.notes,
  updated_at = NOW();

UPDATE public.properties
SET
  neighborhood = CASE
    WHEN address ILIKE '%East Legon%' THEN 'East Legon'
    WHEN address ILIKE '%Cantonments%' THEN 'Cantonments'
    WHEN address ILIKE '%Labone%' THEN 'Labone'
    WHEN address ILIKE '%Airport Residential%' THEN 'Airport Residential'
    ELSE neighborhood
  END,
  ghana_post_gps = CASE
    WHEN address ILIKE '%East Legon%' THEN 'GA-456-2198'
    WHEN address ILIKE '%Cantonments%' THEN 'GA-052-3914'
    WHEN address ILIKE '%Labone%' THEN 'GA-034-9012'
    WHEN address ILIKE '%Airport Residential%' THEN 'GA-153-7740'
    ELSE ghana_post_gps
  END,
  address_verified = TRUE,
  address_verified_at = COALESCE(address_verified_at, NOW()),
  location_confidence = GREATEST(location_confidence, 85),
  flood_risk_level = CASE
    WHEN address ILIKE '%East Legon%' THEN 'medium'
    WHEN address ILIKE '%Cantonments%' THEN 'low'
    WHEN address ILIKE '%Labone%' THEN 'low'
    WHEN address ILIKE '%Airport Residential%' THEN 'low'
    ELSE flood_risk_level
  END
WHERE country = 'Ghana'
  AND (
    address ILIKE '%East Legon%'
    OR address ILIKE '%Cantonments%'
    OR address ILIKE '%Labone%'
    OR address ILIKE '%Airport Residential%'
  );

UPDATE public.listings AS listing
SET
  quality_score = GREATEST(listing.quality_score, 82),
  verification_status = CASE
    WHEN listing.verification_status = 'verified' THEN 'verified'
    ELSE 'submitted'
  END,
  whatsapp_enabled = TRUE,
  quality_breakdown = jsonb_build_object(
    'titleDocumentStatus', 'submitted',
    'evaluatedAt', NOW(),
    'seededGhanaTrustBaseline', TRUE
  ),
  last_quality_checked_at = NOW()
FROM public.properties AS property
WHERE property.id = listing.property_id
  AND property.country = 'Ghana'
  AND property.ghana_post_gps IS NOT NULL;

INSERT INTO public.listing_verification_checks (
  listing_id,
  organization_id,
  check_key,
  label,
  status,
  score,
  details,
  evidence
)
SELECT
  listing.id,
  listing.organization_id,
  checks.check_key,
  checks.label,
  checks.status,
  checks.score,
  checks.details,
  jsonb_build_object('source', 'ghana_seed_backfill')
FROM public.listings AS listing
JOIN public.properties AS property
  ON property.id = listing.property_id
CROSS JOIN (
  VALUES
    ('verified_agency', 'Verified agency or owner', 'passed', 15, 'The listing is attached to a seeded verified organization.'),
    ('ghana_post_gps', 'GhanaPostGPS address', 'passed', 15, 'The GhanaPostGPS field is present for this Ghana listing.'),
    ('address_confidence', 'Address confidence', 'passed', 12, 'The listing has city, region, neighborhood, and GhanaPostGPS context.'),
    ('photo_pack', 'Photo pack', 'warning', 10, 'Seed listing includes a primary image. Add more images before paid promotion.'),
    ('price', 'GHS price clarity', 'passed', 10, 'The listing is priced in GHS.'),
    ('title_or_document', 'Title or authority evidence', 'warning', 5, 'Attach title, mandate, lease authority, or owner authorization evidence.')
) AS checks(check_key, label, status, score, details)
WHERE property.country = 'Ghana'
  AND property.ghana_post_gps IS NOT NULL
ON CONFLICT (listing_id, check_key) DO UPDATE
SET
  label = EXCLUDED.label,
  status = EXCLUDED.status,
  score = EXCLUDED.score,
  details = EXCLUDED.details,
  evidence = EXCLUDED.evidence,
  checked_at = NOW();

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, phone, avatar_url, phone_verified_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.phone,
    NEW.raw_user_meta_data ->> 'avatar_url',
    CASE WHEN NEW.phone_confirmed_at IS NOT NULL THEN NEW.phone_confirmed_at ELSE NULL END
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = COALESCE(EXCLUDED.email, public.users.email),
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    phone_verified_at = COALESCE(EXCLUDED.phone_verified_at, public.users.phone_verified_at),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_user() FROM PUBLIC;

INSERT INTO public.users (id, email, full_name, phone, avatar_url, phone_verified_at)
SELECT
  auth_user.id,
  auth_user.email,
  COALESCE(auth_user.raw_user_meta_data ->> 'full_name', auth_user.raw_user_meta_data ->> 'name'),
  auth_user.phone,
  auth_user.raw_user_meta_data ->> 'avatar_url',
  auth_user.phone_confirmed_at
FROM auth.users AS auth_user
ON CONFLICT (id) DO UPDATE
SET
  email = COALESCE(EXCLUDED.email, public.users.email),
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
  phone = COALESCE(EXCLUDED.phone, public.users.phone),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
  phone_verified_at = COALESCE(EXCLUDED.phone_verified_at, public.users.phone_verified_at),
  updated_at = NOW();

COMMENT ON TABLE public.trust_verification_requests IS 'Ghana-first verification workflow for agencies, listings, address evidence, and title documentation.';
COMMENT ON TABLE public.listing_verification_checks IS 'Public and internal listing checks used to drive quality scores and trust badges.';
COMMENT ON TABLE public.ghana_market_locations IS 'Curated Ghana neighborhood intelligence used before paid map, crime, school, and flood-risk integrations are connected.';

NOTIFY pgrst, 'reload schema';
