-- BaytMiftah estate operations foundation.
-- This is intentionally separate from marketplace listings and transactions: an estate
-- is managed as a collection of units, with a unit-level sub-ledger and occupancy history.

CREATE TABLE IF NOT EXISTS public.managed_estates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  city TEXT,
  region TEXT,
  country TEXT NOT NULL DEFAULT 'Ghana',
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency) = 3),
  allocation_strategy TEXT NOT NULL DEFAULT 'oldest_due' CHECK (allocation_strategy IN ('oldest_due', 'largest_balance', 'manual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.estate_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  identifier TEXT NOT NULL,
  block TEXT,
  floor TEXT,
  bedrooms INTEGER CHECK (bedrooms IS NULL OR bedrooms >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (estate_id, identifier)
);

CREATE TABLE IF NOT EXISTS public.unit_occupancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.estate_units(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'tenant', 'buyer')),
  start_date DATE NOT NULL,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date IS NULL OR end_date >= start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS estate_unit_current_occupancy_unique
  ON public.unit_occupancies(unit_id, user_id, role) WHERE end_date IS NULL;

CREATE TABLE IF NOT EXISTS public.estate_charge_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  charge_type TEXT NOT NULL CHECK (charge_type IN ('service_charge', 'water', 'rent', 'repair', 'penalty', 'levy', 'other')),
  period TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.unit_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.estate_units(id) ON DELETE RESTRICT,
  occupancy_id UUID REFERENCES public.unit_occupancies(id) ON DELETE RESTRICT,
  charge_run_id UUID REFERENCES public.estate_charge_runs(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('service_charge', 'water', 'rent', 'repair', 'penalty', 'levy', 'reversal', 'other')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor <> 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency) = 3),
  fx_rate_to_ghs NUMERIC(18, 8),
  fx_rate_date DATE,
  due_date DATE NOT NULL,
  period TEXT,
  reversed_charge_id UUID REFERENCES public.unit_charges(id) ON DELETE RESTRICT,
  description TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((fx_rate_to_ghs IS NULL AND fx_rate_date IS NULL) OR (fx_rate_to_ghs > 0 AND fx_rate_date IS NOT NULL)),
  CHECK ((type = 'reversal') = (reversed_charge_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.unit_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.estate_units(id) ON DELETE RESTRICT,
  paid_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency) = 3),
  fx_rate_to_ghs NUMERIC(18, 8),
  fx_rate_date DATE,
  method TEXT NOT NULL CHECK (method IN ('momo', 'card', 'bank_transfer', 'cash')),
  provider_reference TEXT NOT NULL UNIQUE,
  recorded_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  proof_path TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((fx_rate_to_ghs IS NULL AND fx_rate_date IS NULL) OR (fx_rate_to_ghs > 0 AND fx_rate_date IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.unit_payments(id) ON DELETE RESTRICT,
  charge_id UUID NOT NULL REFERENCES public.unit_charges(id) ON DELETE RESTRICT,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payment_id, charge_id)
);

CREATE TABLE IF NOT EXISTS public.estate_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.estate_units(id) ON DELETE SET NULL,
  reported_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'triaged', 'assigned', 'resolved', 'closed', 'reopened')),
  title TEXT NOT NULL,
  description TEXT,
  sla_target_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.estate_issue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.estate_issues(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_json JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public.estate_issue_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.estate_issues(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency) = 3),
  chargeable_to TEXT NOT NULL CHECK (chargeable_to IN ('tenant', 'owner', 'service_charge_fund')),
  charge_id UUID REFERENCES public.unit_charges(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.estate_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  audience_json JSONB NOT NULL DEFAULT '{"type":"all"}'::jsonb,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  channels TEXT[] NOT NULL DEFAULT ARRAY['in_app']::TEXT[] CHECK (channels <@ ARRAY['sms', 'email', 'in_app']::TEXT[]),
  sent_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.estate_notice_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id UUID NOT NULL REFERENCES public.estate_notices(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'email', 'in_app')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'read')),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (notice_id, user_id, channel)
);

CREATE INDEX IF NOT EXISTS estate_units_estate_idx ON public.estate_units(estate_id);
CREATE INDEX IF NOT EXISTS unit_occupancies_unit_idx ON public.unit_occupancies(unit_id, end_date);
CREATE INDEX IF NOT EXISTS unit_charges_unit_due_idx ON public.unit_charges(unit_id, due_date);
CREATE INDEX IF NOT EXISTS unit_payments_unit_received_idx ON public.unit_payments(unit_id, received_at DESC);
CREATE INDEX IF NOT EXISTS payment_allocations_charge_idx ON public.payment_allocations(charge_id);
CREATE INDEX IF NOT EXISTS estate_issues_estate_status_idx ON public.estate_issues(estate_id, status, sla_target_at);
CREATE INDEX IF NOT EXISTS estate_notices_estate_sent_idx ON public.estate_notices(estate_id, sent_at DESC);

CREATE OR REPLACE FUNCTION private.is_estate_staff(target_estate_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.managed_estates estate
    JOIN public.organization_members membership ON membership.organization_id = estate.organization_id
    WHERE estate.id = target_estate_id AND membership.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.can_manage_estate_finance(target_estate_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.managed_estates estate
    JOIN public.organization_members membership ON membership.organization_id = estate.organization_id
    WHERE estate.id = target_estate_id
      AND membership.user_id = auth.uid()
      AND membership.role IN ('owner', 'manager')
  );
$$;

CREATE OR REPLACE FUNCTION private.user_can_access_estate_unit(target_unit_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.unit_occupancies occupancy
    WHERE occupancy.unit_id = target_unit_id
      AND occupancy.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.estate_units unit
    WHERE unit.id = target_unit_id AND private.is_estate_staff(unit.estate_id)
  );
$$;

REVOKE ALL ON FUNCTION private.is_estate_staff(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_manage_estate_finance(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.user_can_access_estate_unit(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_estate_staff(UUID), private.can_manage_estate_finance(UUID), private.user_can_access_estate_unit(UUID) TO authenticated;

ALTER TABLE public.managed_estates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_occupancies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_charge_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_issue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_issue_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_notice_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estate staff can manage estates" ON public.managed_estates FOR ALL
  USING (private.is_estate_staff(id)) WITH CHECK (private.is_estate_staff(id));
CREATE POLICY "Estate users can view units" ON public.estate_units FOR SELECT
  USING (private.user_can_access_estate_unit(id));
CREATE POLICY "Estate staff can manage units" ON public.estate_units FOR ALL
  USING (private.is_estate_staff(estate_id)) WITH CHECK (private.is_estate_staff(estate_id));
CREATE POLICY "Users can view their occupancies" ON public.unit_occupancies FOR SELECT
  USING (user_id = auth.uid() OR private.is_estate_staff((SELECT unit.estate_id FROM public.estate_units unit WHERE unit.id = unit_occupancies.unit_id)));
CREATE POLICY "Estate staff can manage occupancies" ON public.unit_occupancies FOR ALL
  USING (private.is_estate_staff((SELECT unit.estate_id FROM public.estate_units unit WHERE unit.id = unit_occupancies.unit_id)))
  WITH CHECK (private.is_estate_staff((SELECT unit.estate_id FROM public.estate_units unit WHERE unit.id = unit_occupancies.unit_id)));
CREATE POLICY "Estate staff can manage charge runs" ON public.estate_charge_runs FOR ALL
  USING (private.can_manage_estate_finance(estate_id)) WITH CHECK (private.can_manage_estate_finance(estate_id));
CREATE POLICY "Estate users can view charges" ON public.unit_charges FOR SELECT USING (private.user_can_access_estate_unit(unit_id));
CREATE POLICY "Estate finance can create charges" ON public.unit_charges FOR INSERT WITH CHECK (private.can_manage_estate_finance((SELECT unit.estate_id FROM public.estate_units unit WHERE unit.id = unit_charges.unit_id)));
CREATE POLICY "Estate users can view payments" ON public.unit_payments FOR SELECT USING (private.user_can_access_estate_unit(unit_id));
CREATE POLICY "Estate finance can create payments" ON public.unit_payments FOR INSERT WITH CHECK (private.can_manage_estate_finance((SELECT unit.estate_id FROM public.estate_units unit WHERE unit.id = unit_payments.unit_id)));
CREATE POLICY "Estate users can view allocations" ON public.payment_allocations FOR SELECT USING (EXISTS (SELECT 1 FROM public.unit_charges charge WHERE charge.id = payment_allocations.charge_id AND private.user_can_access_estate_unit(charge.unit_id)));
CREATE POLICY "Estate finance can create allocations" ON public.payment_allocations FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.unit_charges charge JOIN public.estate_units unit ON unit.id = charge.unit_id WHERE charge.id = payment_allocations.charge_id AND private.can_manage_estate_finance(unit.estate_id)));
CREATE POLICY "Estate users can view issues" ON public.estate_issues FOR SELECT USING (private.is_estate_staff(estate_id) OR (unit_id IS NOT NULL AND private.user_can_access_estate_unit(unit_id)));
CREATE POLICY "Estate users can report issues" ON public.estate_issues FOR INSERT WITH CHECK (private.is_estate_staff(estate_id) OR (reported_by_user_id = auth.uid() AND unit_id IS NOT NULL AND private.user_can_access_estate_unit(unit_id)));
CREATE POLICY "Estate staff can update issues" ON public.estate_issues FOR UPDATE USING (private.is_estate_staff(estate_id)) WITH CHECK (private.is_estate_staff(estate_id));
CREATE POLICY "Estate users can view issue events" ON public.estate_issue_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.estate_issues issue WHERE issue.id = estate_issue_events.issue_id AND (private.is_estate_staff(issue.estate_id) OR (issue.unit_id IS NOT NULL AND private.user_can_access_estate_unit(issue.unit_id)))));
CREATE POLICY "Estate staff can add issue events" ON public.estate_issue_events FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.estate_issues issue WHERE issue.id = estate_issue_events.issue_id AND private.is_estate_staff(issue.estate_id)));
CREATE POLICY "Estate users can view issue costs" ON public.estate_issue_costs FOR SELECT USING (EXISTS (SELECT 1 FROM public.estate_issues issue WHERE issue.id = estate_issue_costs.issue_id AND (private.is_estate_staff(issue.estate_id) OR (issue.unit_id IS NOT NULL AND private.user_can_access_estate_unit(issue.unit_id)))));
CREATE POLICY "Estate finance can manage issue costs" ON public.estate_issue_costs FOR ALL USING (EXISTS (SELECT 1 FROM public.estate_issues issue WHERE issue.id = estate_issue_costs.issue_id AND private.can_manage_estate_finance(issue.estate_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.estate_issues issue WHERE issue.id = estate_issue_costs.issue_id AND private.can_manage_estate_finance(issue.estate_id)));
CREATE POLICY "Estate staff can manage notices" ON public.estate_notices FOR ALL USING (private.is_estate_staff(estate_id)) WITH CHECK (private.is_estate_staff(estate_id));
CREATE POLICY "Recipients can view notice deliveries" ON public.estate_notice_deliveries FOR SELECT USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.estate_notices notice WHERE notice.id = estate_notice_deliveries.notice_id AND private.is_estate_staff(notice.estate_id)));
CREATE POLICY "Estate staff can manage notice deliveries" ON public.estate_notice_deliveries FOR ALL USING (EXISTS (SELECT 1 FROM public.estate_notices notice WHERE notice.id = estate_notice_deliveries.notice_id AND private.is_estate_staff(notice.estate_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.estate_notices notice WHERE notice.id = estate_notice_deliveries.notice_id AND private.is_estate_staff(notice.estate_id)));

CREATE OR REPLACE FUNCTION public.prevent_estate_ledger_mutation()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Estate ledger entries are immutable; create a reversal or a new allocation instead.';
END;
$$;

-- A payment and all its charge allocations must be written in one transaction.
-- This prevents over-allocation and makes duplicate provider callbacks safe.
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
BEGIN
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
    p_method, p_provider_reference, p_recorded_by_user_id, p_proof_path
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

CREATE TRIGGER unit_charges_immutable BEFORE UPDATE OR DELETE ON public.unit_charges FOR EACH ROW EXECUTE FUNCTION public.prevent_estate_ledger_mutation();
CREATE TRIGGER unit_payments_immutable BEFORE UPDATE OR DELETE ON public.unit_payments FOR EACH ROW EXECUTE FUNCTION public.prevent_estate_ledger_mutation();
CREATE TRIGGER payment_allocations_immutable BEFORE UPDATE OR DELETE ON public.payment_allocations FOR EACH ROW EXECUTE FUNCTION public.prevent_estate_ledger_mutation();

GRANT SELECT, INSERT, UPDATE ON public.managed_estates, public.estate_units, public.unit_occupancies, public.estate_charge_runs, public.unit_charges, public.unit_payments, public.payment_allocations, public.estate_issues, public.estate_issue_events, public.estate_issue_costs, public.estate_notices, public.estate_notice_deliveries TO authenticated;
