-- Property media storage and metadata

CREATE TABLE IF NOT EXISTS public.property_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_media_property
ON public.property_media(property_id);

CREATE INDEX IF NOT EXISTS idx_property_media_organization
ON public.property_media(organization_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_property_media_primary_per_property
ON public.property_media(property_id)
WHERE is_primary = TRUE;

ALTER TABLE public.property_media ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_property_media_updated_at
ON public.property_media;

CREATE TRIGGER set_property_media_updated_at
BEFORE UPDATE ON public.property_media
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

GRANT SELECT ON public.property_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_media TO authenticated;

CREATE POLICY "Anyone can view property media for public listings"
ON public.property_media FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.listings listing
    WHERE listing.property_id = property_media.property_id
      AND listing.status = 'listed'
      AND listing.visibility = 'public'
  )
  OR EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = property_media.organization_id
      AND membership.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can create property media"
ON public.property_media FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = property_media.organization_id
      AND membership.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.properties property
    WHERE property.id = property_media.property_id
      AND property.organization_id = property_media.organization_id
  )
);

CREATE POLICY "Org members can update property media"
ON public.property_media FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = property_media.organization_id
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = property_media.organization_id
      AND membership.user_id = auth.uid()
  )
  AND EXISTS (
    SELECT 1
    FROM public.properties property
    WHERE property.id = property_media.property_id
      AND property.organization_id = property_media.organization_id
  )
);

CREATE POLICY "Org members can delete property media"
ON public.property_media FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = property_media.organization_id
      AND membership.user_id = auth.uid()
  )
);

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'property-media',
  'property-media',
  TRUE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public can view property media bucket" ON storage.objects;
CREATE POLICY "Public can view property media bucket"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'property-media');

DROP POLICY IF EXISTS "Org members can upload property media objects" ON storage.objects;
CREATE POLICY "Org members can upload property media objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'property-media'
  AND EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id::text = (storage.foldername(name))[1]
      AND membership.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Org members can update property media objects" ON storage.objects;
CREATE POLICY "Org members can update property media objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'property-media'
  AND EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id::text = (storage.foldername(name))[1]
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'property-media'
  AND EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id::text = (storage.foldername(name))[1]
      AND membership.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Org members can delete property media objects" ON storage.objects;
CREATE POLICY "Org members can delete property media objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'property-media'
  AND EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id::text = (storage.foldername(name))[1]
      AND membership.user_id = auth.uid()
  )
);
