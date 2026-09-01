-- Full estate work-order workflow: quotes, approvals, evidence, costs and recurring maintenance.
CREATE TABLE public.estate_work_order_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.estate_work_orders(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency)=3),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','approved','rejected','withdrawn')),
  note TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);
CREATE TABLE public.estate_work_order_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.estate_work_orders(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('photo','video','document')),
  caption TEXT,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.estate_work_order_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.estate_work_orders(id) ON DELETE CASCADE,
  approval_type TEXT NOT NULL CHECK (approval_type IN ('quote','budget','completion','chargeable_cost')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  decided_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ
);
CREATE TABLE public.estate_preventive_maintenance_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  frequency_days INTEGER NOT NULL CHECK (frequency_days > 0),
  next_due_date DATE NOT NULL,
  default_vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX estate_work_order_quotes_order_idx ON public.estate_work_order_quotes(work_order_id);
CREATE INDEX estate_preventive_maintenance_due_idx ON public.estate_preventive_maintenance_plans(estate_id, next_due_date) WHERE active;
ALTER TABLE public.estate_work_order_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_work_order_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_work_order_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_preventive_maintenance_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estate staff manage work-order quotes" ON public.estate_work_order_quotes FOR ALL USING (EXISTS (SELECT 1 FROM public.estate_work_orders w WHERE w.id=estate_work_order_quotes.work_order_id AND private.is_estate_staff(w.estate_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.estate_work_orders w WHERE w.id=estate_work_order_quotes.work_order_id AND private.is_estate_staff(w.estate_id)));
CREATE POLICY "Estate staff manage work-order evidence" ON public.estate_work_order_evidence FOR ALL USING (EXISTS (SELECT 1 FROM public.estate_work_orders w WHERE w.id=estate_work_order_evidence.work_order_id AND private.is_estate_staff(w.estate_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.estate_work_orders w WHERE w.id=estate_work_order_evidence.work_order_id AND private.is_estate_staff(w.estate_id)));
CREATE POLICY "Estate staff manage work-order approvals" ON public.estate_work_order_approvals FOR ALL USING (EXISTS (SELECT 1 FROM public.estate_work_orders w WHERE w.id=estate_work_order_approvals.work_order_id AND private.is_estate_staff(w.estate_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.estate_work_orders w WHERE w.id=estate_work_order_approvals.work_order_id AND private.is_estate_staff(w.estate_id)));
CREATE POLICY "Estate staff manage preventive plans" ON public.estate_preventive_maintenance_plans FOR ALL USING (private.is_estate_staff(estate_id)) WITH CHECK (private.is_estate_staff(estate_id));
GRANT SELECT, INSERT, UPDATE ON public.estate_work_order_quotes, public.estate_work_order_evidence, public.estate_work_order_approvals, public.estate_preventive_maintenance_plans TO authenticated;
