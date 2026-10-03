-- Launch blockers 3, 5, 7–8, 10, 13 (+ doc reference for scan findings 1–2, 4, 6, 9 in edge functions).
-- See docs/security/BAYTMIFTAH_ATTACK_REMEDIATION_PROGRAM.md § WhatsApp launch blockers (2026-10-03).

-- 3) Org-member bot context preview: team managers / leadership only; redact tenant identifiers.
CREATE OR REPLACE FUNCTION public.get_whatsapp_bot_context_for_org_member(
  p_organization_id UUID,
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_full JSONB;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT (
    private.is_org_admin(p_organization_id)
    OR private.org_member_has_permission(p_organization_id, 'team:manage')
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  v_full := public.get_whatsapp_bot_context(p_organization_id, p_phone);
  IF v_full IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_full
    - 'tenantUserId'
    - 'leaseId'
    - 'listingId'
    - 'paymentPath';
END;
$$;

REVOKE ALL ON FUNCTION public.get_whatsapp_bot_context_for_org_member(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_whatsapp_bot_context_for_org_member(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_bot_context_for_org_member(UUID, TEXT) TO authenticated;

-- 5) Unassigned inbound rows are not readable by arbitrary authenticated users.
DROP POLICY IF EXISTS "Org members read whatsapp inbound" ON public.whatsapp_inbound_messages;
CREATE POLICY "Org members read whatsapp inbound" ON public.whatsapp_inbound_messages
  FOR SELECT USING (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = whatsapp_inbound_messages.organization_id
        AND m.user_id = auth.uid()
    )
  );

-- 7) Re-affirm service_role-only lease sign token lookup (2026100212).
REVOKE ALL ON FUNCTION public.get_pending_lease_sign_for_phone(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pending_lease_sign_for_phone(UUID, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_pending_lease_sign_for_phone(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pending_lease_sign_for_phone(UUID, TEXT) TO service_role;

-- 13) Phone lookup: exact normalized digits only; ambiguous duplicates return NULL.
CREATE OR REPLACE FUNCTION public.find_user_id_by_phone(p_phone TEXT)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits TEXT;
  v_matches UUID[];
BEGIN
  v_digits := public.normalize_phone_digits(p_phone);
  IF v_digits IS NULL OR v_digits = '' THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(array_agg(u.id ORDER BY u.updated_at DESC NULLS LAST), ARRAY[]::UUID[])
  INTO v_matches
  FROM public.users u
  WHERE public.normalize_phone_digits(COALESCE(u.phone, '')) = v_digits;

  IF array_length(v_matches, 1) IS NULL OR array_length(v_matches, 1) = 0 THEN
    RETURN NULL;
  END IF;

  IF array_length(v_matches, 1) > 1 THEN
    RETURN NULL;
  END IF;

  RETURN v_matches[1];
END;
$$;

REVOKE ALL ON FUNCTION public.find_user_id_by_phone(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_phone(TEXT) TO service_role;

-- 8) Signatures always attributed to auth.uid(); must be an envelope signer or authorized party.
CREATE OR REPLACE FUNCTION public.record_document_signature(
  p_document_id UUID,
  p_signer_user_id UUID,
  p_signer_name TEXT,
  p_signer_email TEXT,
  p_signer_role TEXT,
  p_signature_type TEXT,
  p_signature_value TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_document public.organization_documents%ROWTYPE;
  v_signer_user_id UUID := auth.uid();
  v_signer_name TEXT := NULLIF(btrim(p_signer_name), '');
  v_signer_email TEXT := NULLIF(lower(btrim(p_signer_email)), '');
  v_signature_type TEXT := COALESCE(NULLIF(btrim(p_signature_type), ''), 'typed');
  v_signature_value TEXT := COALESCE(NULLIF(btrim(p_signature_value), ''), v_signer_name, 'Signed');
  v_signed_at TIMESTAMPTZ := NOW();
  v_has_active_envelope BOOLEAN;
BEGIN
  IF p_document_id IS NULL THEN
    RAISE EXCEPTION 'Document identifier is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required to sign documents';
  END IF;

  IF v_signer_name IS NULL THEN
    RAISE EXCEPTION 'Signer name is required';
  END IF;

  SELECT * INTO v_document
  FROM public.organization_documents
  WHERE id = p_document_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.esignature_requests e
    WHERE e.document_id = v_document.id
      AND e.status IN ('sent', 'viewed', 'partially_signed')
  )
  INTO v_has_active_envelope;

  IF v_has_active_envelope THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.esignature_requests e
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(e.signers, '[]'::jsonb)) s
      JOIN public.users cu ON cu.id = auth.uid()
      WHERE e.document_id = v_document.id
        AND e.status IN ('sent', 'viewed', 'partially_signed')
        AND (
          NULLIF(btrim(s->>'user_id'), '')::uuid = auth.uid()
          OR (
            NULLIF(btrim(s->>'email'), '') IS NOT NULL
            AND lower(btrim(s->>'email')) = lower(btrim(cu.email))
          )
        )
    ) THEN
      RAISE EXCEPTION 'You are not a designated signer for this document envelope';
    END IF;
  ELSIF v_document.deal_case_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.deal_cases deal_case
      WHERE deal_case.id = v_document.deal_case_id
        AND deal_case.user_id = auth.uid()
    )
    AND NOT (
      private.is_org_admin(v_document.organization_id)
      OR private.org_member_has_permission(v_document.organization_id, 'documents:write')
    ) THEN
      RAISE EXCEPTION 'You are not authorized to record this signature';
    END IF;
  ELSE
    IF NOT (
      private.is_org_admin(v_document.organization_id)
      OR private.org_member_has_permission(v_document.organization_id, 'documents:write')
    ) THEN
      RAISE EXCEPTION 'You are not authorized to record this signature';
    END IF;
  END IF;

  INSERT INTO public.document_signatures (
    document_id,
    signer_user_id,
    signer_name,
    signer_email,
    signer_role,
    signature_type,
    signature_value,
    signed_at
  )
  VALUES (
    v_document.id,
    v_signer_user_id,
    v_signer_name,
    v_signer_email,
    COALESCE(NULLIF(btrim(p_signer_role), ''), 'client'),
    v_signature_type,
    v_signature_value,
    v_signed_at
  );

  UPDATE public.organization_documents
  SET status = 'signed',
      signed_at = v_signed_at,
      signed_by_user_id = v_signer_user_id,
      signed_by_name = v_signer_name,
      signature_method = v_signature_type,
      updated_at = v_signed_at
  WHERE id = v_document.id;

  INSERT INTO public.document_activity_logs (
    document_id,
    actor_user_id,
    action,
    details,
    created_at
  )
  VALUES (
    v_document.id,
    v_signer_user_id,
    'document_signed',
    jsonb_build_object(
      'signer_name', v_signer_name,
      'signer_role', COALESCE(NULLIF(btrim(p_signer_role), ''), 'client'),
      'signature_type', v_signature_type
    ),
    v_signed_at
  );

  RETURN jsonb_build_object(
    'document_id', v_document.id,
    'status', 'signed',
    'signed_at', v_signed_at,
    'signer_name', v_signer_name,
    'signer_role', COALESCE(NULLIF(btrim(p_signer_role), ''), 'client')
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_document_signature(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_document_signature(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- 10) recorded_by must be the authenticated finance actor, not a client-supplied UUID.
CREATE OR REPLACE FUNCTION public.record_estate_payment(
  p_unit_id UUID,
  p_paid_by_user_id UUID,
  p_amount_minor BIGINT,
  p_currency TEXT,
  p_method TEXT,
  p_provider_reference TEXT,
  p_recorded_by_user_id UUID,
  p_proof_path TEXT DEFAULT NULL,
  p_fx_rate_to_ghs NUMERIC DEFAULT NULL,
  p_fx_rate_date DATE DEFAULT NULL,
  p_allocations JSONB DEFAULT '[]'::jsonb
)
RETURNS public.unit_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  payment_row public.unit_payments;
  allocation JSONB;
  allocation_total BIGINT := 0;
  charge_outstanding BIGINT;
  unit_estate_id UUID;
  v_recorded_by UUID := auth.uid();
BEGIN
  IF v_recorded_by IS NULL THEN
    RAISE EXCEPTION 'Authentication required to record estate payments';
  END IF;

  SELECT estate_id INTO unit_estate_id FROM public.estate_units WHERE id = p_unit_id;
  IF unit_estate_id IS NULL THEN
    RAISE EXCEPTION 'Estate unit not found';
  END IF;
  IF NOT private.can_manage_estate_finance(unit_estate_id) THEN
    RAISE EXCEPTION 'Not authorised to record estate payments';
  END IF;
  IF p_amount_minor IS NULL OR p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'Payment amount must be greater than zero';
  END IF;
  IF p_currency IS NULL OR char_length(p_currency) <> 3 THEN
    RAISE EXCEPTION 'Payment currency must be a three-letter currency code';
  END IF;
  IF p_method NOT IN ('momo', 'card', 'bank_transfer', 'cash') THEN
    RAISE EXCEPTION 'Unsupported payment method';
  END IF;
  SELECT * INTO payment_row FROM public.unit_payments WHERE provider_reference = p_provider_reference;
  IF payment_row.id IS NOT NULL THEN
    RETURN payment_row;
  END IF;
  IF jsonb_typeof(p_allocations) <> 'array' OR jsonb_array_length(p_allocations) = 0 THEN
    RAISE EXCEPTION 'At least one payment allocation is required';
  END IF;

  FOR allocation IN SELECT value FROM jsonb_array_elements(p_allocations)
  LOOP
    IF COALESCE((allocation ->> 'amount_minor')::BIGINT, 0) <= 0 THEN
      RAISE EXCEPTION 'Allocation amount must be greater than zero';
    END IF;
    SELECT charge.amount_minor - COALESCE(SUM(existing.amount_minor), 0)
      INTO charge_outstanding
    FROM public.unit_charges charge
    LEFT JOIN public.payment_allocations existing ON existing.charge_id = charge.id
    WHERE charge.id = (allocation ->> 'charge_id')::UUID
      AND charge.unit_id = p_unit_id
      AND charge.currency = p_currency
    GROUP BY charge.id;
    IF charge_outstanding IS NULL THEN
      RAISE EXCEPTION 'Allocation charge does not belong to this unit or currency';
    END IF;
    IF (allocation ->> 'amount_minor')::BIGINT > charge_outstanding THEN
      RAISE EXCEPTION 'Allocation exceeds the outstanding charge balance';
    END IF;
    allocation_total := allocation_total + (allocation ->> 'amount_minor')::BIGINT;
  END LOOP;

  IF allocation_total <> p_amount_minor THEN
    RAISE EXCEPTION 'Payment allocations must equal the payment amount';
  END IF;

  INSERT INTO public.unit_payments (
    unit_id, paid_by_user_id, amount_minor, currency, fx_rate_to_ghs, fx_rate_date,
    method, provider_reference, recorded_by_user_id, proof_path
  ) VALUES (
    p_unit_id, p_paid_by_user_id, p_amount_minor, upper(p_currency), p_fx_rate_to_ghs, p_fx_rate_date,
    p_method, p_provider_reference, v_recorded_by, p_proof_path
  ) RETURNING * INTO payment_row;

  FOR allocation IN SELECT value FROM jsonb_array_elements(p_allocations)
  LOOP
    INSERT INTO public.payment_allocations (payment_id, charge_id, amount_minor)
    VALUES (payment_row.id, (allocation ->> 'charge_id')::UUID, (allocation ->> 'amount_minor')::BIGINT);
  END LOOP;

  RETURN payment_row;
EXCEPTION WHEN unique_violation THEN
  SELECT * INTO payment_row FROM public.unit_payments WHERE provider_reference = p_provider_reference;
  IF payment_row.id IS NULL THEN RAISE; END IF;
  RETURN payment_row;
END;
$$;

REVOKE ALL ON FUNCTION public.record_estate_payment(UUID, UUID, BIGINT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, DATE, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_estate_payment(UUID, UUID, BIGINT, TEXT, TEXT, TEXT, UUID, TEXT, NUMERIC, DATE, JSONB) TO authenticated;

NOTIFY pgrst, 'reload schema';
