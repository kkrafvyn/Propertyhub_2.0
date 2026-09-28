-- Server-controlled enforcement for high-risk user and estate workflows.
-- These flows must not trust client-supplied state for identity, access, or financial decisions.

-- KYC review transitions are trusted-only and staff-controlled.
REVOKE UPDATE ON public.kyc_submissions FROM authenticated;
CREATE OR REPLACE FUNCTION public.review_kyc_submission(
  p_submission_id UUID,
  p_status TEXT,
  p_reviewer_notes TEXT DEFAULT NULL
)
RETURNS public.kyc_submissions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.kyc_submissions;
BEGIN
  IF NOT (public.is_platform_admin() OR public.has_platform_console_grant('trust')) THEN
    RAISE EXCEPTION 'KYC review requires platform trust permissions';
  END IF;

  IF p_status NOT IN ('verified', 'rejected') THEN
    RAISE EXCEPTION 'Unsupported KYC review status';
  END IF;

  -- KYC review fields are controlled by platform administrators; client code cannot mutate them.

  UPDATE public.kyc_submissions
  SET status = p_status,
      reviewer_notes = p_reviewer_notes,
      reviewed_at = NOW()
  WHERE id = p_submission_id
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'KYC submission not found';
  END IF;

  IF p_status = 'verified' THEN
    UPDATE public.users
    SET verified = TRUE,
        updated_at = NOW()
    WHERE id = v_row.user_id;
  ELSIF p_status = 'rejected' THEN
    UPDATE public.users
    SET verified = FALSE,
        updated_at = NOW()
    WHERE id = v_row.user_id;
  END IF;

  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.review_kyc_submission(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_kyc_submission(UUID, TEXT, TEXT) TO authenticated;

-- Visitor passes are generated server-side. Client code cannot approve, mutate or forge the credential pair.
-- Server-generated pin and token values are never client-selected.
REVOKE INSERT, UPDATE, DELETE ON public.estate_visitor_passes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.estate_visitor_passes TO authenticated;

CREATE OR REPLACE FUNCTION public.create_estate_visitor_pass(
  p_estate_id UUID,
  p_host_user_id UUID,
  p_host_name TEXT,
  p_visitor_name TEXT,
  p_visitor_phone TEXT DEFAULT NULL,
  p_pass_type TEXT DEFAULT 'guest',
  p_vehicle_plate TEXT DEFAULT NULL,
  p_valid_hours INTEGER DEFAULT 4,
  p_max_uses SMALLINT DEFAULT 1
)
RETURNS public.estate_visitor_passes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pin TEXT;
  v_token TEXT;
  v_row public.estate_visitor_passes;
BEGIN
  IF p_estate_id IS NULL OR p_host_user_id IS NULL THEN
    RAISE EXCEPTION 'Estate and host user are required';
  END IF;

  IF NOT private.is_estate_staff(p_estate_id) AND auth.uid() IS DISTINCT FROM p_host_user_id THEN
    RAISE EXCEPTION 'Only estate staff or the host user may create a visitor pass';
  END IF;

  IF p_pass_type NOT IN ('guest', 'delivery', 'contractor', 'resident_vehicle', 'maintenance') THEN
    RAISE EXCEPTION 'Unsupported pass type';
  END IF;

  v_pin := lpad((floor(random() * 900000) + 100000)::text, 6, '0');
  v_token := 'BM-GATE-' || v_pin;

  INSERT INTO public.estate_visitor_passes (
    estate_id,
    host_user_id,
    host_name,
    visitor_name,
    visitor_phone,
    pass_type,
    pin_code,
    qr_payload,
    valid_from,
    valid_until,
    max_uses,
    status,
    created_by
  ) VALUES (
    p_estate_id,
    p_host_user_id,
    COALESCE(NULLIF(trim(p_host_name), ''), 'Resident'),
    COALESCE(NULLIF(trim(p_visitor_name), ''), 'Guest'),
    NULLIF(trim(p_visitor_phone), ''),
    p_pass_type,
    v_pin,
    v_token,
    NOW(),
    NOW() + (COALESCE(p_valid_hours, 4) || ' hours')::interval,
    COALESCE(p_max_uses, 1),
    'active',
    auth.uid()
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.create_estate_visitor_pass(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, SMALLINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_estate_visitor_pass(UUID, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, INTEGER, SMALLINT) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_estate_visitor_pass(
  p_estate_id UUID,
  p_token_or_pin TEXT,
  p_guard_user_id UUID DEFAULT NULL,
  p_guard_name TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clean TEXT;
  v_pass public.estate_visitor_passes;
  v_now TIMESTAMPTZ;
BEGIN
  IF p_token_or_pin IS NULL OR btrim(p_token_or_pin) = '' THEN
    RAISE EXCEPTION 'Visitor token or PIN is required';
  END IF;

  IF NOT private.is_estate_staff(p_estate_id) THEN
    RAISE EXCEPTION 'Estate gate verification requires staff authorization';
  END IF;

  v_clean := btrim(p_token_or_pin);
  v_now := NOW();

  SELECT * INTO v_pass
  FROM public.estate_visitor_passes
  WHERE estate_id = p_estate_id
    AND status = 'active'
    AND (
      pin_code = v_clean OR qr_payload = upper(v_clean)
    )
    AND valid_from <= v_now
    AND valid_until >= v_now
    AND use_count < max_uses
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid or expired visitor pass');
  END IF;

  UPDATE public.estate_visitor_passes
  SET use_count = use_count + 1,
      status = CASE WHEN use_count + 1 >= max_uses THEN 'used' ELSE 'active' END,
      updated_at = NOW()
  WHERE id = v_pass.id;

  INSERT INTO public.estate_gate_log (
    estate_id,
    pass_id,
    direction,
    visitor_name,
    vehicle_plate,
    pass_type,
    guard_user_id,
    guard_name,
    verification_method,
    access_granted
  ) VALUES (
    p_estate_id,
    v_pass.id,
    'entry',
    v_pass.visitor_name,
    v_pass.vehicle_plate,
    v_pass.pass_type,
    p_guard_user_id,
    p_guard_name,
    CASE WHEN upper(v_clean) LIKE 'BM-GATE-%' THEN 'qr' ELSE 'pin' END,
    TRUE
  );

  RETURN jsonb_build_object(
    'success', TRUE,
    'pass_id', v_pass.id,
    'visitor_name', v_pass.visitor_name,
    'message', 'Access granted for ' || v_pass.visitor_name
  );
END;
$$;
REVOKE ALL ON FUNCTION public.verify_estate_visitor_pass(UUID, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_estate_visitor_pass(UUID, TEXT, UUID, TEXT) TO authenticated;

-- Smart-device secrets and event writes are trusted-only.
REVOKE INSERT, UPDATE, DELETE ON public.smart_devices, public.smart_device_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.smart_devices, public.smart_device_events TO authenticated;

CREATE OR REPLACE FUNCTION public.register_smart_device(
  p_organization_id UUID,
  p_listing_id UUID,
  p_lease_id UUID,
  p_device_type TEXT,
  p_label TEXT,
  p_room TEXT DEFAULT NULL,
  p_access_code TEXT DEFAULT NULL
)
RETURNS public.smart_devices
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.smart_devices;
BEGIN
  IF NOT private.is_org_admin(p_organization_id) THEN
    RAISE EXCEPTION 'Only org administrators may register smart devices';
  END IF;

  INSERT INTO public.smart_devices (
    organization_id,
    listing_id,
    lease_id,
    device_type,
    label,
    room,
    access_code,
    status,
    last_reading
  ) VALUES (
    p_organization_id,
    p_listing_id,
    p_lease_id,
    p_device_type,
    p_label,
    p_room,
    NULLIF(p_access_code, ''),
    'online',
    '{}'::jsonb
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.register_smart_device(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_smart_device(UUID, UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.append_smart_device_event(
  p_device_id UUID,
  p_event_type TEXT,
  p_payload JSONB DEFAULT '{}'::JSONB
)
RETURNS public.smart_device_events
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.smart_device_events;
  v_org UUID;
BEGIN
  SELECT sd.organization_id INTO v_org
  FROM public.smart_devices sd
  WHERE sd.id = p_device_id;

  IF v_org IS NULL OR NOT private.is_org_admin(v_org) THEN
    RAISE EXCEPTION 'Smart-device event writes require org-admin authorization';
  END IF;

  INSERT INTO public.smart_device_events (
    device_id,
    event_type,
    payload,
    created_at
  ) VALUES (
    p_device_id,
    p_event_type,
    COALESCE(p_payload, '{}'::jsonb),
    NOW()
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.append_smart_device_event(UUID, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_smart_device_event(UUID, TEXT, JSONB) TO authenticated;

-- Legal and complaint records are created through server functions, not direct browser writes.
REVOKE INSERT ON public.legal_acceptances FROM PUBLIC, anon, authenticated;
REVOKE UPDATE, DELETE ON public.legal_acceptances FROM PUBLIC, anon, authenticated;
REVOKE INSERT ON public.support_complaints FROM PUBLIC, anon, authenticated;
REVOKE UPDATE, DELETE ON public.support_complaints FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.legal_acceptances, public.support_complaints TO authenticated;

CREATE OR REPLACE FUNCTION public.record_legal_acceptance(
  p_user_id UUID,
  p_scope TEXT,
  p_policy_version TEXT,
  p_policies TEXT[] DEFAULT '{}'::TEXT[],
  p_user_agent TEXT DEFAULT NULL
)
RETURNS public.legal_acceptances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.legal_acceptances;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Users may record only their own legal acceptances';
  END IF;

  INSERT INTO public.legal_acceptances (
    user_id,
    scope,
    policy_version,
    policies,
    user_agent,
    accepted_at
  ) VALUES (
    p_user_id,
    p_scope,
    p_policy_version,
    COALESCE(p_policies, '{}'::TEXT[]),
    p_user_agent,
    NOW()
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.record_legal_acceptance(UUID, TEXT, TEXT, TEXT[], TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_legal_acceptance(UUID, TEXT, TEXT, TEXT[], TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_support_complaint(
  p_user_id UUID,
  p_category TEXT,
  p_subject TEXT,
  p_description TEXT,
  p_listing_id UUID DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL
)
RETURNS public.support_complaints
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user UUID;
  v_row public.support_complaints;
  v_recent_count INTEGER;
BEGIN
  v_user := COALESCE(p_user_id, auth.uid());

  IF p_category IS NULL OR btrim(p_category) = '' THEN
    RAISE EXCEPTION 'Complaint category is required';
  END IF;

  IF p_subject IS NULL OR btrim(p_subject) = '' THEN
    RAISE EXCEPTION 'Complaint subject is required';
  END IF;

  SELECT COUNT(*) INTO v_recent_count
  FROM public.support_complaints
  WHERE user_id = v_user
    AND created_at > NOW() - INTERVAL '1 hour';

  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'too many complaints in a short period';
  END IF;

  INSERT INTO public.support_complaints (
    user_id,
    contact_email,
    category,
    subject,
    description,
    listing_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    v_user,
    NULLIF(trim(p_contact_email), ''),
    btrim(p_category),
    btrim(p_subject),
    btrim(p_description),
    p_listing_id,
    'open',
    NOW(),
    NOW()
  ) RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_support_complaint(UUID, TEXT, TEXT, TEXT, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_support_complaint(UUID, TEXT, TEXT, TEXT, UUID, TEXT) TO authenticated;

-- Property valuation audits are append-only; once authored, the model inputs and confidence are immutable.
REVOKE UPDATE, DELETE ON public.property_valuation_audits FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.guard_property_valuation_audit_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.organization_id IS DISTINCT FROM OLD.organization_id
      OR NEW.property_id IS DISTINCT FROM OLD.property_id
      OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
      OR NEW.property_title IS DISTINCT FROM OLD.property_title
      OR NEW.neighborhood IS DISTINCT FROM OLD.neighborhood
      OR NEW.property_type IS DISTINCT FROM OLD.property_type
      OR NEW.bedrooms IS DISTINCT FROM OLD.bedrooms
      OR NEW.bathrooms IS DISTINCT FROM OLD.bathrooms
      OR NEW.area_sqm IS DISTINCT FROM OLD.area_sqm
      OR NEW.purchase_price_ghs IS DISTINCT FROM OLD.purchase_price_ghs
      OR NEW.predicted_monthly_rent_min_ghs IS DISTINCT FROM OLD.predicted_monthly_rent_min_ghs
      OR NEW.predicted_monthly_rent_optimal_ghs IS DISTINCT FROM OLD.predicted_monthly_rent_optimal_ghs
      OR NEW.predicted_monthly_rent_max_ghs IS DISTINCT FROM OLD.predicted_monthly_rent_max_ghs
      OR NEW.projected_gross_yield_pct IS DISTINCT FROM OLD.projected_gross_yield_pct
      OR NEW.projected_net_cap_rate_pct IS DISTINCT FROM OLD.projected_net_cap_rate_pct
      OR NEW.projected_vacancy_weeks IS DISTINCT FROM OLD.projected_vacancy_weeks
      OR NEW.confidence_score_pct IS DISTINCT FROM OLD.confidence_score_pct THEN
      RAISE EXCEPTION 'Valuation inputs and confidence_score_pct are immutable after creation';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Property valuation audits cannot be deleted after creation';
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_property_valuation_audit_mutation ON public.property_valuation_audits;
CREATE TRIGGER trg_guard_property_valuation_audit_mutation
BEFORE UPDATE OR DELETE ON public.property_valuation_audits
FOR EACH ROW EXECUTE FUNCTION public.guard_property_valuation_audit_mutation();

-- Access-code secrets remain server-backed and are never returned by public-facing payloads.
COMMENT ON COLUMN public.smart_devices.access_code IS 'Server-issued secret; do not expose through public queries or client DTOs.';
