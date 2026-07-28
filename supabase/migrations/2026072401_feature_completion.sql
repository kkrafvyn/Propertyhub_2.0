-- Feature completion: commissions, inspections, move checklists, smart devices, partial escrow release

CREATE TABLE IF NOT EXISTS public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  revenue_model TEXT NOT NULL DEFAULT 'percentage' CHECK (revenue_model IN ('percentage', 'fixed', 'tiered')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'earned', 'paid', 'reversed')),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  reversed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commissions_org ON public.commissions(organization_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_commissions_user ON public.commissions(user_id, status);

CREATE TABLE IF NOT EXISTS public.property_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  inspection_type TEXT NOT NULL DEFAULT 'move_in' CHECK (
    inspection_type IN ('move_in', 'move_out', 'routine', 'pre_purchase')
  ),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'in_progress', 'completed', 'cancelled')
  ),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  inspector_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tenant_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  report_document_id UUID REFERENCES public.organization_documents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_inspections_listing ON public.property_inspections(listing_id, inspection_type);

CREATE TABLE IF NOT EXISTS public.move_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  checklist_type TEXT NOT NULL CHECK (checklist_type IN ('move_in', 'move_out')),
  item_key TEXT NOT NULL,
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lease_id, checklist_type, item_key)
);

CREATE INDEX IF NOT EXISTS idx_move_checklist_lease ON public.move_checklist_items(lease_id, checklist_type);

CREATE TABLE IF NOT EXISTS public.smart_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  device_type TEXT NOT NULL CHECK (
    device_type IN ('door_lock', 'thermostat', 'energy_meter', 'water_meter', 'camera', 'other')
  ),
  label TEXT NOT NULL,
  room TEXT,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'alert')),
  last_reading JSONB NOT NULL DEFAULT '{}'::jsonb,
  access_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.smart_device_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL REFERENCES public.smart_devices(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_device_events_device ON public.smart_device_events(device_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('national_id', 'passport', 'drivers_license', 'ghana_card')),
  document_number TEXT,
  full_name TEXT,
  date_of_birth DATE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'in_review', 'verified', 'rejected')
  ),
  storage_path TEXT,
  reviewer_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_user ON public.kyc_submissions(user_id, submitted_at DESC);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.move_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_device_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members view commissions" ON public.commissions;
CREATE POLICY "Org members view commissions" ON public.commissions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = commissions.organization_id AND om.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users manage own kyc" ON public.kyc_submissions;
CREATE POLICY "Users manage own kyc" ON public.kyc_submissions FOR ALL
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Tenants view move checklist" ON public.move_checklist_items;
CREATE POLICY "Tenants view move checklist" ON public.move_checklist_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leases l
    WHERE l.id = move_checklist_items.lease_id AND l.tenant_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.organization_members om ON om.organization_id = l.organization_id
    WHERE l.id = move_checklist_items.lease_id AND om.user_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE ON public.commissions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.property_inspections TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.move_checklist_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.smart_devices TO authenticated;
GRANT SELECT ON public.smart_device_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.kyc_submissions TO authenticated;

CREATE OR REPLACE FUNCTION public.release_partial_escrow_hold(
  p_hold_id UUID,
  p_amount_minor BIGINT,
  p_note TEXT DEFAULT NULL
)
RETURNS public.escrow_holds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hold_row public.escrow_holds;
BEGIN
  IF p_amount_minor IS NULL OR p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'Release amount must be positive';
  END IF;

  SELECT * INTO hold_row
  FROM public.escrow_holds
  WHERE id = p_hold_id
  FOR UPDATE;

  IF hold_row IS NULL THEN
    RAISE EXCEPTION 'Escrow hold not found';
  END IF;

  IF hold_row.status <> 'held' THEN
    RAISE EXCEPTION 'Escrow hold is not releasable';
  END IF;

  IF p_amount_minor >= hold_row.amount_minor THEN
    RETURN public.release_escrow_hold(p_hold_id, p_note);
  END IF;

  UPDATE public.escrow_holds
  SET amount_minor = hold_row.amount_minor - p_amount_minor,
      release_note = COALESCE(p_note, release_note),
      updated_at = NOW()
  WHERE id = p_hold_id
  RETURNING * INTO hold_row;

  RETURN hold_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_partial_escrow_hold(UUID, BIGINT, TEXT) TO authenticated;
