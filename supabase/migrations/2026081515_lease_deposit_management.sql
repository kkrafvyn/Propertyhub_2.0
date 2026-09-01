CREATE TABLE public.lease_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE, amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  deductions_minor BIGINT NOT NULL DEFAULT 0 CHECK (deductions_minor >= 0 AND deductions_minor <= amount_minor), refunded_minor BIGINT NOT NULL DEFAULT 0 CHECK (refunded_minor >= 0 AND refunded_minor <= amount_minor), currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency)=3),
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held','partially_refunded','refunded','forfeited')), deduction_reason TEXT, evidence_path TEXT, recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(lease_id)
);
ALTER TABLE public.lease_deposits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lease parties view deposits" ON public.lease_deposits FOR SELECT USING (EXISTS(SELECT 1 FROM public.leases l WHERE l.id=lease_id AND (l.tenant_user_id=auth.uid() OR EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=l.organization_id AND m.user_id=auth.uid()))));
CREATE POLICY "Organization managers manage deposits" ON public.lease_deposits FOR ALL USING (EXISTS(SELECT 1 FROM public.leases l JOIN public.organization_members m ON m.organization_id=l.organization_id WHERE l.id=lease_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager'))) WITH CHECK (EXISTS(SELECT 1 FROM public.leases l JOIN public.organization_members m ON m.organization_id=l.organization_id WHERE l.id=lease_id AND m.user_id=auth.uid() AND m.role IN ('owner','manager')));
GRANT SELECT, INSERT, UPDATE ON public.lease_deposits TO authenticated;
