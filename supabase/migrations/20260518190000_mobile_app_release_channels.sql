BEGIN;

CREATE TABLE IF NOT EXISTS public.mobile_app_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL UNIQUE CHECK (platform IN ('ios', 'android')),
  latest_version TEXT NOT NULL,
  minimum_version TEXT NOT NULL,
  update_url TEXT NOT NULL,
  force_update BOOLEAN NOT NULL DEFAULT FALSE,
  current_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.mobile_app_releases ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.mobile_app_releases TO anon, authenticated;

DROP POLICY IF EXISTS "Public can view mobile app releases" ON public.mobile_app_releases;
CREATE POLICY "Public can view mobile app releases"
ON public.mobile_app_releases FOR SELECT
USING (true);

COMMENT ON TABLE public.mobile_app_releases IS 'Public release channel metadata for iOS and Android download surfaces.';

COMMIT;
