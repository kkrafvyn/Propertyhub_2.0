CREATE TABLE public.estate_vendor_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE, vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.estate_work_orders(id) ON DELETE SET NULL, bill_number TEXT NOT NULL, description TEXT, amount_minor BIGINT NOT NULL CHECK (amount_minor > 0), currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency)=3), due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','approved','paid','void')), approved_by UUID REFERENCES public.users(id) ON DELETE SET NULL, paid_at TIMESTAMPTZ, created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(estate_id,bill_number)
);
ALTER TABLE public.estate_vendor_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estate finance manages vendor bills" ON public.estate_vendor_bills FOR ALL USING (private.can_manage_estate_finance(estate_id)) WITH CHECK (private.can_manage_estate_finance(estate_id));
GRANT SELECT, INSERT, UPDATE ON public.estate_vendor_bills TO authenticated;
