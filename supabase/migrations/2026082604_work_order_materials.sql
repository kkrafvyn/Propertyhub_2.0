CREATE TABLE IF NOT EXISTS public.estate_work_order_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES public.estate_work_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity NUMERIC(12,3) NOT NULL CHECK (quantity > 0),
  unit_cost_minor BIGINT NOT NULL CHECK (unit_cost_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency)=3),
  receipt_storage_path TEXT,
  added_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS work_order_materials_order_idx ON public.estate_work_order_materials(work_order_id, created_at);
ALTER TABLE public.estate_work_order_materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estate staff manage work-order materials" ON public.estate_work_order_materials FOR ALL USING (
  EXISTS (SELECT 1 FROM public.estate_work_orders w WHERE w.id=work_order_id AND private.is_estate_staff(w.estate_id))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.estate_work_orders w WHERE w.id=work_order_id AND private.is_estate_staff(w.estate_id))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estate_work_order_materials TO authenticated;

CREATE OR REPLACE FUNCTION public.run_due_preventive_maintenance(p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE plan_row public.estate_preventive_maintenance_plans%ROWTYPE; issue_id UUID; created_count INTEGER := 0;
BEGIN
  FOR plan_row IN SELECT * FROM public.estate_preventive_maintenance_plans WHERE active AND next_due_date <= p_as_of_date ORDER BY next_due_date,id FOR UPDATE SKIP LOCKED LOOP
    INSERT INTO public.estate_issues(estate_id, category, priority, status, title, description)
      VALUES(plan_row.estate_id, 'preventive_maintenance', 'normal', 'reported', plan_row.name, 'Recurring preventive maintenance due for ' || plan_row.category)
      RETURNING id INTO issue_id;
    INSERT INTO public.estate_work_orders(estate_id, issue_id, vendor_id, status, notes, estimated_cost_minor)
      VALUES(plan_row.estate_id, issue_id, plan_row.default_vendor_id, 'open', 'Generated from preventive maintenance plan ' || plan_row.id::TEXT, NULL);
    UPDATE public.estate_preventive_maintenance_plans SET next_due_date = plan_row.next_due_date + plan_row.frequency_days, updated_at = NOW() WHERE id = plan_row.id;
    created_count := created_count + 1;
  END LOOP;
  RETURN created_count;
END;
$$;
REVOKE ALL ON FUNCTION public.run_due_preventive_maintenance(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_due_preventive_maintenance(DATE) TO authenticated;