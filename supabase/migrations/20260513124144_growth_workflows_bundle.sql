-- Core growth workflow bundle:
-- 1. Showing scheduler
-- 2. Deal pipeline metadata
-- 3. Saved search alerts

ALTER TABLE public.deal_cases
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'new_inquiry',
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_contacted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_stage_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.deal_cases
  DROP CONSTRAINT IF EXISTS deal_cases_pipeline_stage_check;

ALTER TABLE public.deal_cases
  ADD CONSTRAINT deal_cases_pipeline_stage_check
  CHECK (
    pipeline_stage IN (
      'new_inquiry',
      'contacted',
      'qualified',
      'viewing_scheduled',
      'negotiation',
      'payment_pending',
      'won',
      'lost'
    )
  );

ALTER TABLE public.deal_cases
  DROP CONSTRAINT IF EXISTS deal_cases_priority_check;

ALTER TABLE public.deal_cases
  ADD CONSTRAINT deal_cases_priority_check
  CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

CREATE INDEX IF NOT EXISTS idx_deal_cases_pipeline_stage
ON public.deal_cases(organization_id, pipeline_stage, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_deal_cases_next_follow_up
ON public.deal_cases(organization_id, next_follow_up_at);

CREATE TABLE IF NOT EXISTS public.property_viewings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  requested_datetime TIMESTAMPTZ NOT NULL,
  confirmed_datetime TIMESTAMPTZ,
  duration_minutes INTEGER NOT NULL DEFAULT 45 CHECK (duration_minutes BETWEEN 15 AND 240),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (
    status IN ('requested', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show')
  ),
  requester_note TEXT,
  internal_note TEXT,
  outcome_note TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_viewings_org_schedule
ON public.property_viewings(organization_id, requested_datetime DESC);

CREATE INDEX IF NOT EXISTS idx_property_viewings_user_schedule
ON public.property_viewings(user_id, requested_datetime DESC);

CREATE INDEX IF NOT EXISTS idx_property_viewings_deal_case
ON public.property_viewings(deal_case_id);

CREATE TABLE IF NOT EXISTS public.saved_search_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  location_query TEXT,
  listing_type TEXT NOT NULL DEFAULT 'rental' CHECK (listing_type IN ('rental', 'sale', 'lease')),
  property_type TEXT,
  price_min INTEGER,
  price_max INTEGER,
  bedrooms INTEGER,
  bathrooms INTEGER,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('immediate', 'daily', 'weekly')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_checked_at TIMESTAMPTZ,
  last_match_count INTEGER NOT NULL DEFAULT 0 CHECK (last_match_count >= 0),
  last_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_user_active
ON public.saved_search_alerts(user_id, is_active, updated_at DESC);

ALTER TABLE public.property_viewings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_search_alerts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.property_viewings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_search_alerts TO authenticated;

DROP POLICY IF EXISTS "Users can view their own property viewings" ON public.property_viewings;
CREATE POLICY "Users can view their own property viewings"
ON public.property_viewings FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Organization members can view property viewings" ON public.property_viewings;
CREATE POLICY "Organization members can view property viewings"
ON public.property_viewings FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = property_viewings.organization_id
      AND membership.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create their own property viewings" ON public.property_viewings;
CREATE POLICY "Users can create their own property viewings"
ON public.property_viewings FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.listings listing
    WHERE listing.id = property_viewings.listing_id
      AND listing.property_id = property_viewings.property_id
      AND listing.organization_id = property_viewings.organization_id
  )
);

DROP POLICY IF EXISTS "Organization members can update property viewings" ON public.property_viewings;
CREATE POLICY "Organization members can update property viewings"
ON public.property_viewings FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = property_viewings.organization_id
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = property_viewings.organization_id
      AND membership.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can manage their own saved search alerts" ON public.saved_search_alerts;
CREATE POLICY "Users can manage their own saved search alerts"
ON public.saved_search_alerts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_property_viewings_updated_at
ON public.property_viewings;

CREATE TRIGGER set_property_viewings_updated_at
BEFORE UPDATE ON public.property_viewings
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_saved_search_alerts_updated_at
ON public.saved_search_alerts;

CREATE TRIGGER set_saved_search_alerts_updated_at
BEFORE UPDATE ON public.saved_search_alerts
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

COMMENT ON TABLE public.property_viewings IS 'Viewing requests and confirmed property showing schedules.';
COMMENT ON TABLE public.saved_search_alerts IS 'Saved search filters and lightweight alert tracking for property discovery.';
