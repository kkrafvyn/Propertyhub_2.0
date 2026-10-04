-- Phase 2: booking cancellation state machine, check-in/out RPCs, auth session revoke, refund idempotency.

ALTER TABLE public.short_stay_bookings
  ADD COLUMN IF NOT EXISTS cancellation_status TEXT,
  ADD COLUMN IF NOT EXISTS refund_idempotency_key TEXT;

ALTER TABLE public.short_stay_bookings DROP CONSTRAINT IF EXISTS short_stay_bookings_cancellation_status_check;
ALTER TABLE public.short_stay_bookings ADD CONSTRAINT short_stay_bookings_cancellation_status_check
  CHECK (
    cancellation_status IS NULL OR cancellation_status IN (
      'cancellation_requested',
      'refund_pending',
      'refund_processing',
      'refund_completed',
      'refund_failed',
      'cancelled'
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS short_stay_bookings_refund_idempotency_uidx
  ON public.short_stay_bookings (refund_idempotency_key)
  WHERE refund_idempotency_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS property_refunds_booking_idempotency_uidx
  ON public.property_refunds ((metadata->>'booking_id'))
  WHERE metadata->>'booking_id' IS NOT NULL
    AND status IN ('pending', 'processing', 'needs_attention', 'processed');

CREATE OR REPLACE FUNCTION public.mark_booking_cancellation_intent(
  p_booking_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS public.short_stay_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.short_stay_bookings;
  v_refund_minor BIGINT;
BEGIN
  SELECT * INTO v_booking
  FROM public.short_stay_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.guest_user_id <> auth.uid()
     AND NOT EXISTS (
       SELECT 1 FROM public.organization_members om
       WHERE om.organization_id = v_booking.organization_id
         AND om.user_id = auth.uid()
         AND om.role IN ('owner', 'manager')
     ) THEN
    RAISE EXCEPTION 'Not authorized to cancel this booking';
  END IF;

  IF v_booking.status = 'cancelled' THEN
    RETURN v_booking;
  END IF;

  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RAISE EXCEPTION 'Booking cannot be cancelled in its current state';
  END IF;

  v_refund_minor := CASE
    WHEN v_booking.status IN ('pending', 'confirmed') THEN GREATEST(ROUND(v_booking.total_minor * 0.85), 0)
    ELSE 0
  END;

  UPDATE public.short_stay_bookings
  SET
    cancellation_status = COALESCE(cancellation_status, 'cancellation_requested'),
    cancellation_reason = COALESCE(p_reason, cancellation_reason),
    refund_minor = COALESCE(refund_minor, v_refund_minor),
    refund_idempotency_key = COALESCE(refund_idempotency_key, 'booking:' || p_booking_id::text),
    updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.mark_booking_cancellation_intent(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_booking_cancellation_intent(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalize_booking_cancellation(
  p_booking_id UUID,
  p_refund_minor BIGINT DEFAULT NULL
)
RETURNS public.short_stay_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.short_stay_bookings;
BEGIN
  SELECT * INTO v_booking
  FROM public.short_stay_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF v_booking.guest_user_id <> auth.uid()
     AND NOT EXISTS (
       SELECT 1 FROM public.organization_members om
       WHERE om.organization_id = v_booking.organization_id
         AND om.user_id = auth.uid()
         AND om.role IN ('owner', 'manager')
     ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.short_stay_bookings
  SET
    status = 'cancelled',
    cancelled_at = COALESCE(cancelled_at, NOW()),
    cancellation_status = 'cancelled',
    refund_minor = COALESCE(p_refund_minor, refund_minor),
    updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_booking_cancellation(UUID, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.finalize_booking_cancellation(UUID, BIGINT) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_in_short_stay_booking(p_booking_id UUID)
RETURNS public.short_stay_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.short_stay_bookings;
  v_today DATE := (NOW() AT TIME ZONE 'UTC')::DATE;
BEGIN
  SELECT * INTO v_booking
  FROM public.short_stay_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF NOT (
    v_booking.guest_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = v_booking.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'manager')
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to check in this booking';
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Booking must be confirmed before check-in';
  END IF;

  IF v_booking.checked_in_at IS NOT NULL THEN
    RAISE EXCEPTION 'Guest is already checked in';
  END IF;

  IF v_today < v_booking.check_in OR v_today >= v_booking.check_out THEN
    RAISE EXCEPTION 'Check-in is only allowed during the stay window';
  END IF;

  IF v_booking.transaction_id IS NULL THEN
    RAISE EXCEPTION 'Payment must be recorded before check-in';
  END IF;

  UPDATE public.short_stay_bookings
  SET checked_in_at = NOW(), updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.check_in_short_stay_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_in_short_stay_booking(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.check_out_short_stay_booking(p_booking_id UUID)
RETURNS public.short_stay_bookings
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.short_stay_bookings;
BEGIN
  SELECT * INTO v_booking
  FROM public.short_stay_bookings
  WHERE id = p_booking_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF NOT (
    v_booking.guest_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = v_booking.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'manager')
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to check out this booking';
  END IF;

  IF v_booking.status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled bookings cannot be checked out';
  END IF;

  IF v_booking.checked_in_at IS NULL THEN
    RAISE EXCEPTION 'Guest must be checked in before check-out';
  END IF;

  IF v_booking.checked_out_at IS NOT NULL OR v_booking.status = 'completed' THEN
    RAISE EXCEPTION 'Guest is already checked out';
  END IF;

  UPDATE public.short_stay_bookings
  SET
    checked_out_at = NOW(),
    status = 'completed',
    updated_at = NOW()
  WHERE id = p_booking_id
  RETURNING * INTO v_booking;

  RETURN v_booking;
END;
$$;

REVOKE ALL ON FUNCTION public.check_out_short_stay_booking(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_out_short_stay_booking(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_user_auth_session(p_auth_session_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_session_id UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_auth_session_id IS NULL OR length(trim(p_auth_session_id)) = 0 THEN
    RAISE EXCEPTION 'Session id is required';
  END IF;

  BEGIN
    v_session_id := trim(p_auth_session_id)::UUID;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid session id';
  END;

  DELETE FROM auth.sessions
  WHERE user_id = v_uid AND id = v_session_id;

  UPDATE public.user_sessions
  SET revoked_at = NOW()
  WHERE user_id = v_uid
    AND auth_session_id = trim(p_auth_session_id)
    AND revoked_at IS NULL;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_user_auth_session(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_user_auth_session(TEXT) TO authenticated;
