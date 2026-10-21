-- Workflow consistency: host booking mode enforcement, enquiry case type, offer metadata, deal lineage

ALTER TABLE public.deal_cases
  ADD COLUMN IF NOT EXISTS source_deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL;

ALTER TABLE public.deal_cases DROP CONSTRAINT IF EXISTS deal_cases_case_type_check;
ALTER TABLE public.deal_cases
  ADD CONSTRAINT deal_cases_case_type_check
  CHECK (case_type IN (
    'rental_application',
    'lease_application',
    'purchase_offer',
    'property_inquiry'
  ));

ALTER TABLE public.deal_case_counter_offers
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS conditions TEXT;

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
  v_host_mode TEXT;
  v_effective_mode TEXT;
BEGIN
  IF v_guest IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF p_check_in IS NULL OR p_check_out IS NULL OR p_check_out <= p_check_in
     OR p_check_in < CURRENT_DATE OR p_check_out > CURRENT_DATE + 730 THEN
    RAISE EXCEPTION 'Invalid booking dates';
  END IF;

  SELECT COALESCE(h.booking_mode, 'instant')
  INTO v_host_mode
  FROM public.host_listing_settings h
  WHERE h.listing_id = p_listing_id;

  IF v_host_mode IS NULL THEN
    v_host_mode := 'instant';
  END IF;

  IF v_host_mode NOT IN ('instant', 'request') THEN
    v_host_mode := 'instant';
  END IF;

  v_effective_mode := v_host_mode;

  IF p_booking_mode IS NOT NULL AND p_booking_mode <> v_effective_mode THEN
    RAISE EXCEPTION 'Booking mode does not match host settings';
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
    'pending', LEFT(p_guest_note, 2000), v_effective_mode
  ) RETURNING id INTO v_booking_id;
  RETURN v_booking_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_short_stay_booking(UUID, DATE, DATE, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_short_stay_booking(UUID, DATE, DATE, TEXT, TEXT, TEXT) TO authenticated;
