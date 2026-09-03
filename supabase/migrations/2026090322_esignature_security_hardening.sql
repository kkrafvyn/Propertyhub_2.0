-- Harden public e-signature: per-signer tokens, routing order, minimal public DTO, server-side lease finalize

CREATE OR REPLACE FUNCTION public.sanitize_public_document_url(p_url TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_url IS NULL OR btrim(p_url) = '' THEN NULL
    WHEN lower(btrim(p_url)) ~ '^https://[^\s<>"]+' THEN btrim(p_url)
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_esignature_signer_tokens(p_signers JSONB)
RETURNS JSONB
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN COALESCE(s->>'signer_token', '') <> '' THEN s
        ELSE s || jsonb_build_object('signer_token', encode(gen_random_bytes(16), 'hex'))
      END
      ORDER BY COALESCE(NULLIF(s->>'routing_order', '')::INT, 999), s->>'email'
    ),
    '[]'::JSONB
  )
  FROM jsonb_array_elements(COALESCE(p_signers, '[]'::JSONB)) s;
$$;

-- Backfill tokens on open envelopes
UPDATE public.esignature_requests e
SET signers = public.ensure_esignature_signer_tokens(e.signers),
    updated_at = NOW()
WHERE e.status IN ('sent', 'viewed', 'partially_signed')
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(e.signers, '[]'::JSONB)) s
    WHERE COALESCE(s->>'signer_token', '') = ''
  );

DROP FUNCTION IF EXISTS public.get_esignature_for_signing(TEXT);

CREATE OR REPLACE FUNCTION public.get_esignature_for_signing(
  p_token TEXT,
  p_signer_token TEXT
)
RETURNS TABLE (
  id UUID,
  document_name TEXT,
  document_type TEXT,
  document_url TEXT,
  document_body TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ,
  current_signer_name TEXT,
  current_signer_email TEXT,
  current_signer_role TEXT,
  routing_position INT,
  total_signers INT,
  signers_summary JSONB,
  cosign_required BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.esignature_requests%ROWTYPE;
  v_signers JSONB;
  v_current JSONB;
  v_next_order INT;
BEGIN
  IF COALESCE(btrim(p_token), '') = '' OR COALESCE(btrim(p_signer_token), '') = '' THEN
    RAISE EXCEPTION 'Signing link is incomplete. Use the personal link sent to your email.';
  END IF;

  SELECT * INTO v_row
  FROM public.esignature_requests
  WHERE public_sign_token = p_token
    AND status IN ('sent', 'viewed', 'partially_signed')
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signing request not found or expired';
  END IF;

  v_signers := public.ensure_esignature_signer_tokens(v_row.signers);
  IF v_signers IS DISTINCT FROM v_row.signers THEN
    UPDATE public.esignature_requests
    SET signers = v_signers, updated_at = NOW()
    WHERE id = v_row.id;
    v_row.signers := v_signers;
  END IF;

  SELECT s INTO v_current
  FROM jsonb_array_elements(v_signers) s
  WHERE s->>'signer_token' = p_signer_token
  LIMIT 1;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Invalid signer token for this envelope';
  END IF;

  IF COALESCE(v_current->>'status', 'pending') = 'signed' THEN
    RAISE EXCEPTION 'This signing link has already been used';
  END IF;

  SELECT MIN(COALESCE(NULLIF(s->>'routing_order', '')::INT, 999))
  INTO v_next_order
  FROM jsonb_array_elements(v_signers) s
  WHERE COALESCE(s->>'status', 'pending') <> 'signed';

  IF COALESCE(NULLIF(v_current->>'routing_order', '')::INT, 999) <> v_next_order THEN
    RAISE EXCEPTION 'It is not your turn to sign yet. Wait for prior signers to complete.';
  END IF;

  RETURN QUERY
  SELECT
    v_row.id,
    v_row.document_name,
    v_row.document_type,
    public.sanitize_public_document_url(v_row.document_url),
    v_row.document_body,
    v_row.status,
    v_row.expires_at,
    v_current->>'name',
    v_current->>'email',
    v_current->>'role',
    v_next_order,
    jsonb_array_length(v_signers)::INT,
    (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'name', s->>'name',
          'role', s->>'role',
          'status', COALESCE(s->>'status', 'pending')
        )
        ORDER BY COALESCE(NULLIF(s->>'routing_order', '')::INT, 999)
      ), '[]'::JSONB)
      FROM jsonb_array_elements(v_signers) s
    ),
    COALESCE((v_row.metadata->>'cosignRequired')::BOOLEAN, FALSE);
END;
$$;

DROP FUNCTION IF EXISTS public.sign_esignature_document(TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.sign_esignature_document(
  p_token TEXT,
  p_signer_token TEXT,
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
  v_current JSONB;
  v_next_order INT;
  v_signer_email TEXT;
  v_now TIMESTAMPTZ := NOW();
  v_status TEXT;
  v_doc_id UUID;
  v_rent_minor BIGINT;
  v_currency TEXT;
BEGIN
  IF COALESCE(btrim(p_signature_name), '') = '' THEN
    RAISE EXCEPTION 'Legal name is required';
  END IF;

  IF length(btrim(p_signature_name)) > 200 THEN
    RAISE EXCEPTION 'Signature name is too long';
  END IF;

  SELECT * INTO v_row
  FROM public.esignature_requests
  WHERE public_sign_token = p_token
    AND status IN ('sent', 'viewed', 'partially_signed')
    AND (expires_at IS NULL OR expires_at > v_now)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signing request not found or expired';
  END IF;

  v_signers := public.ensure_esignature_signer_tokens(v_row.signers);

  SELECT s INTO v_current
  FROM jsonb_array_elements(v_signers) s
  WHERE s->>'signer_token' = p_signer_token
  LIMIT 1;

  IF v_current IS NULL THEN
    RAISE EXCEPTION 'Invalid signer token for this envelope';
  END IF;

  IF COALESCE(v_current->>'status', 'pending') = 'signed' THEN
    RAISE EXCEPTION 'This signing link has already been used';
  END IF;

  SELECT MIN(COALESCE(NULLIF(s->>'routing_order', '')::INT, 999))
  INTO v_next_order
  FROM jsonb_array_elements(v_signers) s
  WHERE COALESCE(s->>'status', 'pending') <> 'signed';

  IF COALESCE(NULLIF(v_current->>'routing_order', '')::INT, 999) <> v_next_order THEN
    RAISE EXCEPTION 'It is not your turn to sign yet';
  END IF;

  v_signer_email := lower(btrim(v_current->>'email'));

  v_signers := (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN s->>'signer_token' = p_signer_token THEN
          s || jsonb_build_object(
            'signed_at', v_now,
            'signature_name', btrim(p_signature_name),
            'status', 'signed'
          )
        ELSE s
      END
      ORDER BY COALESCE(NULLIF(s->>'routing_order', '')::INT, 999)
    ), '[]'::JSONB)
    FROM jsonb_array_elements(v_signers) s
  );

  v_status := CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_signers) s
      WHERE COALESCE(s->>'status', 'pending') <> 'signed'
    ) THEN 'completed'
    ELSE 'partially_signed'
  END;

  UPDATE public.esignature_requests
  SET signers = v_signers,
      status = v_status,
      signed_at = CASE WHEN v_status = 'completed' THEN COALESCE(signed_at, v_now) ELSE signed_at END,
      completed_at = CASE WHEN v_status = 'completed' THEN v_now ELSE completed_at END,
      updated_at = v_now
  WHERE id = v_row.id;

  IF v_status = 'completed' THEN
    v_doc_id := COALESCE(v_row.document_id, NULLIF(v_row.metadata->>'organizationDocumentId', '')::UUID);

    IF v_row.lease_id IS NOT NULL THEN
      UPDATE public.leases
      SET signing_status = 'signed',
          signed_at = v_now,
          updated_at = v_now
      WHERE id = v_row.lease_id;
    END IF;

    IF v_doc_id IS NOT NULL THEN
      UPDATE public.organization_documents
      SET status = 'signed',
          signed_at = v_now,
          signed_by_name = btrim(p_signature_name),
          signature_method = 'typed',
          updated_at = v_now
      WHERE id = v_doc_id;

      INSERT INTO public.document_signatures (
        document_id,
        signer_name,
        signer_email,
        signer_role,
        signature_type,
        signature_value
      )
      VALUES (
        v_doc_id,
        btrim(p_signature_name),
        v_signer_email,
        CASE COALESCE(v_current->>'role', 'client')
          WHEN 'landlord' THEN 'organization_representative'
          WHEN 'witness' THEN 'witness'
          WHEN 'manager' THEN 'manager'
          ELSE 'client'
        END,
        'typed',
        btrim(p_signature_name)
      );
    END IF;

    IF v_row.organization_id IS NOT NULL AND COALESCE(v_row.metadata->>'jurisdictionId', '') <> '' THEN
      SELECT l.rent_minor, COALESCE(l.currency, 'GHS')
      INTO v_rent_minor, v_currency
      FROM public.leases l
      WHERE l.id = v_row.lease_id;

      INSERT INTO public.revenue_jurisdiction_events (
        organization_id,
        jurisdiction_id,
        subdivision_code,
        event_type,
        amount_minor,
        currency,
        lease_id,
        esignature_request_id,
        metadata
      )
      VALUES (
        v_row.organization_id,
        v_row.metadata->>'jurisdictionId',
        NULLIF(v_row.metadata->>'subdivisionLabel', ''),
        'lease_esign_completed',
        COALESCE(v_rent_minor, 0),
        COALESCE(v_currency, 'GHS'),
        v_row.lease_id,
        v_row.id,
        jsonb_build_object('source', 'sign_esignature_document')
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', TRUE,
    'status', v_status,
    'esignature_request_id', v_row.id,
    'lease_id', v_row.lease_id,
    'organization_document_id', v_doc_id,
    'signer_email', v_signer_email,
    'signer_name', btrim(p_signature_name),
    'signer_role', v_current->>'role',
    'notify_cosign', (v_status = 'partially_signed' AND COALESCE((v_row.metadata->>'cosignRequired')::BOOLEAN, FALSE))
  );
END;
$$;

-- Tenant pending list: include signer token for secure deep links
DROP FUNCTION IF EXISTS public.get_tenant_pending_esignatures(UUID);

CREATE OR REPLACE FUNCTION public.get_tenant_pending_esignatures(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  document_name TEXT,
  document_type TEXT,
  lease_id UUID,
  public_sign_token TEXT,
  signer_token TEXT,
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
    (
      SELECT s->>'signer_token'
      FROM jsonb_array_elements(public.ensure_esignature_signer_tokens(e.signers)) s
      WHERE COALESCE(s->>'status', 'pending') <> 'signed'
      ORDER BY COALESCE(NULLIF(s->>'routing_order', '')::INT, 999)
      LIMIT 1
    ) AS signer_token,
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

DROP FUNCTION IF EXISTS public.get_pending_lease_sign_for_phone(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.get_pending_lease_sign_for_phone(
  p_organization_id UUID,
  p_phone TEXT
)
RETURNS TABLE (
  esignature_request_id UUID,
  lease_id UUID,
  document_name TEXT,
  public_sign_token TEXT,
  signer_token TEXT,
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
    (
      SELECT s->>'signer_token'
      FROM jsonb_array_elements(public.ensure_esignature_signer_tokens(e.signers)) s
      WHERE COALESCE(s->>'status', 'pending') <> 'signed'
      ORDER BY COALESCE(NULLIF(s->>'routing_order', '')::INT, 999)
      LIMIT 1
    ) AS signer_token,
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

REVOKE ALL ON FUNCTION public.get_esignature_for_signing(TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_esignature_document(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_tenant_pending_esignatures(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pending_lease_sign_for_phone(UUID, TEXT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.get_esignature_for_signing(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_esignature_document(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_tenant_pending_esignatures(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_lease_sign_for_phone(UUID, TEXT) TO service_role, authenticated;
