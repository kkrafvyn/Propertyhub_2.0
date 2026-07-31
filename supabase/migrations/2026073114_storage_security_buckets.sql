-- Private bucket for KYC / identity documents (never public)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  FALSE,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Users upload only to their own folder: {userId}/...
DROP POLICY IF EXISTS "Users upload own KYC documents" ON storage.objects;
CREATE POLICY "Users upload own KYC documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users read own KYC documents" ON storage.objects;
CREATE POLICY "Users read own KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Platform admins read KYC documents" ON storage.objects;
CREATE POLICY "Platform admins read KYC documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND public.is_platform_admin()
);

-- Private maintenance photos bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-media',
  'maintenance-media',
  FALSE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "Org members upload maintenance media" ON storage.objects;
CREATE POLICY "Org members upload maintenance media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'maintenance-media'
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id::text = (storage.foldername(name))[1]
      AND om.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authorized users read maintenance media" ON storage.objects;
CREATE POLICY "Authorized users read maintenance media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'maintenance-media'
  AND (
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id::text = (storage.foldername(name))[1]
        AND om.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id::text = (storage.foldername(name))[2]
        AND mr.tenant_user_id = auth.uid()
    )
  )
);

-- Organization assets bucket (logos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-assets',
  'organization-assets',
  TRUE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

DROP POLICY IF EXISTS "Org members upload organization assets" ON storage.objects;
CREATE POLICY "Org members upload organization assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-assets'
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id::text = (storage.foldername(name))[1]
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Public read organization assets" ON storage.objects;
CREATE POLICY "Public read organization assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'organization-assets');
