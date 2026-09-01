-- Migration: Utility Sub-Metering & Generator Fuel Split Engine
-- Backs src/lib/utility-submeter.service.ts and UtilitySubmetering.tsx
-- All monetary values stored as GHS pesewas (minor units × 100).

-- ─────────────────────────────────────────────
-- 1. Meter Registry
-- ─────────────────────────────────────────────
CREATE TABLE public.estate_utility_meters (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id        UUID        NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  unit_id          UUID        REFERENCES public.estate_units(id) ON DELETE SET NULL,
  meter_type       TEXT        NOT NULL CHECK (meter_type IN ('ecg_electricity','gwcl_water','generator')),
  serial_number    TEXT        NOT NULL,
  label            TEXT,                          -- e.g. "Block A Meter 01"
  tariff_band      TEXT        CHECK (tariff_band IN ('lifeline','standard','estate')),
  installation_date DATE,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (estate_id, serial_number)
);

-- ─────────────────────────────────────────────
-- 2. Meter Readings
-- ─────────────────────────────────────────────
-- This is deliberately separate from estate_meter_readings, which records the
-- general estate-meter workflow. Sub-metering needs prior/current readings and
-- invoice evidence without changing that established operational ledger.
CREATE TABLE public.estate_utility_meter_readings (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  meter_id          UUID        NOT NULL REFERENCES public.estate_utility_meters(id) ON DELETE CASCADE,
  reading_date      DATE        NOT NULL DEFAULT CURRENT_DATE,
  previous_reading  NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (previous_reading >= 0),
  current_reading   NUMERIC(12,3) NOT NULL CHECK (current_reading >= 0),
  units_consumed    NUMERIC(12,3) GENERATED ALWAYS AS (current_reading - previous_reading) STORED,
  photo_url         TEXT,                          -- OCR evidence image in storage
  ocr_confidence    NUMERIC(5,2) CHECK (ocr_confidence BETWEEN 0 AND 100),
  recorded_by       UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (meter_id, reading_date)
);

-- ─────────────────────────────────────────────
-- 3. Utility Invoices
-- ─────────────────────────────────────────────
CREATE TABLE public.estate_utility_invoices (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  reading_id          UUID        NOT NULL REFERENCES public.estate_utility_meter_readings(id) ON DELETE RESTRICT,
  meter_id            UUID        NOT NULL REFERENCES public.estate_utility_meters(id) ON DELETE RESTRICT,
  unit_id             UUID        REFERENCES public.estate_units(id) ON DELETE SET NULL,
  billing_period_start DATE       NOT NULL,
  billing_period_end   DATE       NOT NULL,
  units_consumed      NUMERIC(12,3) NOT NULL CHECK (units_consumed >= 0),
  rate_ghs_per_unit   NUMERIC(10,4) NOT NULL CHECK (rate_ghs_per_unit > 0),
  amount_pesewas      BIGINT      NOT NULL CHECK (amount_pesewas > 0),
  -- dispatch
  momo_dispatch_status TEXT       NOT NULL DEFAULT 'pending'
                        CHECK (momo_dispatch_status IN ('pending','dispatched','paid','failed','waived')),
  momo_reference       TEXT,
  dispatched_at        TIMESTAMPTZ,
  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 4. Generator Run Log
-- ─────────────────────────────────────────────
CREATE TABLE public.estate_generator_runs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id           UUID        NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  run_date            DATE        NOT NULL DEFAULT CURRENT_DATE,
  runtime_hours       NUMERIC(6,2) NOT NULL CHECK (runtime_hours > 0),
  litres_consumed     NUMERIC(10,3) NOT NULL CHECK (litres_consumed > 0),
  cost_per_litre_ghs  NUMERIC(8,4) NOT NULL CHECK (cost_per_litre_ghs > 0),
  total_cost_pesewas  BIGINT      NOT NULL CHECK (total_cost_pesewas > 0),
  occupied_units      INTEGER     NOT NULL CHECK (occupied_units > 0),
  cost_per_unit_pesewas BIGINT    NOT NULL CHECK (cost_per_unit_pesewas > 0),
  notes               TEXT,
  recorded_by         UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Generator cost allocations per unit
CREATE TABLE public.estate_generator_unit_splits (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id          UUID    NOT NULL REFERENCES public.estate_generator_runs(id) ON DELETE CASCADE,
  unit_id         UUID    NOT NULL REFERENCES public.estate_units(id) ON DELETE RESTRICT,
  share_pesewas   BIGINT  NOT NULL CHECK (share_pesewas > 0),
  momo_status     TEXT    NOT NULL DEFAULT 'pending'
                   CHECK (momo_status IN ('pending','dispatched','paid','failed','waived')),
  momo_reference  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (run_id, unit_id)
);

-- ─────────────────────────────────────────────
-- 5. Indexes
-- ─────────────────────────────────────────────
CREATE INDEX estate_utility_meters_estate_idx  ON public.estate_utility_meters(estate_id);
CREATE INDEX estate_utility_meter_readings_meter_idx ON public.estate_utility_meter_readings(meter_id, reading_date DESC);
CREATE INDEX estate_utility_invoices_unit_idx  ON public.estate_utility_invoices(unit_id, billing_period_end DESC);
CREATE INDEX estate_generator_runs_estate_idx  ON public.estate_generator_runs(estate_id, run_date DESC);

-- ─────────────────────────────────────────────
-- 6. RLS
-- ─────────────────────────────────────────────
ALTER TABLE public.estate_utility_meters      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_utility_meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_utility_invoices    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_generator_runs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_generator_unit_splits ENABLE ROW LEVEL SECURITY;

-- Estate staff: full CRUD
CREATE POLICY "Staff manage utility meters"
  ON public.estate_utility_meters FOR ALL
  USING (private.is_estate_staff(estate_id))
  WITH CHECK (private.is_estate_staff(estate_id));

CREATE POLICY "Staff manage meter readings"
  ON public.estate_utility_meter_readings FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.estate_utility_meters m
    WHERE m.id = meter_id AND private.is_estate_staff(m.estate_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.estate_utility_meters m
    WHERE m.id = meter_id AND private.is_estate_staff(m.estate_id)
  ));

CREATE POLICY "Staff manage utility invoices"
  ON public.estate_utility_invoices FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.estate_utility_meters m
    WHERE m.id = meter_id AND private.is_estate_staff(m.estate_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.estate_utility_meters m
    WHERE m.id = meter_id AND private.is_estate_staff(m.estate_id)
  ));

-- Tenants: read own-unit invoices
CREATE POLICY "Tenant reads own utility invoices"
  ON public.estate_utility_invoices FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.estate_units u
    JOIN public.unit_occupancies t ON t.unit_id = u.id
    WHERE u.id = unit_id
      AND t.user_id = auth.uid()
      AND t.role = 'tenant'
      AND t.end_date IS NULL
  ));

CREATE POLICY "Staff manage generator runs"
  ON public.estate_generator_runs FOR ALL
  USING (private.is_estate_staff(estate_id))
  WITH CHECK (private.is_estate_staff(estate_id));

CREATE POLICY "Staff manage generator splits"
  ON public.estate_generator_unit_splits FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.estate_generator_runs r
    WHERE r.id = run_id AND private.is_estate_staff(r.estate_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.estate_generator_runs r
    WHERE r.id = run_id AND private.is_estate_staff(r.estate_id)
  ));

-- Tenants: read own-unit generator splits
CREATE POLICY "Tenant reads own generator splits"
  ON public.estate_generator_unit_splits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.estate_units u
    JOIN public.unit_occupancies t ON t.unit_id = u.id
    WHERE u.id = unit_id
      AND t.user_id = auth.uid()
      AND t.role = 'tenant'
      AND t.end_date IS NULL
  ));

-- ─────────────────────────────────────────────
-- 7. Grants
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.estate_utility_meters,
  public.estate_utility_meter_readings,
  public.estate_utility_invoices,
  public.estate_generator_runs,
  public.estate_generator_unit_splits
TO authenticated;
