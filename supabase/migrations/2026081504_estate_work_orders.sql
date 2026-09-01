-- Work orders connect estate issues to accountable staff/vendors and repair cost tracking.

CREATE TABLE public.estate_work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.estate_issues(id) ON DELETE CASCADE,
  estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'scheduled', 'in_progress', 'completed', 'cancelled')),
  scheduled_for TIMESTAMPTZ,
  estimated_cost_minor BIGINT CHECK (estimated_cost_minor IS NULL OR estimated_cost_minor >= 0),
  actual_cost_minor BIGINT CHECK (actual_cost_minor IS NULL OR actual_cost_minor >= 0),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (issue_id)
);

CREATE INDEX estate_work_orders_estate_status_idx ON public.estate_work_orders(estate_id, status, scheduled_for);
ALTER TABLE public.estate_work_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estate staff can manage work orders" ON public.estate_work_orders FOR ALL
USING (private.is_estate_staff(estate_id))
WITH CHECK (private.is_estate_staff(estate_id));

CREATE POLICY "Estate residents can view their unit work orders" ON public.estate_work_orders FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.estate_issues issue
  WHERE issue.id = estate_work_orders.issue_id
    AND issue.unit_id IS NOT NULL
    AND private.user_can_access_estate_unit(issue.unit_id)
));

GRANT SELECT, INSERT, UPDATE ON public.estate_work_orders TO authenticated;
