-- Admin-configurable revenue rule fee calculation (used by escrow release and server-side flows).

CREATE OR REPLACE FUNCTION public.calculate_revenue_rule_fee_minor(
  p_rule_key TEXT,
  p_base_minor BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule_row public.revenue_rules%ROWTYPE;
  fee_minor BIGINT;
  fee_value NUMERIC;
BEGIN
  IF p_base_minor IS NULL OR p_base_minor <= 0 THEN
    RETURN 0;
  END IF;

  SELECT * INTO rule_row
  FROM public.revenue_rules
  WHERE rule_key = p_rule_key
    AND enabled = TRUE
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  IF rule_row.effective_from IS NOT NULL AND rule_row.effective_from > NOW() THEN
    RETURN 0;
  END IF;

  IF rule_row.effective_until IS NOT NULL AND rule_row.effective_until < NOW() THEN
    RETURN 0;
  END IF;

  fee_value := COALESCE(rule_row.fee_value, 0);

  IF rule_row.fee_type = 'percentage' THEN
    fee_minor := ROUND(p_base_minor * (fee_value / 100.0));
  ELSIF rule_row.fee_type = 'fixed' THEN
    fee_minor := ROUND(fee_value * 100);
  ELSE
    fee_minor := 0;
  END IF;

  IF rule_row.min_fee IS NOT NULL THEN
    fee_minor := GREATEST(fee_minor, ROUND(rule_row.min_fee * 100));
  END IF;

  IF rule_row.max_fee IS NOT NULL THEN
    fee_minor := LEAST(fee_minor, ROUND(rule_row.max_fee * 100));
  END IF;

  RETURN GREATEST(0, fee_minor);
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_revenue_rule_fee_minor(TEXT, BIGINT) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.release_escrow_hold(
  p_hold_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS public.escrow_holds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hold_row public.escrow_holds;
  wallet_row public.user_wallets;
  platform_fee_minor BIGINT;
  net_minor BIGINT;
BEGIN
  SELECT * INTO hold_row
  FROM public.escrow_holds
  WHERE id = p_hold_id
  FOR UPDATE;

  IF hold_row IS NULL THEN
    RAISE EXCEPTION 'Escrow hold not found';
  END IF;

  IF hold_row.status <> 'held' THEN
    RAISE EXCEPTION 'Escrow hold is not releasable';
  END IF;

  IF NOT public.is_platform_admin() AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = hold_row.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'Not authorized to release this escrow hold';
  END IF;

  platform_fee_minor := public.calculate_revenue_rule_fee_minor('escrow_fee', hold_row.amount_minor);
  IF platform_fee_minor <= 0 THEN
    platform_fee_minor := public.calculate_revenue_rule_fee_minor('transaction_fee', hold_row.amount_minor);
  END IF;

  net_minor := hold_row.amount_minor - platform_fee_minor;

  UPDATE public.escrow_holds
  SET status = 'released',
      release_note = COALESCE(p_note, release_note),
      released_at = NOW(),
      updated_at = NOW()
  WHERE id = p_hold_id
  RETURNING * INTO hold_row;

  SELECT * INTO wallet_row
  FROM public.user_wallets
  WHERE user_id = hold_row.payer_user_id
    AND currency = hold_row.currency
  FOR UPDATE;

  IF wallet_row.id IS NOT NULL THEN
    UPDATE public.user_wallets
    SET pending_minor = GREATEST(0, wallet_row.pending_minor - hold_row.amount_minor),
        updated_at = NOW()
    WHERE id = wallet_row.id;

    INSERT INTO public.wallet_ledger (
      wallet_id,
      entry_type,
      amount_minor,
      balance_available_minor,
      balance_pending_minor,
      reference_type,
      reference_id,
      description
    )
    VALUES (
      wallet_row.id,
      'release',
      hold_row.amount_minor,
      wallet_row.available_minor,
      GREATEST(0, wallet_row.pending_minor - hold_row.amount_minor),
      'escrow_hold',
      hold_row.id,
      'Escrow released to organization'
    );
  END IF;

  PERFORM public.credit_organization_wallet(
    hold_row.organization_id,
    net_minor,
    hold_row.currency,
    'escrow_hold',
    hold_row.id,
    'Escrow released to organization wallet',
    'release'
  );

  RETURN hold_row;
END;
$$;

COMMENT ON FUNCTION public.calculate_revenue_rule_fee_minor(TEXT, BIGINT)
IS 'Calculates platform fee minor units from enabled revenue_rules (admin-configured).';
