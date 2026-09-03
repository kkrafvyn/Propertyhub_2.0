-- Lease e-signature: store generated jurisdiction clauses inline for public signing.

ALTER TABLE public.esignature_requests
  ADD COLUMN IF NOT EXISTS document_body TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB;

DROP FUNCTION IF EXISTS public.get_esignature_for_signing(TEXT);

CREATE OR REPLACE FUNCTION public.get_esignature_for_signing(p_token TEXT)
RETURNS TABLE (
  id UUID,
  document_name TEXT,
  document_type TEXT,
  document_url TEXT,
  document_body TEXT,
  metadata JSONB,
  status TEXT,
  signers JSONB,
  expires_at TIMESTAMPTZ,
  organization_id UUID
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
    e.status,
    e.signers,
    e.expires_at,
    e.organization_id
  FROM public.esignature_requests e
  WHERE e.public_sign_token = p_token
    AND e.status IN ('sent', 'viewed', 'partially_signed')
    AND (e.expires_at IS NULL OR e.expires_at > NOW());
$$;
