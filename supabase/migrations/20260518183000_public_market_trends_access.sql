BEGIN;

GRANT SELECT ON public.market_analytics TO anon, authenticated;
GRANT SELECT ON public.location_trends TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view market analytics" ON public.market_analytics;
CREATE POLICY "Public can view market analytics"
ON public.market_analytics FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Public can view location trends" ON public.location_trends;
CREATE POLICY "Public can view location trends"
ON public.location_trends FOR SELECT
USING (true);

COMMIT;
