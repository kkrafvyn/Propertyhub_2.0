-- Remove raw public document access and expose only an intentionally minimal public DTO.

REVOKE SELECT ON public.organization_documents FROM anon;
DROP POLICY IF EXISTS "Public can view shared trust documents" ON public.organization_documents;
DROP POLICY IF EXISTS "Related users can view shared documents" ON public.organization_documents;

DROP POLICY IF EXISTS "Document authors and org members may read documents" ON public.organization_documents;
CREATE POLICY "Document authors and org members may read documents"
ON public.organization_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_documents.organization_id
      AND membership.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.deal_cases deal_case
    WHERE deal_case.id = organization_documents.deal_case_id
      AND deal_case.user_id = auth.uid()
  )
);

-- Public consumers may only receive these non-sensitive fields for a listing document.
CREATE OR REPLACE FUNCTION public.get_public_listing_documents(p_listing_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  title TEXT,
  document_type TEXT,
  status TEXT,
  public_summary TEXT,
  listing_id UUID,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id,
         d.title,
         d.document_type,
         d.status,
         d.public_summary,
         d.listing_id,
         d.updated_at
  FROM public.organization_documents d
  WHERE d.listing_id = p_listing_id
    AND d.public_visibility = TRUE
    AND d.status IN ('sent', 'partially_signed', 'signed')
    AND d.current_version = TRUE
  ORDER BY d.updated_at DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 50);
$$;
REVOKE ALL ON FUNCTION public.get_public_listing_documents(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_listing_documents(UUID, INTEGER) TO anon, authenticated;

-- Signature evidence is never public; only the organization or related deal owner may view it.
REVOKE SELECT ON public.document_signatures FROM anon;
DROP POLICY IF EXISTS "Accessible users can sign documents" ON public.document_signatures;
DROP POLICY IF EXISTS "No client document signature writes" ON public.document_signatures;
CREATE POLICY "Authorized users can view document signatures"
ON public.document_signatures
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_documents document
    WHERE document.id = document_signatures.document_id
      AND (
        EXISTS (
          SELECT 1
          FROM public.organization_members membership
          WHERE membership.organization_id = document.organization_id
            AND membership.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.deal_cases deal_case
          WHERE deal_case.id = document.deal_case_id
            AND deal_case.user_id = auth.uid()
        )
      )
  )
);
CREATE POLICY "No client document signature writes"
ON public.document_signatures
FOR INSERT
WITH CHECK (FALSE);

-- Publication is an explicit organization-admin action, not a generic document update.
CREATE OR REPLACE FUNCTION public.set_document_public_visibility(
  p_document_id UUID,
  p_public_visibility BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_document public.organization_documents%ROWTYPE;
BEGIN
  SELECT * INTO v_document
  FROM public.organization_documents
  WHERE id = p_document_id
  FOR UPDATE;

  IF NOT FOUND OR NOT private.is_org_admin(v_document.organization_id) THEN
    RAISE EXCEPTION 'Only organization administrators can publish documents';
  END IF;

  UPDATE public.organization_documents
  SET public_visibility = COALESCE(p_public_visibility, FALSE),
      updated_at = NOW()
  WHERE id = p_document_id;

  RETURN jsonb_build_object(
    'id', p_document_id,
    'public_visibility', COALESCE(p_public_visibility, FALSE)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.set_document_public_visibility(UUID, BOOLEAN) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_document_public_visibility(UUID, BOOLEAN) TO authenticated;

-- SECURITY DEFINER signing RPCs execute as their owner; direct authenticated updates do not.
CREATE OR REPLACE FUNCTION public.guard_document_signing_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
    NEW.status IS DISTINCT FROM OLD.status
    OR NEW.signed_at IS DISTINCT FROM OLD.signed_at
    OR NEW.signed_by_user_id IS DISTINCT FROM OLD.signed_by_user_id
    OR NEW.signed_by_name IS DISTINCT FROM OLD.signed_by_name
    OR NEW.signature_method IS DISTINCT FROM OLD.signature_method
    OR NEW.public_visibility IS DISTINCT FROM OLD.public_visibility
    OR NEW.signed_copy_bucket IS DISTINCT FROM OLD.signed_copy_bucket
    OR NEW.signed_copy_path IS DISTINCT FROM OLD.signed_copy_path
  )
    AND current_user NOT IN ('postgres', 'service_role')
    AND auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Document signing state is server-controlled; use the hardened signing RPC only';
  END IF;

  RETURN NEW;
END;
$$;
