-- Competitive engagement foundations for BaytMiftah.
-- Reviews, alerts, media, and readiness gates stay internal.

ALTER TABLE public.property_media
  DROP CONSTRAINT IF EXISTS property_media_media_type_check;

ALTER TABLE public.property_media
  ADD CONSTRAINT property_media_media_type_check
  CHECK (
    media_type IN (
      'photo',
      'video',
      'floor_plan',
      'virtual_tour',
      'drone',
      'renovation_before_after',
      'document',
      'other'
    )
  );

ALTER TABLE public.saved_search_alerts
  ADD COLUMN IF NOT EXISTS amenities TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS notification_channels TEXT[] NOT NULL DEFAULT ARRAY['email']::TEXT[],
  ADD COLUMN IF NOT EXISTS alert_rules TEXT[] NOT NULL DEFAULT ARRAY['new_listing', 'price_drop']::TEXT[],
  ADD COLUMN IF NOT EXISTS price_drop_threshold_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS last_lowest_price INTEGER,
  ADD COLUMN IF NOT EXISTS last_price_drop_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_new_listing_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_result_fingerprint TEXT;

CREATE TABLE IF NOT EXISTS public.marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('listing', 'agency', 'project', 'vendor', 'deal')),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE CASCADE,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  reviewer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  review_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'approved', 'rejected', 'reported', 'archived')
  ),
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_source TEXT CHECK (
    verified_source IS NULL OR verified_source IN ('inquiry', 'viewing', 'payment', 'deal', 'admin')
  ),
  abuse_report_count INTEGER NOT NULL DEFAULT 0 CHECK (abuse_report_count >= 0),
  moderation_note TEXT,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (target_type = 'listing' AND listing_id IS NOT NULL)
    OR (target_type = 'agency' AND organization_id IS NOT NULL)
    OR (target_type = 'project' AND project_id IS NOT NULL)
    OR (target_type = 'vendor' AND vendor_id IS NOT NULL)
    OR (target_type = 'deal' AND deal_case_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_listing_status
ON public.marketplace_reviews(listing_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_org_status
ON public.marketplace_reviews(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_marketplace_reviews_reviewer
ON public.marketplace_reviews(reviewer_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.marketplace_review_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID NOT NULL REFERENCES public.marketplace_reviews(id) ON DELETE CASCADE,
  reporter_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'reviewed', 'dismissed', 'actioned')
  ),
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (review_id, reporter_user_id)
);

CREATE INDEX IF NOT EXISTS idx_marketplace_review_reports_status
ON public.marketplace_review_reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_search_alerts_price_drop
ON public.saved_search_alerts(user_id, is_active, last_price_drop_at DESC);

ALTER TABLE public.marketplace_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_review_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.marketplace_reviews TO anon;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_reviews TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketplace_review_reports TO authenticated;

DROP TRIGGER IF EXISTS set_marketplace_reviews_updated_at
ON public.marketplace_reviews;

CREATE TRIGGER set_marketplace_reviews_updated_at
BEFORE UPDATE ON public.marketplace_reviews
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP POLICY IF EXISTS "Public can view approved marketplace reviews" ON public.marketplace_reviews;
CREATE POLICY "Public can view approved marketplace reviews"
ON public.marketplace_reviews FOR SELECT
USING (status = 'approved');

DROP POLICY IF EXISTS "Users can view their own marketplace reviews" ON public.marketplace_reviews;
CREATE POLICY "Users can view their own marketplace reviews"
ON public.marketplace_reviews FOR SELECT
TO authenticated
USING (reviewer_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can submit marketplace reviews" ON public.marketplace_reviews;
CREATE POLICY "Users can submit marketplace reviews"
ON public.marketplace_reviews FOR INSERT
TO authenticated
WITH CHECK (
  reviewer_user_id = auth.uid()
  AND status = 'submitted'
);

DROP POLICY IF EXISTS "Admins manage marketplace reviews" ON public.marketplace_reviews;
CREATE POLICY "Admins manage marketplace reviews"
ON public.marketplace_reviews FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Users can create marketplace review reports" ON public.marketplace_review_reports;
CREATE POLICY "Users can create marketplace review reports"
ON public.marketplace_review_reports FOR INSERT
TO authenticated
WITH CHECK (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their own marketplace review reports" ON public.marketplace_review_reports;
CREATE POLICY "Users can view their own marketplace review reports"
ON public.marketplace_review_reports FOR SELECT
TO authenticated
USING (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage marketplace review reports" ON public.marketplace_review_reports;
CREATE POLICY "Admins manage marketplace review reports"
ON public.marketplace_review_reports FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

INSERT INTO public.external_provider_readiness (
  provider_category,
  provider_key,
  display_name,
  environment,
  status,
  fallback_provider_key,
  notes,
  metadata
)
VALUES
  (
    'communications',
    'google_calendar',
    'Google Calendar export and reminder sync',
    'sandbox',
    'credentials_pending',
    'ics_export',
    'Provider readiness only. Live OAuth sync remains gated until privacy and consent review.',
    '{"wave":"agent_productivity","legal_gate":"calendar_consent"}'::jsonb
  ),
  (
    'communications',
    'outlook_calendar',
    'Outlook Calendar export and reminder sync',
    'sandbox',
    'credentials_pending',
    'ics_export',
    'Provider readiness only. Live OAuth sync remains gated until privacy and consent review.',
    '{"wave":"agent_productivity","legal_gate":"calendar_consent"}'::jsonb
  ),
  (
    'communications',
    'esignature_provider',
    'E-signature provider readiness',
    'sandbox',
    'credentials_pending',
    NULL,
    'Readiness record only. Live signing must wait for legal approval and Ghana e-signature policy.',
    '{"wave":"agent_productivity","legal_gate":"esignature_approval"}'::jsonb
  ),
  (
    'fraud',
    'image_authenticity_ai',
    'Image authenticity and stock-photo screening',
    'sandbox',
    'credentials_pending',
    'human_review',
    'High-risk fraud signals are advisory only and require human review.',
    '{"wave":"trust_growth_community","review_first":true}'::jsonb
  )
ON CONFLICT (provider_category, provider_key, environment) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  fallback_provider_key = EXCLUDED.fallback_provider_key,
  notes = EXCLUDED.notes,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

COMMENT ON TABLE public.marketplace_reviews IS
  'Moderated reviews for listings, agencies, projects, vendors, and completed deal experiences.';

COMMENT ON COLUMN public.saved_search_alerts.alert_rules IS
  'Alert triggers such as new_listing and price_drop. Used by refresh jobs and notification routing.';
