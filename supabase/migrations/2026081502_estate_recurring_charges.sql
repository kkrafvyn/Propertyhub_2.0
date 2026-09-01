-- Configurable estate charges: service charges, rent, water estimates, levies, and penalties.
-- Generated rows remain immutable unit_charges; a schedule only defines future runs.

CREATE TABLE public.estate_charge_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('service_charge', 'water', 'rent', 'penalty', 'levy', 'other')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency) = 3),
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'annual', 'one_off')),
  occupancy_role TEXT CHECK (occupancy_role IN ('owner', 'tenant', 'buyer')),
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.unit_charges
  ADD COLUMN schedule_id UUID REFERENCES public.estate_charge_schedules(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX unit_charges_schedule_period_unique
  ON public.unit_charges(schedule_id, unit_id, period)
  WHERE schedule_id IS NOT NULL;
CREATE INDEX estate_charge_schedules_estate_idx ON public.estate_charge_schedules(estate_id, active);

ALTER TABLE public.estate_charge_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Estate finance can manage charge schedules"
ON public.estate_charge_schedules FOR ALL
USING (private.can_manage_estate_finance(estate_id))
WITH CHECK (private.can_manage_estate_finance(estate_id));

CREATE OR REPLACE FUNCTION public.run_estate_charge_schedule(
  p_schedule_id UUID,
  p_period TEXT,
  p_due_date DATE,
  p_created_by UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  schedule_row public.estate_charge_schedules;
  run_row public.estate_charge_runs;
  inserted_count INTEGER;
BEGIN
  SELECT * INTO schedule_row FROM public.estate_charge_schedules WHERE id = p_schedule_id AND active = TRUE;
  IF schedule_row.id IS NULL THEN
    RAISE EXCEPTION 'Active charge schedule not found';
  END IF;
  IF NOT private.can_manage_estate_finance(schedule_row.estate_id) THEN
    RAISE EXCEPTION 'Not authorised to run this charge schedule';
  END IF;
  IF p_period IS NULL OR length(trim(p_period)) = 0 OR p_due_date IS NULL THEN
    RAISE EXCEPTION 'A charge period and due date are required';
  END IF;

  INSERT INTO public.estate_charge_runs (estate_id, name, charge_type, period, created_by)
  VALUES (schedule_row.estate_id, schedule_row.name, schedule_row.type, p_period, p_created_by)
  RETURNING * INTO run_row;

  WITH candidate_units AS (
    SELECT unit.id AS unit_id,
      (
        SELECT occupancy.id
        FROM public.unit_occupancies occupancy
        WHERE occupancy.unit_id = unit.id
          AND (schedule_row.occupancy_role IS NULL OR occupancy.role = schedule_row.occupancy_role)
          AND occupancy.start_date <= p_due_date
          AND (occupancy.end_date IS NULL OR occupancy.end_date >= p_due_date)
        ORDER BY occupancy.start_date DESC
        LIMIT 1
      ) AS occupancy_id
    FROM public.estate_units unit
    WHERE unit.estate_id = schedule_row.estate_id AND unit.status = 'active'
  )
  INSERT INTO public.unit_charges (
    unit_id, occupancy_id, charge_run_id, schedule_id, type, amount_minor, currency,
    due_date, period, description, created_by
  )
  SELECT unit_id, occupancy_id, run_row.id, schedule_row.id, schedule_row.type,
    schedule_row.amount_minor, schedule_row.currency, p_due_date, p_period,
    schedule_row.description, p_created_by
  FROM candidate_units
  WHERE schedule_row.occupancy_role IS NULL OR occupancy_id IS NOT NULL
  ON CONFLICT (schedule_id, unit_id, period) WHERE schedule_id IS NOT NULL DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

REVOKE ALL ON FUNCTION public.run_estate_charge_schedule(UUID, TEXT, DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_estate_charge_schedule(UUID, TEXT, DATE, UUID) TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.estate_charge_schedules TO authenticated;
