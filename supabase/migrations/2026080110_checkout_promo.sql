-- Checkout promo validation (server-side, no promo table enumeration)

CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code TEXT,
  p_purpose TEXT DEFAULT 'any',
  p_amount_minor BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  promo public.promo_codes%ROWTYPE;
  discount_minor BIGINT := 0;
  amount_minor BIGINT := GREATEST(0, COALESCE(p_amount_minor, 0));
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Promo code is required');
  END IF;

  SELECT * INTO promo
  FROM public.promo_codes
  WHERE upper(code) = upper(trim(p_code))
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR uses_count < max_uses);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired promo code');
  END IF;

  IF promo.applies_to <> 'any' AND promo.applies_to <> COALESCE(NULLIF(trim(p_purpose), ''), 'any') THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Promo code does not apply to this payment');
  END IF;

  IF promo.discount_type = 'percentage' THEN
    discount_minor := round(amount_minor * promo.discount_value / 100.0);
  ELSE
    discount_minor := round(promo.discount_value * 100);
  END IF;

  discount_minor := LEAST(discount_minor, amount_minor);

  RETURN jsonb_build_object(
    'valid', true,
    'code', promo.code,
    'label', promo.label,
    'discount_type', promo.discount_type,
    'discount_value', promo.discount_value,
    'discount_minor', discount_minor,
    'promo_id', promo.id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.validate_promo_code(TEXT, TEXT, BIGINT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(TEXT, TEXT, BIGINT) TO authenticated;

INSERT INTO public.promo_codes (code, label, discount_type, discount_value, applies_to, max_uses, expires_at, is_active)
VALUES
  ('BAYT10', '10% off property checkout', 'percentage', 10, 'any', NULL, '2027-12-31T23:59:59Z', TRUE)
ON CONFLICT (code) DO NOTHING;
