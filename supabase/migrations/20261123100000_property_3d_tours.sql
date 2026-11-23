-- Published 3D virtual tour URLs belong to property records, not unverified iframes.
-- Prevent XSS/foreign provider tracking through stored arbitrary embed URLs.
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS virtual_tour_url TEXT;

ALTER TABLE public.properties
  DROP CONSTRAINT IF EXISTS property_virtual_tour_matterport_only;

ALTER TABLE public.properties
  ADD CONSTRAINT property_virtual_tour_matterport_only
  CHECK (
    virtual_tour_url IS NULL
    OR virtual_tour_url ~ '^https://my\.matterport\.com/show/\?m=[A-Za-z0-9]{11}$'
  );

COMMENT ON COLUMN public.properties.virtual_tour_url IS
  'Optional published Matterport 3D scan; URL must be normalized and never embed arbitrary HTML.';

NOTIFY pgrst, 'reload schema';
