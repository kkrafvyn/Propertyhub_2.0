-- Deposits and structured installment plans sit above the immutable unit ledger.
CREATE TABLE public.estate_payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.estate_units(id) ON DELETE CASCADE,
  occupancy_id UUID REFERENCES public.unit_occupancies(id) ON DELETE SET NULL,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('rent', 'sale', 'deposit', 'service_charge', 'other')),
  total_minor BIGINT NOT NULL CHECK (total_minor > 0),
  deposit_minor BIGINT NOT NULL DEFAULT 0 CHECK (deposit_minor >= 0 AND deposit_minor <= total_minor),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency)=3),
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly','monthly','quarterly','custom')),
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','completed','cancelled')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.estate_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.estate_payment_plans(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL CHECK (installment_number > 0),
  due_date DATE NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','due','partially_paid','paid','overdue','waived','cancelled')),
  charge_id UUID REFERENCES public.unit_charges(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id, installment_number)
);
CREATE INDEX estate_payment_plans_unit_idx ON public.estate_payment_plans(unit_id, status);
CREATE INDEX estate_installments_due_idx ON public.estate_installments(due_date, status);
ALTER TABLE public.estate_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_installments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estate users view payment plans" ON public.estate_payment_plans FOR SELECT USING (private.user_can_access_estate_unit(unit_id));
CREATE POLICY "Estate finance manages payment plans" ON public.estate_payment_plans FOR ALL USING (private.can_manage_estate_finance((SELECT u.estate_id FROM public.estate_units u WHERE u.id=estate_payment_plans.unit_id))) WITH CHECK (private.can_manage_estate_finance((SELECT u.estate_id FROM public.estate_units u WHERE u.id=estate_payment_plans.unit_id)));
CREATE POLICY "Estate users view installments" ON public.estate_installments FOR SELECT USING (EXISTS (SELECT 1 FROM public.estate_payment_plans p WHERE p.id=estate_installments.plan_id AND private.user_can_access_estate_unit(p.unit_id)));
CREATE POLICY "Estate finance manages installments" ON public.estate_installments FOR ALL USING (EXISTS (SELECT 1 FROM public.estate_payment_plans p JOIN public.estate_units u ON u.id=p.unit_id WHERE p.id=estate_installments.plan_id AND private.can_manage_estate_finance(u.estate_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.estate_payment_plans p JOIN public.estate_units u ON u.id=p.unit_id WHERE p.id=estate_installments.plan_id AND private.can_manage_estate_finance(u.estate_id)));
GRANT SELECT, INSERT, UPDATE ON public.estate_payment_plans, public.estate_installments TO authenticated;
