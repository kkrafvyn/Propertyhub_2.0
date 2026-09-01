-- Migration: QR Visitor Gate Clearance & Estate Security Kiosk
-- Backs src/lib/visitor-clearance.service.ts and GateClearanceKiosk.tsx

-- ─────────────────────────────────────────────
-- 1. Visitor Passes
-- ─────────────────────────────────────────────
CREATE TABLE public.estate_visitor_passes (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id       UUID        NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  -- Host info
  host_unit_id    UUID        REFERENCES public.estate_units(id) ON DELETE SET NULL,
  host_user_id    UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  host_name       TEXT        NOT NULL,
  -- Visitor info
  visitor_name    TEXT        NOT NULL,
  visitor_phone   TEXT,                      -- Ghana 0XX format
  company_name    TEXT,                      -- for Bolt Food, Yango, contractors
  vehicle_plate   TEXT,
  pass_type       TEXT        NOT NULL CHECK (pass_type IN ('guest','delivery','contractor','resident_vehicle','maintenance')),
  -- Access credentials
  pin_code        TEXT        NOT NULL,      -- 6-digit numeric PIN
  qr_payload      TEXT        NOT NULL,      -- Signed JWT or opaque token
  -- Validity
  valid_from      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ NOT NULL,
  max_uses        SMALLINT    NOT NULL DEFAULT 1 CHECK (max_uses BETWEEN 1 AND 100),
  use_count       SMALLINT    NOT NULL DEFAULT 0 CHECK (use_count >= 0),
  status          TEXT        NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','used','expired','revoked')),
  -- SMS delivery
  sms_sent        BOOLEAN     NOT NULL DEFAULT FALSE,
  sms_reference   TEXT,
  created_by      UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. Gate Access Log
-- ─────────────────────────────────────────────
CREATE TABLE public.estate_gate_log (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id       UUID        NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  pass_id         UUID        REFERENCES public.estate_visitor_passes(id) ON DELETE SET NULL,
  -- Entry details
  direction       TEXT        NOT NULL CHECK (direction IN ('entry','exit')),
  visitor_name    TEXT        NOT NULL,
  vehicle_plate   TEXT,
  pass_type       TEXT,
  -- Guard
  guard_user_id   UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  guard_name      TEXT,
  -- Evidence
  photo_url       TEXT,
  verification_method TEXT    NOT NULL DEFAULT 'qr'
                   CHECK (verification_method IN ('qr','pin','manual','vehicle_plate')),
  -- Result
  access_granted  BOOLEAN     NOT NULL DEFAULT TRUE,
  deny_reason     TEXT,
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. Auto-update timestamps
-- ─────────────────────────────────────────────
CREATE TRIGGER visitor_passes_updated_at
  BEFORE UPDATE ON public.estate_visitor_passes
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ─────────────────────────────────────────────
-- 4. Indexes
-- ─────────────────────────────────────────────
CREATE INDEX visitor_passes_estate_idx      ON public.estate_visitor_passes(estate_id, status, valid_until DESC);
CREATE INDEX visitor_passes_pin_idx         ON public.estate_visitor_passes(estate_id, pin_code) WHERE status = 'active';
CREATE INDEX visitor_passes_host_unit_idx   ON public.estate_visitor_passes(host_unit_id);
CREATE INDEX gate_log_estate_idx            ON public.estate_gate_log(estate_id, occurred_at DESC);
CREATE INDEX gate_log_pass_idx              ON public.estate_gate_log(pass_id);

-- ─────────────────────────────────────────────
-- 5. RLS
-- ─────────────────────────────────────────────
ALTER TABLE public.estate_visitor_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_gate_log       ENABLE ROW LEVEL SECURITY;

-- Estate staff: full CRUD on passes
CREATE POLICY "Staff manage visitor passes"
  ON public.estate_visitor_passes FOR ALL
  USING (private.is_estate_staff(estate_id))
  WITH CHECK (private.is_estate_staff(estate_id));

-- Tenants: create passes for their own unit + read own passes
CREATE POLICY "Tenant creates own-unit passes"
  ON public.estate_visitor_passes FOR INSERT
  WITH CHECK (
    host_user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.unit_occupancies t
      WHERE t.unit_id = host_unit_id
        AND t.user_id = auth.uid()
        AND t.role = 'tenant'
        AND t.end_date IS NULL
    )
  );

CREATE POLICY "Tenant reads own passes"
  ON public.estate_visitor_passes FOR SELECT
  USING (host_user_id = auth.uid());

-- Gate log: staff read all; guards insert
CREATE POLICY "Staff reads gate log"
  ON public.estate_gate_log FOR SELECT
  USING (private.is_estate_staff(estate_id));

CREATE POLICY "Guard inserts gate log"
  ON public.estate_gate_log FOR INSERT
  WITH CHECK (private.is_estate_staff(estate_id));

-- ─────────────────────────────────────────────
-- 6. Grants
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.estate_visitor_passes,
  public.estate_gate_log
TO authenticated;
