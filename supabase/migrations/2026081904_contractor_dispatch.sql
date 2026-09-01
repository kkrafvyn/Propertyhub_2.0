-- Migration: Contractor MoMo Dispatch & Work Order Suite
-- Backs src/lib/contractor-dispatch.service.ts and ContractorWorkOrders.tsx

-- ─────────────────────────────────────────────
-- 1. Vetted Artisan Directory
-- ─────────────────────────────────────────────
CREATE TABLE public.estate_artisans (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id           UUID        NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  -- Identity
  full_name           TEXT        NOT NULL,
  trade               TEXT        NOT NULL CHECK (trade IN (
                         'plumber','electrician','hvac','generator_tech','painter',
                         'carpenter','mason','tiler','welder','general_maintenance','other'
                       )),
  phone               TEXT        NOT NULL,          -- Ghana 0XX
  momo_number         TEXT,                          -- MTN MoMo / Telecel Cash number
  momo_provider       TEXT        CHECK (momo_provider IN ('mtn','telecel','airteltigo')),
  -- Vetting
  ghana_card_number   TEXT,                          -- Stored hashed in production
  ghana_card_verified BOOLEAN     NOT NULL DEFAULT FALSE,
  ghana_card_verified_at TIMESTAMPTZ,
  -- Performance
  rating              NUMERIC(3,1) CHECK (rating BETWEEN 0 AND 5),
  jobs_completed      INTEGER     NOT NULL DEFAULT 0,
  -- Status
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  notes               TEXT,
  added_by            UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. Contractor Work Orders
-- ─────────────────────────────────────────────
CREATE TABLE public.estate_contractor_work_orders (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id           UUID        NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  -- Links
  issue_id            UUID        REFERENCES public.estate_issues(id) ON DELETE SET NULL,
  unit_id             UUID        REFERENCES public.estate_units(id) ON DELETE SET NULL,
  artisan_id          UUID        REFERENCES public.estate_artisans(id) ON DELETE SET NULL,
  -- Details
  title               TEXT        NOT NULL,
  description         TEXT,
  trade               TEXT        NOT NULL,
  priority            TEXT        NOT NULL DEFAULT 'medium'
                       CHECK (priority IN ('low','medium','high','emergency')),
  -- Kanban status
  status              TEXT        NOT NULL DEFAULT 'new'
                       CHECK (status IN ('new','assigned','in_progress','inspection_review','completed','paid','cancelled')),
  -- Financial
  estimate_pesewas    BIGINT      CHECK (estimate_pesewas > 0),
  final_cost_pesewas  BIGINT      CHECK (final_cost_pesewas > 0),
  escrow_amount_pesewas BIGINT    CHECK (escrow_amount_pesewas > 0),
  -- Evidence
  before_photo_url    TEXT,
  after_photo_url     TEXT,
  inspection_notes    TEXT,
  -- Dates
  assigned_at         TIMESTAMPTZ,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  paid_at             TIMESTAMPTZ,
  -- Audit
  created_by          UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  managed_by          UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. MoMo Escrow Releases
-- ─────────────────────────────────────────────
CREATE TABLE public.estate_momo_escrow_releases (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id       UUID        NOT NULL REFERENCES public.estate_contractor_work_orders(id) ON DELETE RESTRICT,
  artisan_id          UUID        NOT NULL REFERENCES public.estate_artisans(id) ON DELETE RESTRICT,
  -- Payout details
  amount_pesewas      BIGINT      NOT NULL CHECK (amount_pesewas > 0),
  momo_number         TEXT        NOT NULL,
  momo_provider       TEXT        NOT NULL CHECK (momo_provider IN ('mtn','telecel','airteltigo')),
  -- Provider response
  provider_reference  TEXT,
  momo_status         TEXT        NOT NULL DEFAULT 'pending'
                       CHECK (momo_status IN ('pending','submitted','successful','failed')),
  failure_reason      TEXT,
  -- Timestamps
  initiated_by        UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  initiated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at         TIMESTAMPTZ,
  UNIQUE (work_order_id)             -- One escrow release per work order
);

-- ─────────────────────────────────────────────
-- 4. Auto-update timestamps
-- ─────────────────────────────────────────────
CREATE TRIGGER artisans_updated_at
  BEFORE UPDATE ON public.estate_artisans
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

CREATE TRIGGER work_orders_updated_at
  BEFORE UPDATE ON public.estate_contractor_work_orders
  FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();

-- ─────────────────────────────────────────────
-- 5. Indexes
-- ─────────────────────────────────────────────
CREATE INDEX artisans_estate_trade_idx          ON public.estate_artisans(estate_id, trade) WHERE is_active;
CREATE INDEX work_orders_estate_status_idx      ON public.estate_contractor_work_orders(estate_id, status, created_at DESC);
CREATE INDEX work_orders_artisan_idx            ON public.estate_contractor_work_orders(artisan_id);
CREATE INDEX escrow_releases_work_order_idx     ON public.estate_momo_escrow_releases(work_order_id);

-- ─────────────────────────────────────────────
-- 6. RLS
-- ─────────────────────────────────────────────
ALTER TABLE public.estate_artisans                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_contractor_work_orders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estate_momo_escrow_releases      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage artisans"
  ON public.estate_artisans FOR ALL
  USING (private.is_estate_staff(estate_id))
  WITH CHECK (private.is_estate_staff(estate_id));

CREATE POLICY "Staff manage contractor work orders"
  ON public.estate_contractor_work_orders FOR ALL
  USING (private.is_estate_staff(estate_id))
  WITH CHECK (private.is_estate_staff(estate_id));

-- Tenants: read work orders for their unit
CREATE POLICY "Tenant reads own-unit work orders"
  ON public.estate_contractor_work_orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.estate_units u
    JOIN public.unit_occupancies t ON t.unit_id = u.id
    WHERE u.id = unit_id
      AND t.user_id = auth.uid()
      AND t.role = 'tenant'
      AND t.end_date IS NULL
  ));

-- Finance staff: full access to escrow releases
CREATE POLICY "Finance manages escrow releases"
  ON public.estate_momo_escrow_releases FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.estate_contractor_work_orders w
    WHERE w.id = work_order_id AND private.can_manage_estate_finance(w.estate_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.estate_contractor_work_orders w
    WHERE w.id = work_order_id AND private.can_manage_estate_finance(w.estate_id)
  ));

-- ─────────────────────────────────────────────
-- 7. Grants
-- ─────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.estate_artisans,
  public.estate_contractor_work_orders,
  public.estate_momo_escrow_releases
TO authenticated;
