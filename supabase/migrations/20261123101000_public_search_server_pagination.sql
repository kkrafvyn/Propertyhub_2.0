-- Paginated public listing discovery. Never download the entire inventory
-- into a browser to filter/sort; all predicates and counts are evaluated by PG.
-- SECURITY INVOKER preserves listings/properties/organizations RLS on every call.
CREATE OR REPLACE FUNCTION public.search_public_listing_ids(
  p_location TEXT DEFAULT NULL,
  p_bounds JSONB DEFAULT NULL,
  p_price_min NUMERIC DEFAULT NULL,
  p_price_max NUMERIC DEFAULT NULL,
  p_bedrooms INT DEFAULT NULL,
  p_bathrooms INT DEFAULT NULL,
  p_property_type TEXT DEFAULT NULL,
  p_listing_type TEXT DEFAULT NULL,
  p_organization_slug TEXT DEFAULT NULL,
  p_region TEXT DEFAULT NULL,
  p_country TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'newest',
  p_verified_only BOOLEAN DEFAULT FALSE,
  p_featured_only BOOLEAN DEFAULT FALSE,
  p_amenities TEXT[] DEFAULT ARRAY[]::TEXT[],
  p_currency TEXT DEFAULT NULL,
  p_limit INT DEFAULT 20,
  p_offset INT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 200
    OR p_offset IS NULL OR p_offset < 0 OR p_offset > 100000
    OR (p_price_min IS NOT NULL AND p_price_min < 0)
    OR (p_price_max IS NOT NULL AND p_price_max < 0)
    OR (p_bedrooms IS NOT NULL AND (p_bedrooms < 0 OR p_bedrooms > 100))
    OR (p_bathrooms IS NOT NULL AND (p_bathrooms < 0 OR p_bathrooms > 100))
    OR coalesce(p_sort, 'newest') NOT IN ('newest', 'featured', 'price_asc', 'price_desc')
    OR coalesce(array_length(p_amenities, 1),0) > 20 THEN
    RAISE EXCEPTION 'Invalid public search parameters' USING ERRCODE = '22023';
  END IF;
  IF p_bounds IS NOT NULL AND (
    jsonb_typeof(p_bounds) <> 'object'
    OR NOT (p_bounds ?& ARRAY['north', 'south', 'east', 'west'])
  ) THEN
    RAISE EXCEPTION 'Invalid search bounds' USING ERRCODE = '22023';
  END IF;

  WITH matched AS MATERIALIZED (
    SELECT l.id, l.price, l.currency, l.featured, l.published_at
    FROM public.listings AS l
    JOIN public.properties AS p ON p.id = l.property_id
    JOIN public.organizations AS o ON o.id = l.organization_id
    WHERE l.status = 'listed' AND l.visibility = 'public'
      AND (p_listing_type IS NULL OR l.listing_type = p_listing_type)
      AND (p_property_type IS NULL OR lower(p.category) = lower(p_property_type))
      AND (p_price_min IS NULL OR l.price >= p_price_min)
      AND (p_price_max IS NULL OR l.price <= p_price_max)
      AND (p_bedrooms IS NULL OR coalesce(p.bedrooms,0) >= p_bedrooms)
      AND (p_bathrooms IS NULL OR coalesce(p.bathrooms,0) >= p_bathrooms)
      AND (p_organization_slug IS NULL OR o.slug = p_organization_slug)
      AND (p_verified_only IS NOT TRUE OR coalesce(o.verified,false))
      AND (p_featured_only IS NOT TRUE OR coalesce(l.featured,false))
      AND (p_currency IS NULL OR upper(coalesce(l.currency,'')) = upper(p_currency))
      AND (p_country IS NULL OR strpos(lower(coalesce(p.country,'')),lower(p_country)) > 0)
      AND (p_region IS NULL OR
        strpos(lower(concat_ws(' ', p.region, p.city, p.address)), lower(p_region)) > 0)
      AND (p_location IS NULL OR btrim(p_location) = '' OR
        strpos(lower(concat_ws(' ', p.address, p.city, p.region, p.country)),lower(btrim(p_location))) > 0)
      AND (p_bounds IS NULL OR (
        p.latitude IS NOT NULL AND p.longitude IS NOT NULL
        AND p.latitude >= (p_bounds->>'south')::DOUBLE PRECISION
        AND p.latitude <= (p_bounds->>'north')::DOUBLE PRECISION
        AND p.longitude >= (p_bounds->>'west')::DOUBLE PRECISION
        AND p.longitude <= (p_bounds->>'east')::DOUBLE PRECISION
      ))
      AND NOT EXISTS (
        SELECT 1 FROM unnest(coalesce(p_amenities, ARRAY[]::TEXT[])) AS requested(amenity)
        WHERE NOT EXISTS (
          SELECT 1 FROM unnest(coalesce(p.amenities, ARRAY[]::TEXT[])) AS actual(amenity)
          WHERE lower(btrim(actual.amenity)) = lower(btrim(requested.amenity))
        )
      )
  ),
  ordered AS (
    SELECT id, row_number() OVER (
      ORDER BY
        CASE WHEN p_sort='featured' THEN featured END DESC NULLS LAST,
        CASE WHEN p_sort IN ('price_asc','price_desc') THEN coalesce(currency,'') END ASC NULLS LAST,
        CASE WHEN p_sort='price_asc' THEN price END ASC NULLS LAST,
        CASE WHEN p_sort='price_desc' THEN price END DESC NULLS LAST,
        published_at DESC NULLS LAST, id DESC
    ) AS rank
    FROM matched
  ),
  page AS (SELECT id, rank FROM ordered ORDER BY rank LIMIT p_limit OFFSET p_offset)
  SELECT jsonb_build_object(
    'ids', coalesce((SELECT jsonb_agg(id ORDER BY rank) FROM page), '[]'::jsonb),
    'total', (SELECT count(*) FROM matched)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.search_public_listing_ids(
  TEXT,JSONB,NUMERIC,NUMERIC,INT,INT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN,BOOLEAN,TEXT[],TEXT,INT,INT
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_listing_ids(
  TEXT,JSONB,NUMERIC,NUMERIC,INT,INT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN,BOOLEAN,TEXT[],TEXT,INT,INT
) TO anon, authenticated;

-- Partial index supports public-status and freshness filtering; equality filters
-- on listing and organization already rely on normal FK/primary-key indexes.
CREATE INDEX IF NOT EXISTS idx_listings_public_discovery
  ON public.listings (published_at DESC, id DESC)
  WHERE status='listed' AND visibility='public';

COMMENT ON FUNCTION public.search_public_listing_ids(
  TEXT,JSONB,NUMERIC,NUMERIC,INT,INT,TEXT,TEXT,TEXT,TEXT,TEXT,TEXT,BOOLEAN,BOOLEAN,TEXT[],TEXT,INT,INT
) IS 'RLS-respecting server-paginated listing IDs and exact count. Mixed-currency price order groups by currency, not exchange rate.';

NOTIFY pgrst,'reload schema';
