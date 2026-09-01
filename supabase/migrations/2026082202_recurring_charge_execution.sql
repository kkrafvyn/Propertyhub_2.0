-- Scheduled charge execution: rate schedules remain configuration, while every
-- generated run is retained for finance review and retry-safe operations.
ALTER TABLE public.estate_charge_schedules
  ADD COLUMN IF NOT EXISTS next_run_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS due_offset_days INTEGER NOT NULL DEFAULT 14 CHECK (due_offset_days >= 0),
  ADD COLUMN IF NOT EXISTS last_run_on DATE;

CREATE TABLE public.estate_charge_generation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id UUID NOT NULL REFERENCES public.estate_charge_schedules(id) ON DELETE RESTRICT,
  period TEXT NOT NULL, run_date DATE NOT NULL, due_date DATE NOT NULL,
  generated_count INTEGER NOT NULL DEFAULT 0 CHECK (generated_count >= 0),
  status TEXT NOT NULL CHECK (status IN ('completed','failed')),
  error_message TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(schedule_id, period)
);
CREATE INDEX estate_charge_generation_schedule_idx ON public.estate_charge_generation_log(schedule_id, run_date DESC);
ALTER TABLE public.estate_charge_generation_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estate finance reads generation history" ON public.estate_charge_generation_log FOR SELECT USING (EXISTS (SELECT 1 FROM public.estate_charge_schedules s WHERE s.id=schedule_id AND private.can_manage_estate_finance(s.estate_id)));
GRANT SELECT ON public.estate_charge_generation_log TO authenticated;

CREATE OR REPLACE FUNCTION public.run_due_estate_charge_schedules(p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,private AS $$
DECLARE s public.estate_charge_schedules%ROWTYPE; v_run public.estate_charge_runs%ROWTYPE;
  v_period TEXT; v_due_date DATE; v_count INTEGER; v_total INTEGER := 0; v_next DATE;
BEGIN
  FOR s IN SELECT * FROM public.estate_charge_schedules WHERE active AND next_run_on <= p_as_of_date ORDER BY next_run_on,id FOR UPDATE SKIP LOCKED LOOP
    v_period := CASE s.frequency WHEN 'monthly' THEN to_char(s.next_run_on,'YYYY-MM') WHEN 'quarterly' THEN to_char(s.next_run_on,'YYYY') || '-Q' || extract(quarter from s.next_run_on)::TEXT WHEN 'annual' THEN to_char(s.next_run_on,'YYYY') ELSE to_char(s.next_run_on,'YYYY-MM-DD') END;
    v_due_date := s.next_run_on + s.due_offset_days;
    BEGIN
      INSERT INTO public.estate_charge_runs(estate_id,name,charge_type,period,created_by) VALUES(s.estate_id,s.name,s.type,v_period,NULL) RETURNING * INTO v_run;
      WITH candidate_units AS (
        SELECT u.id unit_id,(SELECT o.id FROM public.unit_occupancies o WHERE o.unit_id=u.id AND (s.occupancy_role IS NULL OR o.role=s.occupancy_role) AND o.start_date<=v_due_date AND (o.end_date IS NULL OR o.end_date>=v_due_date) ORDER BY o.start_date DESC LIMIT 1) occupancy_id
        FROM public.estate_units u WHERE u.estate_id=s.estate_id AND u.status='active'
      )
      INSERT INTO public.unit_charges(unit_id,occupancy_id,charge_run_id,schedule_id,type,amount_minor,currency,due_date,period,description,created_by)
        SELECT unit_id,occupancy_id,v_run.id,s.id,s.type,s.amount_minor,s.currency,v_due_date,v_period,s.description,NULL FROM candidate_units
        WHERE s.occupancy_role IS NULL OR occupancy_id IS NOT NULL ON CONFLICT (schedule_id,unit_id,period) WHERE schedule_id IS NOT NULL DO NOTHING;
      GET DIAGNOSTICS v_count = ROW_COUNT;
      INSERT INTO public.estate_charge_generation_log(schedule_id,period,run_date,due_date,generated_count,status) VALUES(s.id,v_period,s.next_run_on,v_due_date,v_count,'completed');
      v_next := CASE s.frequency WHEN 'monthly' THEN (s.next_run_on + INTERVAL '1 month')::DATE WHEN 'quarterly' THEN (s.next_run_on + INTERVAL '3 months')::DATE WHEN 'annual' THEN (s.next_run_on + INTERVAL '1 year')::DATE ELSE NULL END;
      UPDATE public.estate_charge_schedules SET last_run_on=s.next_run_on,next_run_on=COALESCE(v_next,s.next_run_on),active=CASE WHEN s.frequency='one_off' THEN FALSE ELSE active END,updated_at=NOW() WHERE id=s.id;
      v_total := v_total + v_count;
    EXCEPTION WHEN OTHERS THEN
      INSERT INTO public.estate_charge_generation_log(schedule_id,period,run_date,due_date,status,error_message) VALUES(s.id,v_period,s.next_run_on,v_due_date,'failed',SQLERRM) ON CONFLICT(schedule_id,period) DO UPDATE SET status='failed',error_message=EXCLUDED.error_message;
    END;
  END LOOP;
  RETURN v_total;
END; $$;
REVOKE ALL ON FUNCTION public.run_due_estate_charge_schedules(DATE) FROM PUBLIC;
