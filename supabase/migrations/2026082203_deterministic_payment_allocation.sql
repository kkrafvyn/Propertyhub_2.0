-- Allocate a payment deterministically using the estate policy. Manual allocation
-- remains available through record_estate_payment for finance-approved overrides.
CREATE OR REPLACE FUNCTION public.record_estate_payment_auto_allocate(
  p_unit_id UUID, p_paid_by_user_id UUID, p_amount_minor BIGINT, p_currency TEXT,
  p_method TEXT, p_provider_reference TEXT, p_recorded_by_user_id UUID,
  p_proof_path TEXT DEFAULT NULL, p_fx_rate_to_ghs NUMERIC DEFAULT NULL, p_fx_rate_date DATE DEFAULT NULL
)
RETURNS public.unit_payments LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE v_estate_id UUID; v_strategy TEXT; v_allocations JSONB; v_payment public.unit_payments;
BEGIN
  SELECT e.id,e.allocation_strategy INTO v_estate_id,v_strategy FROM public.estate_units u JOIN public.managed_estates e ON e.id=u.estate_id WHERE u.id=p_unit_id;
  IF v_estate_id IS NULL THEN RAISE EXCEPTION 'Estate unit not found'; END IF;
  IF NOT private.can_manage_estate_finance(v_estate_id) THEN RAISE EXCEPTION 'Not authorised to record estate payments'; END IF;
  WITH open_charges AS (
    SELECT c.id,c.due_date,c.amount_minor-COALESCE(SUM(a.amount_minor),0) outstanding
    FROM public.unit_charges c LEFT JOIN public.payment_allocations a ON a.charge_id=c.id
    WHERE c.unit_id=p_unit_id AND c.currency=upper(p_currency) GROUP BY c.id,c.due_date,c.amount_minor HAVING c.amount_minor-COALESCE(SUM(a.amount_minor),0)>0
  ), ranked AS (
    SELECT *, SUM(outstanding) OVER (ORDER BY CASE WHEN v_strategy='largest_balance' THEN outstanding END DESC, due_date, id) running_total
    FROM open_charges
  ), allocation_rows AS (
    SELECT id,LEAST(outstanding,GREATEST(0,p_amount_minor-(running_total-outstanding))) allocated FROM ranked WHERE running_total-outstanding < p_amount_minor
  ) SELECT jsonb_agg(jsonb_build_object('charge_id',id,'amount_minor',allocated)) INTO v_allocations FROM allocation_rows WHERE allocated>0;
  IF v_allocations IS NULL THEN RAISE EXCEPTION 'No outstanding charges are available for automatic allocation'; END IF;
  SELECT * INTO v_payment FROM public.record_estate_payment(p_unit_id,p_paid_by_user_id,p_amount_minor,p_currency,p_method,p_provider_reference,p_recorded_by_user_id,p_proof_path,p_fx_rate_to_ghs,p_fx_rate_date,v_allocations);
  RETURN v_payment;
END; $$;
REVOKE ALL ON FUNCTION public.record_estate_payment_auto_allocate(UUID,UUID,BIGINT,TEXT,TEXT,TEXT,UUID,TEXT,NUMERIC,DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_estate_payment_auto_allocate(UUID,UUID,BIGINT,TEXT,TEXT,TEXT,UUID,TEXT,NUMERIC,DATE) TO authenticated;
