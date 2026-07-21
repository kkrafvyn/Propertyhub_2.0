-- Remove demo seed data from earlier migrations.

DELETE FROM public.property_media
WHERE storage_path LIKE 'demo/%';

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
  AND ghana_post_gps IN ('GA-456-2198', 'GA-052-3914', 'GA-034-9012', 'GA-153-7740');
