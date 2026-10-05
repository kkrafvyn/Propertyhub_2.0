-- Security remediation phase 4: privileged identity, booking/payment integrity,
-- cross-tenant offline sync, external grants, and notification state.

-- Privileged identity fields are never self-service. Platform administrators must
-- use the audited AAL2 account-management RPCs instead of direct table updates.
CREATE OR REPLACE FUNCTION public.protect_users_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF auth.uid() IS DISTINCT FROM OLD.id AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Not authorized to update this user';
    END IF;

    IF (
      NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin
      OR NEW.is_platform_manager IS DISTINCT FROM OLD.is_platform_manager
      OR NEW.platform_console_grants IS DISTINCT FROM OLD.platform_console_grants
      OR NEW.banned IS DISTINCT FROM OLD.banned
      OR NEW.verified IS DISTINCT FROM OLD.verified
      OR NEW.role IS DISTINCT FROM OLD.role
    ) THEN
      IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Privileged user fields require a platform administrator';
      END IF;
      IF COALESCE(auth.jwt()->>'aal', '') <> 'aal2' THEN
        RAISE EXCEPTION 'Privileged user changes require AAL2 authentication';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_users_privileged_columns ON public.users;
CREATE TRIGGER trg_protect_users_privileged_columns
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.protect_users_privileged_columns();

-- Booking creation derives dates, organization, currency and amount exclusively
-- from database state. The listing price is major units; totals are stored minor.
CREATE OR REPLACE FUNCTION public.create_short_stay_booking(
  p_listing_id UUID,
  p_check_in DATE,
  p_check_out DATE,
  p_guest_note TEXT DEFAULT NULL,
  p_booking_mode TEXT DEFAULT 'instant',
  p_currency TEXT DEFAULT 'GHS'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest UUID := auth.uid();
  v_listing public.listings%ROWTYPE;
  v_nights INT;
  v_total_minor BIGINT;
  v_booking_id UUID;
BEGIN
  IF v_guest IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_out <= p_check_in
     OR p_check_in < CURRENT_DATE OR p_check_out > CURRENT_DATE + 730 THEN
    RAISE EXCEPTION 'Invalid booking dates';
  END IF;
  IF p_booking_mode NOT IN ('instant', 'request') THEN
    RAISE EXCEPTION 'Invalid booking mode';
  END IF;

  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id FOR SHARE;
  IF NOT FOUND OR v_listing.status NOT IN ('listed', 'under_offer') OR v_listing.listing_type <> 'short_stay' THEN
    RAISE EXCEPTION 'Active short-stay listing not found';
  END IF;
  IF COALESCE(v_listing.price, 0) <= 0 THEN RAISE EXCEPTION 'Listing price is invalid'; END IF;
  IF public.consumer_kyc_required_for_listing(p_listing_id)
     AND NOT public.is_user_kyc_verified(v_guest) THEN
    RAISE EXCEPTION 'Identity verification (KYC) is required to book in this market';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_listing_id::text, 0));
  IF EXISTS (
    SELECT 1 FROM public.short_stay_bookings b
    WHERE b.listing_id = p_listing_id AND b.status IN ('pending', 'confirmed')
      AND b.check_in < p_check_out AND b.check_out > p_check_in
  ) OR EXISTS (
    SELECT 1 FROM public.listing_availability a
    WHERE a.listing_id = p_listing_id AND a.available_date >= p_check_in
      AND a.available_date < p_check_out AND NOT a.is_available
  ) THEN
    RAISE EXCEPTION 'Those dates are unavailable';
  END IF;

  v_nights := p_check_out - p_check_in;
  v_total_minor := ROUND(v_listing.price * 100)::BIGINT * v_nights;
  IF v_total_minor <= 0 THEN RAISE EXCEPTION 'Booking total is invalid'; END IF;

  INSERT INTO public.short_stay_bookings (
    listing_id, organization_id, guest_user_id, check_in, check_out, nights,
    total_minor, currency, status, guest_note, booking_mode
  ) VALUES (
    p_listing_id, v_listing.organization_id, v_guest, p_check_in, p_check_out,
    v_nights, v_total_minor, COALESCE(NULLIF(v_listing.currency, ''), 'GHS'),
    'pending', LEFT(p_guest_note, 2000), p_booking_mode
  ) RETURNING id INTO v_booking_id;
  RETURN v_booking_id;
END;
$$;
REVOKE ALL ON FUNCTION public.create_short_stay_booking(UUID, DATE, DATE, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_short_stay_booking(UUID, DATE, DATE, TEXT, TEXT, TEXT) TO authenticated;

-- Direct booking mutation exposed financial and lifecycle fields. All changes now
-- go through purpose-built workflows or service-role reconciliation.
DROP POLICY IF EXISTS "Org members can manage bookings" ON public.short_stay_bookings;
REVOKE INSERT, UPDATE, DELETE ON public.short_stay_bookings FROM authenticated, anon;
GRANT SELECT ON public.short_stay_bookings TO authenticated;

CREATE OR REPLACE FUNCTION public.transition_short_stay_booking(
  p_booking_id UUID,
  p_status TEXT
)
RETURNS public.short_stay_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_booking public.short_stay_bookings;
BEGIN
  SELECT * INTO v_booking FROM public.short_stay_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF NOT public.is_platform_admin() AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = v_booking.organization_id AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'manager')
  ) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF p_status = 'confirmed' THEN
    IF v_booking.status <> 'pending' OR v_booking.booking_mode <> 'request' THEN
      RAISE EXCEPTION 'Only pending request bookings may be approved';
    END IF;
  ELSIF p_status = 'completed' THEN
    IF v_booking.status <> 'confirmed' OR v_booking.checked_in_at IS NULL OR v_booking.checked_out_at IS NULL THEN
      RAISE EXCEPTION 'Booking must complete check-in and check-out first';
    END IF;
  ELSE
    RAISE EXCEPTION 'Use the dedicated cancellation or stay workflow';
  END IF;
  UPDATE public.short_stay_bookings SET status = p_status, updated_at = NOW()
  WHERE id = p_booking_id RETURNING * INTO v_booking;
  RETURN v_booking;
END;
$$;
REVOKE ALL ON FUNCTION public.transition_short_stay_booking(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_short_stay_booking(UUID, TEXT) TO authenticated;

-- Cancellation finalization is an internal step. Refund amounts are policy-owned.
CREATE OR REPLACE FUNCTION public.finalize_booking_cancellation(
  p_booking_id UUID,
  p_refund_minor BIGINT DEFAULT NULL
)
RETURNS public.short_stay_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_booking public.short_stay_bookings;
BEGIN
  IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    RAISE EXCEPTION 'Only the cancellation service may finalize bookings';
  END IF;
  SELECT * INTO v_booking FROM public.short_stay_bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_booking.cancellation_status NOT IN (
    'cancellation_requested', 'refund_pending', 'refund_processing',
    'refund_completed', 'refund_failed'
  ) THEN RAISE EXCEPTION 'Cancellation intent is required'; END IF;
  IF v_booking.refund_minor < 0 OR v_booking.refund_minor > v_booking.total_minor THEN
    RAISE EXCEPTION 'Stored refund amount is invalid';
  END IF;
  UPDATE public.short_stay_bookings SET
    status = 'cancelled', cancelled_at = COALESCE(cancelled_at, NOW()),
    cancellation_status = 'cancelled', updated_at = NOW()
  WHERE id = p_booking_id RETURNING * INTO v_booking;
  RETURN v_booking;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_booking_cancellation(UUID, BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_booking_cancellation(UUID, BIGINT) TO service_role;

-- The check-in transaction must be successful and exactly match the booking.
CREATE OR REPLACE FUNCTION public.check_in_short_stay_booking(p_booking_id UUID)
RETURNS public.short_stay_bookings
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_booking public.short_stay_bookings; v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
BEGIN
  SELECT * INTO v_booking FROM public.short_stay_bookings WHERE id=p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF NOT (v_booking.guest_user_id=auth.uid() OR public.is_platform_admin() OR EXISTS (
    SELECT 1 FROM public.organization_members m WHERE m.organization_id=v_booking.organization_id
      AND m.user_id=auth.uid() AND m.role IN ('owner','manager')
  )) THEN RAISE EXCEPTION 'Not authorized'; END IF;
  IF v_booking.status <> 'confirmed' OR v_booking.checked_in_at IS NOT NULL
     OR v_today < v_booking.check_in OR v_today >= v_booking.check_out THEN
    RAISE EXCEPTION 'Booking is not eligible for check-in';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.property_transactions t
    WHERE t.id=v_booking.transaction_id AND t.status='success'
      AND t.payer_user_id=v_booking.guest_user_id AND t.listing_id=v_booking.listing_id
      AND t.organization_id=v_booking.organization_id AND t.purpose='booking_fee'
      AND t.amount_minor=v_booking.total_minor AND upper(t.currency)=upper(v_booking.currency)
  ) THEN RAISE EXCEPTION 'A matching successful payment is required'; END IF;
  UPDATE public.short_stay_bookings SET checked_in_at=NOW(),updated_at=NOW()
  WHERE id=p_booking_id RETURNING * INTO v_booking;
  RETURN v_booking;
END;
$$;
REVOKE ALL ON FUNCTION public.check_in_short_stay_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_short_stay_booking(UUID) TO authenticated;

-- Identity verification does not verify a payout destination. Track the MoMo
-- destination separately and invalidate approval whenever it changes.
ALTER TABLE public.estate_artisans
  ADD COLUMN IF NOT EXISTS payout_destination_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payout_destination_verified_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.invalidate_changed_artisan_payout_destination()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.momo_number IS DISTINCT FROM OLD.momo_number
     OR NEW.momo_provider IS DISTINCT FROM OLD.momo_provider THEN
    NEW.payout_destination_verified_at := NULL;
    NEW.payout_destination_verified_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_invalidate_artisan_payout_destination ON public.estate_artisans;
CREATE TRIGGER trg_invalidate_artisan_payout_destination
BEFORE UPDATE OF momo_number, momo_provider ON public.estate_artisans
FOR EACH ROW EXECUTE FUNCTION public.invalidate_changed_artisan_payout_destination();

CREATE OR REPLACE FUNCTION public.guard_artisan_payout_verification()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payout_destination_verified_at IS DISTINCT FROM OLD.payout_destination_verified_at
     OR NEW.payout_destination_verified_by IS DISTINCT FROM OLD.payout_destination_verified_by THEN
    IF current_setting('request.jwt.claim.role', true) <> 'service_role'
       AND (NOT public.is_platform_admin() OR COALESCE(auth.jwt()->>'aal','') <> 'aal2') THEN
      RAISE EXCEPTION 'Payout verification is server controlled';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_artisan_payout_verification ON public.estate_artisans;
CREATE TRIGGER trg_guard_artisan_payout_verification
BEFORE UPDATE ON public.estate_artisans
FOR EACH ROW EXECUTE FUNCTION public.guard_artisan_payout_verification();

CREATE OR REPLACE FUNCTION public.verify_artisan_payout_destination(p_artisan_id UUID)
RETURNS public.estate_artisans
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_artisan public.estate_artisans;
BEGIN
  IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    IF NOT public.is_platform_admin() OR COALESCE(auth.jwt()->>'aal','') <> 'aal2' THEN
      RAISE EXCEPTION 'Service role or AAL2 platform administrator required';
    END IF;
  END IF;
  UPDATE public.estate_artisans SET
    payout_destination_verified_at=NOW(), payout_destination_verified_by=auth.uid(), updated_at=NOW()
  WHERE id=p_artisan_id AND is_active AND ghana_card_verified
    AND NULLIF(trim(momo_number),'') IS NOT NULL AND momo_provider IS NOT NULL
  RETURNING * INTO v_artisan;
  IF NOT FOUND THEN RAISE EXCEPTION 'Active identity-verified artisan payout destination not found'; END IF;
  RETURN v_artisan;
END;
$$;
REVOKE ALL ON FUNCTION public.verify_artisan_payout_destination(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_artisan_payout_destination(UUID) TO authenticated, service_role;

-- Platform administrators retain full control, but privileged verification is
-- always step-up authenticated and audited by the row's verification metadata.
CREATE OR REPLACE FUNCTION public.verify_owner_payout_method(p_method_id UUID,p_status TEXT)
RETURNS public.owner_payout_methods
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_method public.owner_payout_methods;
BEGIN
  IF current_setting('request.jwt.claim.role', true) <> 'service_role' THEN
    IF NOT public.is_platform_admin() OR COALESCE(auth.jwt()->>'aal','') <> 'aal2' THEN
      RAISE EXCEPTION 'Service role or AAL2 platform administrator required';
    END IF;
  END IF;
  IF p_status NOT IN ('verified','revoked') THEN RAISE EXCEPTION 'Invalid payout method status'; END IF;
  IF p_status='verified' THEN
    UPDATE public.owner_payout_methods SET is_default=FALSE,updated_at=NOW()
    WHERE owner_user_id=(SELECT owner_user_id FROM public.owner_payout_methods WHERE id=p_method_id)
      AND organization_id=(SELECT organization_id FROM public.owner_payout_methods WHERE id=p_method_id)
      AND id<>p_method_id AND status='verified';
  END IF;
  UPDATE public.owner_payout_methods SET
    status=p_status,is_default=(p_status='verified'),
    verified_at=CASE WHEN p_status='verified' THEN NOW() ELSE NULL END,
    verified_by=CASE WHEN p_status='verified' THEN auth.uid() ELSE NULL END,updated_at=NOW()
  WHERE id=p_method_id RETURNING * INTO v_method;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout method not found'; END IF;
  RETURN v_method;
END;
$$;
REVOKE ALL ON FUNCTION public.verify_owner_payout_method(UUID,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.verify_owner_payout_method(UUID,TEXT) TO authenticated, service_role;

-- Offline tenant requests must resolve to an active lease in the same tenant.
CREATE OR REPLACE FUNCTION public.upsert_maintenance_request_offline(
  p_organization_id UUID,
  p_offline_client_id TEXT,
  p_payload JSONB
)
RETURNS public.maintenance_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_existing public.maintenance_requests; v_row public.maintenance_requests;
  v_lease public.leases; v_tenant UUID := auth.uid(); v_priority TEXT;
  v_lease_id UUID;
BEGIN
  IF auth.uid() IS NULL OR p_offline_client_id IS NULL
     OR length(trim(p_offline_client_id)) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION 'Invalid offline request';
  END IF;
  BEGIN v_lease_id := NULLIF(p_payload->>'lease_id','')::UUID;
  EXCEPTION WHEN invalid_text_representation THEN RAISE EXCEPTION 'Invalid lease id'; END;
  IF v_lease_id IS NULL THEN RAISE EXCEPTION 'An active lease is required'; END IF;
  SELECT * INTO v_lease FROM public.leases WHERE id=v_lease_id FOR SHARE;
  IF NOT FOUND OR v_lease.organization_id <> p_organization_id OR v_lease.status <> 'active' THEN
    RAISE EXCEPTION 'Active lease does not belong to this organization';
  END IF;
  IF v_lease.tenant_user_id <> auth.uid() AND NOT public.is_platform_admin() AND NOT EXISTS (
    SELECT 1 FROM public.organization_members m WHERE m.organization_id=p_organization_id
      AND m.user_id=auth.uid() AND m.role IN ('owner','manager','agent')
  ) THEN RAISE EXCEPTION 'Not authorized for this lease'; END IF;
  IF NULLIF(p_payload->>'tenant_user_id','') IS NOT NULL
     AND (p_payload->>'tenant_user_id')::UUID <> v_lease.tenant_user_id THEN
    RAISE EXCEPTION 'Tenant does not match lease';
  END IF;
  IF NULLIF(p_payload->>'listing_id','') IS NOT NULL
     AND (p_payload->>'listing_id')::UUID <> v_lease.listing_id THEN
    RAISE EXCEPTION 'Listing does not match lease';
  END IF;
  IF jsonb_typeof(COALESCE(p_payload->'photo_urls','[]'::jsonb)) <> 'array'
     OR jsonb_array_length(COALESCE(p_payload->'photo_urls','[]'::jsonb)) > 0 THEN
    RAISE EXCEPTION 'Upload photos after the request is created';
  END IF;
  SELECT * INTO v_existing FROM public.maintenance_requests
  WHERE organization_id=p_organization_id AND offline_client_id=trim(p_offline_client_id) LIMIT 1;
  IF FOUND THEN
    IF v_existing.tenant_user_id <> v_lease.tenant_user_id OR v_existing.lease_id <> v_lease.id THEN
      RAISE EXCEPTION 'Offline id already belongs to another request';
    END IF;
    RETURN v_existing;
  END IF;
  v_priority := COALESCE(NULLIF(trim(p_payload->>'priority'),''),'normal');
  IF v_priority NOT IN ('low','normal','high','urgent') THEN v_priority := 'normal'; END IF;
  INSERT INTO public.maintenance_requests(
    organization_id,offline_client_id,tenant_user_id,lease_id,listing_id,
    title,description,priority,status,photo_urls
  ) VALUES (
    p_organization_id,trim(p_offline_client_id),v_lease.tenant_user_id,v_lease.id,v_lease.listing_id,
    LEFT(COALESCE(NULLIF(trim(p_payload->>'title'),''),'Maintenance request'),160),
    LEFT(COALESCE(NULLIF(trim(p_payload->>'description'),''),'Maintenance request'),5000),
    v_priority,'open','{}'::TEXT[]
  ) RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;
REVOKE ALL ON FUNCTION public.upsert_maintenance_request_offline(UUID,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.upsert_maintenance_request_offline(UUID,TEXT,JSONB) TO authenticated;

-- Only organization administrators can mint narrowly scoped, expiring grants.
CREATE OR REPLACE FUNCTION public.create_external_access_grant(
  p_organization_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_recipient_email TEXT DEFAULT NULL,
  p_label TEXT DEFAULT NULL,
  p_expires_in_hours INTEGER DEFAULT 168
)
RETURNS TABLE(grant_id UUID, access_token TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE v_token TEXT; v_hash TEXT; v_id UUID;
BEGIN
  IF auth.uid() IS NULL OR NOT (
    public.is_platform_admin() OR private.can_manage_organization_members(p_organization_id)
  ) THEN RAISE EXCEPTION 'Organization administrator access required'; END IF;
  IF p_resource_type NOT IN ('maintenance_request','estate_work_order') OR p_resource_id IS NULL THEN
    RAISE EXCEPTION 'Unsupported external resource';
  END IF;
  IF p_expires_in_hours NOT BETWEEN 1 AND 720 THEN RAISE EXCEPTION 'Expiry must be between 1 and 720 hours'; END IF;
  IF p_recipient_email IS NULL OR trim(p_recipient_email) !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' THEN
    RAISE EXCEPTION 'A valid recipient email is required';
  END IF;
  v_token:=encode(gen_random_bytes(32),'hex'); v_hash:=encode(digest(v_token,'sha256'),'hex');
  INSERT INTO public.external_access_grants(
    organization_id,resource_type,resource_id,recipient_email,token_hash,label,expires_at,created_by
  ) VALUES (
    p_organization_id,p_resource_type,p_resource_id,lower(trim(p_recipient_email)),v_hash,
    NULLIF(LEFT(trim(p_label),160),''),NOW()+make_interval(hours=>p_expires_in_hours),auth.uid()
  ) RETURNING id INTO v_id;
  RETURN QUERY SELECT v_id,v_token;
END;
$$;
REVOKE ALL ON FUNCTION public.create_external_access_grant(UUID,TEXT,UUID,TEXT,TEXT,INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_external_access_grant(UUID,TEXT,UUID,TEXT,TEXT,INTEGER) TO authenticated;

-- Clients may acknowledge notifications, but cannot forge/replay delivery state.
CREATE OR REPLACE FUNCTION public.guard_notification_client_state()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.delivered := CASE WHEN NEW.channel='in_app' THEN TRUE ELSE FALSE END;
    NEW.delivered_at := CASE WHEN NEW.channel='in_app' THEN NOW() ELSE NULL END;
    NEW.read := FALSE; NEW.read_at := NULL; NEW.created_at := NOW();
  ELSE
    IF NEW.user_id IS DISTINCT FROM OLD.user_id OR NEW.channel IS DISTINCT FROM OLD.channel
       OR NEW.subject IS DISTINCT FROM OLD.subject OR NEW.content IS DISTINCT FROM OLD.content
       OR NEW.delivered IS DISTINCT FROM OLD.delivered OR NEW.delivered_at IS DISTINCT FROM OLD.delivered_at
       OR NEW.actor_user_id IS DISTINCT FROM OLD.actor_user_id
       OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id THEN
      RAISE EXCEPTION 'Notification delivery state is server controlled';
    END IF;
    IF NEW.read AND NOT OLD.read THEN NEW.read_at := COALESCE(NEW.read_at,NOW());
    ELSIF NOT NEW.read THEN NEW.read_at := NULL; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_notification_client_state ON public.notification_logs;
CREATE TRIGGER trg_guard_notification_client_state
BEFORE INSERT OR UPDATE ON public.notification_logs
FOR EACH ROW EXECUTE FUNCTION public.guard_notification_client_state();

NOTIFY pgrst, 'reload schema';
