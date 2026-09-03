-- Lookup pending lease e-sign envelope by tenant phone (WhatsApp bot /bm sign)

CREATE OR REPLACE FUNCTION public.get_pending_lease_sign_for_phone(
  p_organization_id UUID,
  p_phone TEXT
)
RETURNS TABLE (
  esignature_request_id UUID,
  lease_id UUID,
  document_name TEXT,
  public_sign_token TEXT,
  jurisdiction_label TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH normalized AS (
    SELECT regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g') AS digits
  )
  SELECT
    e.id AS esignature_request_id,
    e.lease_id,
    e.document_name,
    e.public_sign_token,
    COALESCE(e.metadata->>'subdivisionLabel', e.metadata->>'jurisdictionLabel') AS jurisdiction_label
  FROM public.esignature_requests e
  INNER JOIN public.leases l ON l.id = e.lease_id
  LEFT JOIN public.users u ON u.id = l.tenant_user_id
  CROSS JOIN normalized n
  WHERE e.organization_id = p_organization_id
    AND e.status IN ('sent', 'viewed', 'partially_signed')
    AND (e.expires_at IS NULL OR e.expires_at > NOW())
    AND n.digits <> ''
    AND (
      regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g') = n.digits
      OR regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g') = right(n.digits, length(regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g')))
      OR right(regexp_replace(COALESCE(u.phone, ''), '\D', '', 'g'), 9) = right(n.digits, 9)
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements(COALESCE(e.signers, '[]'::jsonb)) s
        WHERE regexp_replace(COALESCE(s->>'phone', ''), '\D', '', 'g') <> ''
          AND (
            regexp_replace(COALESCE(s->>'phone', ''), '\D', '', 'g') = n.digits
            OR right(regexp_replace(COALESCE(s->>'phone', ''), '\D', '', 'g'), 9) = right(n.digits, 9)
          )
      )
    )
  ORDER BY e.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_pending_lease_sign_for_phone(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_pending_lease_sign_for_phone(UUID, TEXT) TO service_role, authenticated;
