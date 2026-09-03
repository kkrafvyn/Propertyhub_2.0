-- Property-level jurisdiction subdivision override (falls back to address auto-detect, then org default)

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS subdivision_code TEXT;

COMMENT ON COLUMN public.properties.subdivision_code IS
  'Optional sub-national rule overlay (state/county/province). Auto-detected from city/region when null.';

CREATE INDEX IF NOT EXISTS properties_subdivision_code_idx
  ON public.properties (subdivision_code)
  WHERE subdivision_code IS NOT NULL;
