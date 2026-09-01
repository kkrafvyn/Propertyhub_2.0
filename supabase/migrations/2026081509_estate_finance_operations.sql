-- Estate finance operations: bank reconciliation, collection activity and a safe
-- payment-plan generator that turns agreed instalments into immutable charges.

CREATE TABLE public.estate_bank_reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  statement_date DATE NOT NULL,
  opening_balance_minor BIGINT NOT NULL DEFAULT 0,
  closing_balance_minor BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency) = 3),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'closed')),
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE public.estate_reconciliation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reconciliation_id UUID NOT NULL REFERENCES public.estate_bank_reconciliations(id) ON DELETE CASCADE,
  unit_payment_id UUID REFERENCES public.unit_payments(id) ON DELETE SET NULL,
  statement_reference TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  matched BOOLEAN NOT NULL DEFAULT FALSE,
  matched_at TIMESTAMPTZ,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(reconciliation_id, statement_reference)
);

CREATE TABLE public.estate_collection_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.estate_units(id) ON DELETE CASCADE,
  charge_id UUID REFERENCES public.unit_charges(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('reminder', 'call', 'promise_to_pay', 'payment_plan', 'escalation', 'note')),
  channel TEXT CHECK (channel IS NULL OR channel IN ('in_app', 'email', 'sms', 'whatsapp', 'phone')),
  note TEXT,
  promised_amount_minor BIGINT CHECK (promised_amount_minor IS NULL OR promised_amount_minor > 0),
  promised_date DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX estate_reconciliations_estate_idx ON public.estate_bank_reconciliations(estate_id, statement_date DESC);
CREATE INDEX estate_collection_actions_unit_idx ON public.estate_collection_actions(unit_id, created_at DESC);

ALTER TABLE public.estate_bank_reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_reconciliation_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_collection_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estate finance manages reconciliations" ON public.estate_bank_reconciliations FOR ALL
  USING (private.can_manage_estate_finance(estate_id)) WITH CHECK (private.can_manage_estate_finance(estate_id));
CREATE POLICY "Estate finance manages reconciliation lines" ON public.estate_reconciliation_lines FOR ALL
  USING (EXISTS (SELECT 1 FROM public.estate_bank_reconciliations r WHERE r.id = reconciliation_id AND private.can_manage_estate_finance(r.estate_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.estate_bank_reconciliations r WHERE r.id = reconciliation_id AND private.can_manage_estate_finance(r.estate_id)));
CREATE POLICY "Estate finance manages collection actions" ON public.estate_collection_actions FOR ALL
  USING (private.can_manage_estate_finance((SELECT estate_id FROM public.estate_units u WHERE u.id = unit_id)))
  WITH CHECK (private.can_manage_estate_finance((SELECT estate_id FROM public.estate_units u WHERE u.id = unit_id)));

CREATE OR REPLACE FUNCTION public.create_estate_payment_plan(
  p_unit_id UUID,
  p_occupancy_id UUID,
  p_plan_type TEXT,
  p_total_minor BIGINT,
  p_deposit_minor BIGINT,
  p_currency TEXT,
  p_frequency TEXT,
  p_start_date DATE,
  p_installment_count INTEGER,
  p_created_by UUID
)
RETURNS public.estate_payment_plans
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private
AS $$
DECLARE
  unit_estate_id UUID;
  plan_row public.estate_payment_plans;
  installment_amount BIGINT;
  remainder BIGINT;
  installment_index INTEGER;
  due_on DATE;
  charge_row public.unit_charges;
BEGIN
  SELECT estate_id INTO unit_estate_id FROM public.estate_units WHERE id = p_unit_id;
  IF unit_estate_id IS NULL OR NOT private.can_manage_estate_finance(unit_estate_id) THEN RAISE EXCEPTION 'Not authorised to create payment plan'; END IF;
  IF p_total_minor <= 0 OR p_deposit_minor < 0 OR p_deposit_minor > p_total_minor OR p_installment_count < 1 THEN RAISE EXCEPTION 'Invalid payment plan amounts or installment count'; END IF;
  IF p_plan_type NOT IN ('rent', 'sale', 'deposit', 'service_charge', 'other') OR p_frequency NOT IN ('weekly','monthly','quarterly','custom') THEN RAISE EXCEPTION 'Unsupported payment plan type or frequency'; END IF;
  INSERT INTO public.estate_payment_plans (unit_id, occupancy_id, plan_type, total_minor, deposit_minor, currency, frequency, start_date, created_by)
  VALUES (p_unit_id, p_occupancy_id, p_plan_type, p_total_minor, p_deposit_minor, p_currency, p_frequency, p_start_date, p_created_by)
  RETURNING * INTO plan_row;
  installment_amount := (p_total_minor - p_deposit_minor) / p_installment_count;
  remainder := (p_total_minor - p_deposit_minor) % p_installment_count;
  IF p_deposit_minor > 0 THEN
    INSERT INTO public.unit_charges (unit_id, occupancy_id, type, amount_minor, currency, due_date, description, created_by)
    VALUES (p_unit_id, p_occupancy_id, 'other', p_deposit_minor, p_currency, p_start_date, 'Plan deposit', p_created_by)
    RETURNING * INTO charge_row;
    INSERT INTO public.estate_installments (plan_id, installment_number, due_date, amount_minor, status, charge_id)
    VALUES (plan_row.id, 1, p_start_date, p_deposit_minor, 'due', charge_row.id);
  END IF;
  FOR installment_index IN 1..p_installment_count LOOP
    due_on := CASE p_frequency WHEN 'weekly' THEN p_start_date + (installment_index * 7) WHEN 'quarterly' THEN p_start_date + (installment_index * 3 * INTERVAL '1 month') WHEN 'custom' THEN p_start_date + (installment_index * INTERVAL '1 month') ELSE p_start_date + (installment_index * INTERVAL '1 month') END;
    INSERT INTO public.unit_charges (unit_id, occupancy_id, type, amount_minor, currency, due_date, description, created_by)
    VALUES (p_unit_id, p_occupancy_id, CASE WHEN p_plan_type IN ('rent','service_charge') THEN p_plan_type ELSE 'other' END, installment_amount + CASE WHEN installment_index = p_installment_count THEN remainder ELSE 0 END, p_currency, due_on, 'Payment plan installment ' || installment_index, p_created_by)
    RETURNING * INTO charge_row;
    INSERT INTO public.estate_installments (plan_id, installment_number, due_date, amount_minor, status, charge_id)
    VALUES (plan_row.id, installment_index + CASE WHEN p_deposit_minor > 0 THEN 1 ELSE 0 END, due_on, charge_row.amount_minor, 'upcoming', charge_row.id);
  END LOOP;
  RETURN plan_row;
END;
$$;

REVOKE ALL ON FUNCTION public.create_estate_payment_plan(UUID, UUID, TEXT, BIGINT, BIGINT, TEXT, TEXT, DATE, INTEGER, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_estate_payment_plan(UUID, UUID, TEXT, BIGINT, BIGINT, TEXT, TEXT, DATE, INTEGER, UUID) TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.estate_bank_reconciliations, public.estate_reconciliation_lines, public.estate_collection_actions TO authenticated;
