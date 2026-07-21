-- Launch workflows: purchase counter-offers, closing checklist, short-stay lifecycle, rent schedule

ALTER TABLE public.host_listing_settings
ADD COLUMN IF NOT EXISTS booking_mode TEXT NOT NULL DEFAULT 'instant' CHECK (
  booking_mode IN ('instant', 'request')
);

ALTER TABLE public.short_stay_bookings
ADD COLUMN IF NOT EXISTS booking_mode TEXT NOT NULL DEFAULT 'instant' CHECK (
  booking_mode IN ('instant', 'request')
),
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS refund_minor BIGINT CHECK (refund_minor IS NULL OR refund_minor >= 0),
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE public.leases
ADD COLUMN IF NOT EXISTS signing_status TEXT NOT NULL DEFAULT 'pending' CHECK (
  signing_status IN ('pending', 'sent', 'signed')
),
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS renewal_status TEXT NOT NULL DEFAULT 'none' CHECK (
  renewal_status IN ('none', 'requested', 'approved', 'declined')
),
ADD COLUMN IF NOT EXISTS renewal_notice_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.deal_case_counter_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_case_id UUID NOT NULL REFERENCES public.deal_cases(id) ON DELETE CASCADE,
  offered_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  offered_by_role TEXT NOT NULL CHECK (offered_by_role IN ('buyer', 'seller')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'accepted', 'rejected', 'withdrawn')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.closing_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_case_id UUID NOT NULL REFERENCES public.deal_cases(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  label TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (deal_case_id, item_key)
);

CREATE TABLE IF NOT EXISTS public.lease_rent_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (
    status IN ('upcoming', 'paid', 'overdue', 'waived')
  ),
  paid_at TIMESTAMPTZ,
  transaction_id UUID REFERENCES public.property_transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (lease_id, due_date)
);

CREATE TABLE IF NOT EXISTS public.booking_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.short_stay_bookings(id) ON DELETE CASCADE,
  reviewer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('guest', 'host')),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, reviewer_user_id, reviewer_role)
);

CREATE INDEX IF NOT EXISTS idx_counter_offers_deal ON public.deal_case_counter_offers(deal_case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_closing_checklist_deal ON public.closing_checklist_items(deal_case_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lease_rent_schedule ON public.lease_rent_schedule(lease_id, due_date);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_booking ON public.booking_reviews(booking_id);

ALTER TABLE public.deal_case_counter_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.closing_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lease_rent_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Deal parties can view counter offers" ON public.deal_case_counter_offers;
CREATE POLICY "Deal parties can view counter offers"
ON public.deal_case_counter_offers FOR SELECT
USING (
  public.is_platform_admin()
  OR offered_by_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.deal_cases dc
    WHERE dc.id = deal_case_counter_offers.deal_case_id
    AND dc.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.deal_cases dc
    JOIN public.organization_members om ON om.organization_id = dc.organization_id
    WHERE dc.id = deal_case_counter_offers.deal_case_id
    AND om.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Deal parties can create counter offers" ON public.deal_case_counter_offers;
CREATE POLICY "Deal parties can create counter offers"
ON public.deal_case_counter_offers FOR INSERT
WITH CHECK (
  offered_by_user_id = auth.uid()
  AND (
    EXISTS (
      SELECT 1 FROM public.deal_cases dc
      WHERE dc.id = deal_case_counter_offers.deal_case_id
      AND dc.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.deal_cases dc
      JOIN public.organization_members om ON om.organization_id = dc.organization_id
      WHERE dc.id = deal_case_counter_offers.deal_case_id
      AND om.user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Deal parties can update counter offers" ON public.deal_case_counter_offers;
CREATE POLICY "Deal parties can update counter offers"
ON public.deal_case_counter_offers FOR UPDATE
USING (
  public.is_platform_admin()
  OR offered_by_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.deal_cases dc
    WHERE dc.id = deal_case_counter_offers.deal_case_id
    AND dc.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.deal_cases dc
    JOIN public.organization_members om ON om.organization_id = dc.organization_id
    WHERE dc.id = deal_case_counter_offers.deal_case_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager', 'agent')
  )
);

DROP POLICY IF EXISTS "Deal parties can view closing checklist" ON public.closing_checklist_items;
CREATE POLICY "Deal parties can view closing checklist"
ON public.closing_checklist_items FOR SELECT
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.deal_cases dc
    WHERE dc.id = closing_checklist_items.deal_case_id
    AND dc.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.deal_cases dc
    JOIN public.organization_members om ON om.organization_id = dc.organization_id
    WHERE dc.id = closing_checklist_items.deal_case_id
    AND om.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Deal parties can manage closing checklist" ON public.closing_checklist_items;
CREATE POLICY "Deal parties can manage closing checklist"
ON public.closing_checklist_items FOR ALL
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.deal_cases dc
    WHERE dc.id = closing_checklist_items.deal_case_id
    AND dc.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.deal_cases dc
    JOIN public.organization_members om ON om.organization_id = dc.organization_id
    WHERE dc.id = closing_checklist_items.deal_case_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager', 'agent')
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.deal_cases dc
    WHERE dc.id = closing_checklist_items.deal_case_id
    AND dc.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.deal_cases dc
    JOIN public.organization_members om ON om.organization_id = dc.organization_id
    WHERE dc.id = closing_checklist_items.deal_case_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager', 'agent')
  )
);

DROP POLICY IF EXISTS "Tenants can view rent schedule" ON public.lease_rent_schedule;
CREATE POLICY "Tenants can view rent schedule"
ON public.lease_rent_schedule FOR SELECT
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.leases l
    WHERE l.id = lease_rent_schedule.lease_id
    AND l.tenant_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.organization_members om ON om.organization_id = l.organization_id
    WHERE l.id = lease_rent_schedule.lease_id
    AND om.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Org can manage rent schedule" ON public.lease_rent_schedule;
CREATE POLICY "Org can manage rent schedule"
ON public.lease_rent_schedule FOR ALL
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.organization_members om ON om.organization_id = l.organization_id
    WHERE l.id = lease_rent_schedule.lease_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager', 'agent')
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.leases l
    JOIN public.organization_members om ON om.organization_id = l.organization_id
    WHERE l.id = lease_rent_schedule.lease_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager', 'agent')
  )
);

DROP POLICY IF EXISTS "Booking parties can view reviews" ON public.booking_reviews;
CREATE POLICY "Booking parties can view reviews"
ON public.booking_reviews FOR SELECT
USING (
  public.is_platform_admin()
  OR reviewer_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.short_stay_bookings b
    WHERE b.id = booking_reviews.booking_id
    AND b.guest_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.short_stay_bookings b
    JOIN public.organization_members om ON om.organization_id = b.organization_id
    WHERE b.id = booking_reviews.booking_id
    AND om.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Booking parties can submit reviews" ON public.booking_reviews;
CREATE POLICY "Booking parties can submit reviews"
ON public.booking_reviews FOR INSERT
WITH CHECK (reviewer_user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.deal_case_counter_offers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.closing_checklist_items TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.lease_rent_schedule TO authenticated;
GRANT SELECT, INSERT ON public.booking_reviews TO authenticated;
