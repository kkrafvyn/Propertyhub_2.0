-- Return metadata + org id on public signing lookup for revenue attribution

DROP FUNCTION IF EXISTS public.get_esignature_for_signing(TEXT);

CREATE OR REPLACE FUNCTION public.get_esignature_for_signing(p_token TEXT)
RETURNS TABLE (
  id UUID,
  document_name TEXT,
  document_type TEXT,
  document_url TEXT,
  document_body TEXT,
  metadata JSONB,
  organization_id UUID,
  lease_id UUID,
  status TEXT,
  signers JSONB,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.document_name,
    e.document_type,
    e.document_url,
    e.document_body,
    COALESCE(e.metadata, '{}'::JSONB),
    e.organization_id,
    e.lease_id,
    e.status,
    e.signers,
    e.expires_at
  FROM public.esignature_requests e
  WHERE e.public_sign_token = p_token
    AND e.status IN ('sent', 'viewed', 'partially_signed')
    AND (e.expires_at IS NULL OR e.expires_at > NOW());
$$;

GRANT EXECUTE ON FUNCTION public.get_esignature_for_signing(TEXT) TO anon, authenticated;
