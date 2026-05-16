INSERT INTO public.users (id, email, full_name, avatar_url)
SELECT
  auth_user.id,
  auth_user.email,
  COALESCE(
    auth_user.raw_user_meta_data ->> 'full_name',
    auth_user.raw_user_meta_data ->> 'name',
    INITCAP(REPLACE(SPLIT_PART(auth_user.email, '@', 1), '.', ' '))
  ),
  auth_user.raw_user_meta_data ->> 'avatar_url'
FROM auth.users AS auth_user
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
  avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
  updated_at = NOW();

WITH ranked_users AS (
  SELECT
    auth_user.id,
    auth_user.email,
    ROW_NUMBER() OVER (ORDER BY auth_user.created_at ASC, auth_user.id ASC) AS rn
  FROM auth.users AS auth_user
),
seed_organizations AS (
  SELECT
    'accra-prime-homes'::text AS slug,
    'Accra Prime Homes'::text AS name,
    'Verified residential agency serving East Legon, Cantonments, and Airport Residential with curated long-stay homes.'::text AS description,
    'https://placehold.co/240x240/f3f4f6/1f2937?text=APH'::text AS logo_url,
    'https://accra-prime-homes.example.com'::text AS website,
    '+233 24 555 0101'::text AS phone,
    'hello@accraprimehomes.example.com'::text AS email,
    (SELECT ranked_users.id FROM ranked_users WHERE ranked_users.rn = 1) AS owner_id
  UNION ALL
  SELECT
    'coastal-realty-gh',
    'Coastal Realty GH',
    'Boutique brokerage for premium rentals, offices, and investor-ready properties across central Accra.',
    'https://placehold.co/240x240/e0f2fe/0f172a?text=CRG',
    'https://coastal-realty-gh.example.com',
    '+233 20 555 0102',
    'team@coastalrealtygh.example.com',
    COALESCE(
      (SELECT ranked_users.id FROM ranked_users WHERE ranked_users.rn = 2),
      (SELECT ranked_users.id FROM ranked_users WHERE ranked_users.rn = 1)
    )
)
INSERT INTO public.organizations (
  name,
  slug,
  description,
  logo_url,
  website,
  email,
  phone,
  owner_id,
  verified,
  suspended
)
SELECT
  seed_organizations.name,
  seed_organizations.slug,
  seed_organizations.description,
  seed_organizations.logo_url,
  seed_organizations.website,
  seed_organizations.email,
  seed_organizations.phone,
  seed_organizations.owner_id,
  TRUE,
  FALSE
FROM seed_organizations
WHERE seed_organizations.owner_id IS NOT NULL
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  logo_url = EXCLUDED.logo_url,
  website = EXCLUDED.website,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  owner_id = EXCLUDED.owner_id,
  verified = TRUE,
  suspended = FALSE,
  updated_at = NOW();

INSERT INTO public.organization_members (organization_id, user_id, role)
SELECT
  organization.id,
  organization.owner_id,
  'owner'
FROM public.organizations AS organization
WHERE organization.slug IN ('accra-prime-homes', 'coastal-realty-gh')
ON CONFLICT (organization_id, user_id) DO UPDATE
SET role = EXCLUDED.role;

WITH property_seed AS (
  SELECT
    'accra-prime-homes'::text AS organization_slug,
    '19 Lagos Avenue, East Legon'::text AS address,
    'Accra'::text AS city,
    'Greater Accra'::text AS region,
    'house'::text AS category,
    4::integer AS bedrooms,
    4::integer AS bathrooms,
    320::integer AS square_meters,
    'Contemporary family home with gated parking, backup power, and quick access to A&C Mall.'::text AS description,
    ARRAY['gated compound', 'backup power', 'water reservoir', 'fitted kitchen', 'balcony']::text[] AS amenities
  UNION ALL
  SELECT
    'accra-prime-homes',
    '7 Second Rangoon Close, Cantonments',
    'Accra',
    'Greater Accra',
    'apartment',
    3,
    3,
    240,
    'High-floor serviced apartment with concierge, city views, and easy access to embassies and restaurants.',
    ARRAY['concierge', 'pool', 'gym', 'city view', 'ensuite bedrooms']::text[]
  UNION ALL
  SELECT
    'coastal-realty-gh',
    '12 Fifth Avenue, Labone',
    'Accra',
    'Greater Accra',
    'apartment',
    2,
    2,
    145,
    'Bright executive apartment with modern finishes, secure entry, and walkable access to cafes and shopping.',
    ARRAY['secure entry', 'air conditioning', 'modern kitchen', 'parking', 'laundry area']::text[]
  UNION ALL
  SELECT
    'coastal-realty-gh',
    '45 Liberation Road, Airport Residential',
    'Accra',
    'Greater Accra',
    'office',
    0,
    2,
    410,
    'Flexible office suite with reception area, boardroom, and strong visibility on a major commercial corridor.',
    ARRAY['reception', 'boardroom', 'parking', 'backup generator', 'fiber ready']::text[]
),
org_map AS (
  SELECT organization.id, organization.slug
  FROM public.organizations AS organization
  WHERE organization.slug IN ('accra-prime-homes', 'coastal-realty-gh')
)
INSERT INTO public.properties (
  organization_id,
  address,
  city,
  region,
  country,
  category,
  bedrooms,
  bathrooms,
  square_meters,
  description,
  amenities
)
SELECT
  org_map.id,
  property_seed.address,
  property_seed.city,
  property_seed.region,
  'Ghana',
  property_seed.category,
  property_seed.bedrooms,
  property_seed.bathrooms,
  property_seed.square_meters,
  property_seed.description,
  property_seed.amenities
FROM property_seed
JOIN org_map ON org_map.slug = property_seed.organization_slug
WHERE NOT EXISTS (
  SELECT 1
  FROM public.properties AS property
  WHERE property.organization_id = org_map.id
    AND property.address = property_seed.address
);

WITH listing_seed AS (
  SELECT
    'accra-prime-homes'::text AS organization_slug,
    '19 Lagos Avenue, East Legon'::text AS address,
    'rental'::text AS listing_type,
    8500::integer AS price,
    TRUE AS featured,
    NOW() - INTERVAL '4 days' AS published_at
  UNION ALL
  SELECT
    'accra-prime-homes',
    '7 Second Rangoon Close, Cantonments',
    'sale',
    3200000,
    TRUE,
    NOW() - INTERVAL '3 days'
  UNION ALL
  SELECT
    'coastal-realty-gh',
    '12 Fifth Avenue, Labone',
    'rental',
    6200,
    TRUE,
    NOW() - INTERVAL '2 days'
  UNION ALL
  SELECT
    'coastal-realty-gh',
    '45 Liberation Road, Airport Residential',
    'lease',
    18000,
    TRUE,
    NOW() - INTERVAL '1 day'
),
listing_targets AS (
  SELECT
    property.id AS property_id,
    property.organization_id,
    listing_seed.listing_type,
    listing_seed.price,
    listing_seed.featured,
    listing_seed.published_at
  FROM listing_seed
  JOIN public.organizations AS organization
    ON organization.slug = listing_seed.organization_slug
  JOIN public.properties AS property
    ON property.organization_id = organization.id
   AND property.address = listing_seed.address
)
INSERT INTO public.listings (
  property_id,
  organization_id,
  listing_type,
  price,
  currency,
  status,
  visibility,
  featured,
  published_at
)
SELECT
  listing_targets.property_id,
  listing_targets.organization_id,
  listing_targets.listing_type,
  listing_targets.price,
  'GHS',
  'listed',
  'public',
  listing_targets.featured,
  listing_targets.published_at
FROM listing_targets
WHERE NOT EXISTS (
  SELECT 1
  FROM public.listings AS listing
  WHERE listing.property_id = listing_targets.property_id
    AND listing.listing_type = listing_targets.listing_type
);

WITH listing_seed AS (
  SELECT
    'accra-prime-homes'::text AS organization_slug,
    '19 Lagos Avenue, East Legon'::text AS address,
    'rental'::text AS listing_type,
    8500::integer AS price,
    TRUE AS featured,
    NOW() - INTERVAL '4 days' AS published_at
  UNION ALL
  SELECT
    'accra-prime-homes',
    '7 Second Rangoon Close, Cantonments',
    'sale',
    3200000,
    TRUE,
    NOW() - INTERVAL '3 days'
  UNION ALL
  SELECT
    'coastal-realty-gh',
    '12 Fifth Avenue, Labone',
    'rental',
    6200,
    TRUE,
    NOW() - INTERVAL '2 days'
  UNION ALL
  SELECT
    'coastal-realty-gh',
    '45 Liberation Road, Airport Residential',
    'lease',
    18000,
    TRUE,
    NOW() - INTERVAL '1 day'
)
UPDATE public.listings AS listing
SET
  price = listing_seed.price,
  currency = 'GHS',
  status = 'listed',
  visibility = 'public',
  featured = listing_seed.featured,
  published_at = listing_seed.published_at,
  updated_at = NOW()
FROM listing_seed
JOIN public.organizations AS organization
  ON organization.slug = listing_seed.organization_slug
JOIN public.properties AS property
  ON property.organization_id = organization.id
 AND property.address = listing_seed.address
WHERE listing.property_id = property.id
  AND listing.organization_id = organization.id
  AND listing.listing_type = listing_seed.listing_type;

WITH media_seed AS (
  SELECT
    'seed/accra-prime-homes/east-legon-house.jpg'::text AS storage_path,
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1600&q=80'::text AS public_url,
    'East Legon family home exterior'::text AS alt_text,
    'accra-prime-homes'::text AS organization_slug,
    '19 Lagos Avenue, East Legon'::text AS address
  UNION ALL
  SELECT
    'seed/accra-prime-homes/cantonments-penthouse.jpg',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&q=80',
    'Cantonments serviced apartment living room',
    'accra-prime-homes',
    '7 Second Rangoon Close, Cantonments'
  UNION ALL
  SELECT
    'seed/coastal-realty-gh/labone-apartment.jpg',
    'https://images.unsplash.com/photo-1494526585095-c41746248156?w=1600&q=80',
    'Labone executive apartment interior',
    'coastal-realty-gh',
    '12 Fifth Avenue, Labone'
  UNION ALL
  SELECT
    'seed/coastal-realty-gh/airport-office.jpg',
    'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1600&q=80',
    'Airport Residential office suite',
    'coastal-realty-gh',
    '45 Liberation Road, Airport Residential'
),
media_targets AS (
  SELECT
    media_seed.storage_path,
    media_seed.public_url,
    media_seed.alt_text,
    property.id AS property_id,
    property.organization_id,
    organization.owner_id AS created_by
  FROM media_seed
  JOIN public.organizations AS organization
    ON organization.slug = media_seed.organization_slug
  JOIN public.properties AS property
    ON property.organization_id = organization.id
   AND property.address = media_seed.address
)
INSERT INTO public.property_media (
  property_id,
  organization_id,
  storage_path,
  public_url,
  alt_text,
  sort_order,
  is_primary,
  created_by
)
SELECT
  media_targets.property_id,
  media_targets.organization_id,
  media_targets.storage_path,
  media_targets.public_url,
  media_targets.alt_text,
  0,
  TRUE,
  media_targets.created_by
FROM media_targets
ON CONFLICT (storage_path) DO UPDATE
SET
  public_url = EXCLUDED.public_url,
  alt_text = EXCLUDED.alt_text,
  sort_order = EXCLUDED.sort_order,
  is_primary = EXCLUDED.is_primary,
  updated_at = NOW();
