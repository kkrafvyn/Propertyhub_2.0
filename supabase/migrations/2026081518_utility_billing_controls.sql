-- Utilities that are billed from readings need a rate history and an auditable link
-- between a reading and the charge it produced.  This keeps a reading correction from
-- silently creating a duplicate resident charge.
CREATE TABLE public.estate_utility_tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  utility_type TEXT NOT NULL CHECK (utility_type IN ('water','electricity','generator','solar','gas','other')),
  rate_minor_per_unit BIGINT NOT NULL CHECK (rate_minor_per_unit >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency) = 3),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.estate_utility_charge_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_reading_id UUID NOT NULL UNIQUE REFERENCES public.estate_meter_readings(id) ON DELETE RESTRICT,
  previous_meter_reading_id UUID NOT NULL REFERENCES public.estate_meter_readings(id) ON DELETE RESTRICT,
  tariff_id UUID NOT NULL REFERENCES public.estate_utility_tariffs(id) ON DELETE RESTRICT,
  charge_id UUID NOT NULL UNIQUE REFERENCES public.unit_charges(id) ON DELETE RESTRICT,
  consumption NUMERIC(18,3) NOT NULL CHECK (consumption >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX estate_utility_tariffs_lookup_idx ON public.estate_utility_tariffs(estate_id, utility_type, effective_from DESC) WHERE active;
ALTER TABLE public.estate_utility_tariffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_utility_charge_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estate finance manages utility tariffs" ON public.estate_utility_tariffs FOR ALL USING (private.can_manage_estate_finance(estate_id)) WITH CHECK (private.can_manage_estate_finance(estate_id));
CREATE POLICY "Estate finance views utility charges" ON public.estate_utility_charge_records FOR SELECT USING (EXISTS (SELECT 1 FROM public.estate_meter_readings r JOIN public.estate_meters m ON m.id = r.meter_id WHERE r.id = meter_reading_id AND private.can_manage_estate_finance(m.estate_id)));
GRANT SELECT, INSERT, UPDATE ON public.estate_utility_tariffs TO authenticated;
GRANT SELECT ON public.estate_utility_charge_records TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_utility_charge(p_meter_reading_id UUID, p_due_date DATE DEFAULT CURRENT_DATE + 14)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE
  v_reading public.estate_meter_readings%ROWTYPE;
  v_previous public.estate_meter_readings%ROWTYPE;
  v_meter public.estate_meters%ROWTYPE;
  v_tariff public.estate_utility_tariffs%ROWTYPE;
  v_consumption NUMERIC(18,3);
  v_amount BIGINT;
  v_charge_id UUID;
BEGIN
  SELECT * INTO v_reading FROM public.estate_meter_readings WHERE id = p_meter_reading_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Meter reading not found'; END IF;
  SELECT * INTO v_meter FROM public.estate_meters WHERE id = v_reading.meter_id;
  IF v_meter.unit_id IS NULL THEN RAISE EXCEPTION 'Only a unit meter can create a resident utility charge'; END IF;
  IF NOT private.can_manage_estate_finance(v_meter.estate_id) THEN RAISE EXCEPTION 'Not permitted to issue utility charges'; END IF;
  IF EXISTS (SELECT 1 FROM public.estate_utility_charge_records WHERE meter_reading_id = p_meter_reading_id) THEN RAISE EXCEPTION 'A charge has already been issued for this reading'; END IF;
  SELECT * INTO v_previous FROM public.estate_meter_readings
    WHERE meter_id = v_reading.meter_id AND (read_at, created_at) < (v_reading.read_at, v_reading.created_at)
    ORDER BY read_at DESC, created_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'A previous reading is required before billing consumption'; END IF;
  v_consumption := v_reading.reading_value - v_previous.reading_value;
  IF v_consumption < 0 THEN RAISE EXCEPTION 'Reading is below the previous reading; correct the reading before billing'; END IF;
  SELECT * INTO v_tariff FROM public.estate_utility_tariffs
    WHERE estate_id = v_meter.estate_id AND utility_type = v_meter.utility_type AND active AND effective_from <= v_reading.read_at::date
    ORDER BY effective_from DESC, created_at DESC LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'No active tariff applies to this meter reading'; END IF;
  v_amount := ROUND(v_consumption * v_tariff.rate_minor_per_unit)::BIGINT;
  INSERT INTO public.unit_charges(unit_id, type, amount_minor, currency, due_date, description, created_by)
  VALUES (v_meter.unit_id, CASE WHEN v_meter.utility_type = 'water' THEN 'water' ELSE 'other' END, v_amount, v_tariff.currency, p_due_date,
    initcap(v_meter.utility_type) || ' meter ' || v_meter.identifier || ': ' || v_consumption || ' ' || v_meter.unit_of_measure, auth.uid())
  RETURNING id INTO v_charge_id;
  INSERT INTO public.estate_utility_charge_records(meter_reading_id, previous_meter_reading_id, tariff_id, charge_id, consumption)
  VALUES (v_reading.id, v_previous.id, v_tariff.id, v_charge_id, v_consumption);
  RETURN jsonb_build_object('charge_id', v_charge_id, 'consumption', v_consumption, 'amount_minor', v_amount, 'currency', v_tariff.currency);
END;
$$;
REVOKE ALL ON FUNCTION public.issue_utility_charge(UUID, DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_utility_charge(UUID, DATE) TO authenticated;
