-- Explicit multi-owner shares and reviewable distribution approvals.
CREATE TABLE IF NOT EXISTS public.estate_unit_owner_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES public.estate_units(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ownership_percent NUMERIC(7,4) NOT NULL CHECK (ownership_percent > 0 AND ownership_percent <= 100),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  UNIQUE (unit_id, owner_user_id, effective_from)
);

CREATE TABLE IF NOT EXISTS public.estate_distribution_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_run_id UUID NOT NULL REFERENCES public.estate_owner_statement_runs(id) ON DELETE CASCADE,
  requested_amount_minor BIGINT NOT NULL CHECK (requested_amount_minor >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','paid')),
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  review_note TEXT,
  payout_reference TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS unit_owner_shares_unit_idx ON public.estate_unit_owner_shares(unit_id, effective_from);
CREATE INDEX IF NOT EXISTS distribution_approvals_statement_idx ON public.estate_distribution_approvals(statement_run_id, status);

ALTER TABLE public.estate_unit_owner_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_distribution_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners and staff view unit shares" ON public.estate_unit_owner_shares FOR SELECT USING (
  owner_user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.estate_units u WHERE u.id = unit_id AND private.is_estate_staff(u.estate_id))
);
CREATE POLICY "Finance manages distribution approvals" ON public.estate_distribution_approvals FOR ALL USING (
  EXISTS (SELECT 1 FROM public.estate_owner_statement_runs s WHERE s.id = statement_run_id AND private.can_manage_estate_finance(s.estate_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.estate_owner_statement_runs s WHERE s.id = statement_run_id AND private.can_manage_estate_finance(s.estate_id))
);
GRANT SELECT ON public.estate_unit_owner_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.estate_distribution_approvals TO authenticated;

CREATE OR REPLACE FUNCTION public.validate_unit_owner_share_total()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE share_total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(ownership_percent), 0) INTO share_total
  FROM public.estate_unit_owner_shares
  WHERE unit_id = NEW.unit_id AND effective_to IS NULL AND id <> COALESCE(NEW.id, gen_random_uuid());
  IF share_total + NEW.ownership_percent > 100 THEN
    RAISE EXCEPTION 'Active ownership shares for a unit cannot exceed 100 percent';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS validate_unit_owner_share_total ON public.estate_unit_owner_shares;
CREATE TRIGGER validate_unit_owner_share_total BEFORE INSERT OR UPDATE ON public.estate_unit_owner_shares FOR EACH ROW EXECUTE FUNCTION public.validate_unit_owner_share_total();