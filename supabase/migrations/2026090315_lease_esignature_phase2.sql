-- Phase 2: tenant pending signatures + richer sign completion payload

CREATE OR REPLACE FUNCTION public.get_tenant_pending_esignatures(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  document_name TEXT,
  document_type TEXT,
  lease_id UUID,
  public_sign_token TEXT,
  expires_at TIMESTAMPTZ,
  property_address TEXT,
  jurisdiction_label TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id,
    e.document_name,
    e.document_type,
    e.lease_id,
    e.public_sign_token,
    e.expires_at,
    p.address AS property_address,
    COALESCE(e.metadata->>'subdivisionLabel', e.metadata->>'jurisdictionLabel') AS jurisdiction_label
  FROM public.esignature_requests e
  INNER JOIN public.leases l ON l.id = e.lease_id
  LEFT JOIN public.listings li ON li.id = l.listing_id
  LEFT JOIN public.properties p ON p.id = li.property_id
  WHERE l.tenant_user_id = p_user_id
    AND p_user_id = auth.uid()
    AND e.status IN ('sent', 'viewed', 'partially_signed')
    AND (e.expires_at IS NULL OR e.expires_at > NOW())
  ORDER BY e.created_at DESC;
$$;

DROP FUNCTION IF EXISTS public.sign_esignature_document(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.sign_esignature_document(
  p_token TEXT,
  p_signer_email TEXT,
  p_signature_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.esignature_requests%ROWTYPE;
  v_signers JSONB;
  v_now TIMESTAMPTZ := NOW();
  v_status TEXT;
BEGIN
  SELECT * INTO v_row FROM public.esignature_requests
  WHERE public_sign_token = p_token
    AND status IN ('sent', 'viewed', 'partially_signed')
    AND (expires_at IS NULL OR expires_at > v_now)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signing request not found or expired';
  END IF;

  v_signers := COALESCE(v_row.signers, '[]'::JSONB);
  v_signers := (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN lower(s->>'email') = lower(p_signer_email) THEN
          s || jsonb_build_object('signed_at', v_now, 'signature_name', p_signature_name, 'status', 'signed')
        ELSE s
      END
    ), '[]'::JSONB)
    FROM jsonb_array_elements(v_signers) s
  );

  v_status := CASE WHEN NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_signers) s WHERE COALESCE(s->>'status', 'pending') <> 'signed'
  ) THEN 'completed' ELSE 'partially_signed' END;

  UPDATE public.esignature_requests
  SET signers = v_signers,
      status = v_status,
      signed_at = CASE WHEN v_status = 'completed' THEN COALESCE(signed_at, v_now) ELSE signed_at END,
      completed_at = CASE WHEN v_status = 'completed' THEN v_now ELSE completed_at END,
      updated_at = v_now
  WHERE id = v_row.id;

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', v_status,
    'esignature_request_id', v_row.id,
    'lease_id', v_row.lease_id,
    'organization_document_id', COALESCE(v_row.document_id, v_row.metadata->>'organizationDocumentId'),
    'signer_email', lower(p_signer_email),
    'signer_name', p_signature_name
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_tenant_pending_esignatures(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sign_esignature_document(TEXT, TEXT, TEXT) TO anon, authenticated;
