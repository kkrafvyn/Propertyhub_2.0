-- API-key-free feature function foundations.
-- These tables let BaytMiftah run the remaining feature workflows in manual,
-- provider-ready mode until real API credentials are added server-side.

CREATE TABLE IF NOT EXISTS public.editorial_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  body TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'guide' CHECK (
    post_type IN ('guide', 'market_report', 'legal_explainer', 'tutorial', 'newsletter', 'announcement')
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'approved', 'published', 'archived', 'rejected')
  ),
  author_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  region TEXT,
  city TEXT,
  category TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'unsubscribed', 'bounced', 'complained')
  ),
  source TEXT NOT NULL DEFAULT 'public_site',
  consent_recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  preferred_topics TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  preferred_channels TEXT[] NOT NULL DEFAULT ARRAY['email']::TEXT[],
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.open_house_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  host_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  stream_url TEXT,
  replay_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'scheduled', 'live', 'completed', 'cancelled', 'archived')
  ),
  requires_registration BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS public.floor_plan_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
  media_id UUID REFERENCES public.property_media(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unit TEXT NOT NULL DEFAULT 'sqm' CHECK (unit IN ('sqm', 'sqft')),
  total_area NUMERIC(12,2) CHECK (total_area IS NULL OR total_area >= 0),
  room_count INTEGER NOT NULL DEFAULT 0 CHECK (room_count >= 0),
  rooms JSONB NOT NULL DEFAULT '[]'::jsonb,
  measurement_confidence NUMERIC(5,2) CHECK (
    measurement_confidence IS NULL OR (measurement_confidence >= 0 AND measurement_confidence <= 100)
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'submitted', 'approved', 'rejected', 'archived')
  ),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sms_ussd_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('sms', 'ussd', 'whatsapp')),
  command TEXT NOT NULL,
  phone TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'queued', 'provider_pending', 'sent', 'failed', 'cancelled')
  ),
  provider_key TEXT,
  consent_recorded_at TIMESTAMPTZ,
  failure_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editorial_posts_status
ON public.editorial_posts(status, post_type, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_status
ON public.newsletter_subscribers(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_open_house_events_listing
ON public.open_house_events(listing_id, status, starts_at);

CREATE INDEX IF NOT EXISTS idx_open_house_events_org
ON public.open_house_events(organization_id, status, starts_at);

CREATE INDEX IF NOT EXISTS idx_floor_plan_measurements_listing
ON public.floor_plan_measurements(listing_id, status);

CREATE INDEX IF NOT EXISTS idx_sms_ussd_requests_status
ON public.sms_ussd_requests(channel, status, created_at DESC);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'editorial_posts',
    'newsletter_subscribers',
    'open_house_events',
    'floor_plan_measurements',
    'sms_ussd_requests'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

GRANT SELECT ON public.editorial_posts TO anon;
GRANT SELECT, INSERT, UPDATE ON public.editorial_posts TO authenticated;

GRANT INSERT ON public.newsletter_subscribers TO anon;
GRANT SELECT, INSERT, UPDATE ON public.newsletter_subscribers TO authenticated;

GRANT SELECT ON public.open_house_events TO anon;
GRANT SELECT, INSERT, UPDATE ON public.open_house_events TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.floor_plan_measurements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sms_ussd_requests TO authenticated;

DROP TRIGGER IF EXISTS set_editorial_posts_updated_at ON public.editorial_posts;
CREATE TRIGGER set_editorial_posts_updated_at
BEFORE UPDATE ON public.editorial_posts
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_newsletter_subscribers_updated_at ON public.newsletter_subscribers;
CREATE TRIGGER set_newsletter_subscribers_updated_at
BEFORE UPDATE ON public.newsletter_subscribers
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_open_house_events_updated_at ON public.open_house_events;
CREATE TRIGGER set_open_house_events_updated_at
BEFORE UPDATE ON public.open_house_events
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_floor_plan_measurements_updated_at ON public.floor_plan_measurements;
CREATE TRIGGER set_floor_plan_measurements_updated_at
BEFORE UPDATE ON public.floor_plan_measurements
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_sms_ussd_requests_updated_at ON public.sms_ussd_requests;
CREATE TRIGGER set_sms_ussd_requests_updated_at
BEFORE UPDATE ON public.sms_ussd_requests
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP POLICY IF EXISTS "Public can view published editorial posts" ON public.editorial_posts;
CREATE POLICY "Public can view published editorial posts"
ON public.editorial_posts FOR SELECT
USING (status = 'published');

DROP POLICY IF EXISTS "Users can create editorial drafts" ON public.editorial_posts;
CREATE POLICY "Users can create editorial drafts"
ON public.editorial_posts FOR INSERT
TO authenticated
WITH CHECK (author_user_id = auth.uid() AND status IN ('draft', 'submitted'));

DROP POLICY IF EXISTS "Users manage own editorial drafts" ON public.editorial_posts;
CREATE POLICY "Users manage own editorial drafts"
ON public.editorial_posts FOR UPDATE
TO authenticated
USING (author_user_id = auth.uid() AND status IN ('draft', 'submitted'))
WITH CHECK (author_user_id = auth.uid() AND status IN ('draft', 'submitted'));

DROP POLICY IF EXISTS "Admins manage editorial posts" ON public.editorial_posts;
CREATE POLICY "Admins manage editorial posts"
ON public.editorial_posts FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Anyone can join newsletter with consent" ON public.newsletter_subscribers;
CREATE POLICY "Anyone can join newsletter with consent"
ON public.newsletter_subscribers FOR INSERT
WITH CHECK (
  email IS NOT NULL
  AND consent_recorded_at IS NOT NULL
  AND status = 'pending'
);

DROP POLICY IF EXISTS "Users view own newsletter subscription" ON public.newsletter_subscribers;
CREATE POLICY "Users view own newsletter subscription"
ON public.newsletter_subscribers FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own newsletter subscription" ON public.newsletter_subscribers;
CREATE POLICY "Users update own newsletter subscription"
ON public.newsletter_subscribers FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage newsletter subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Admins manage newsletter subscribers"
ON public.newsletter_subscribers FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Public can view scheduled open houses" ON public.open_house_events;
CREATE POLICY "Public can view scheduled open houses"
ON public.open_house_events FOR SELECT
USING (status IN ('scheduled', 'live', 'completed'));

DROP POLICY IF EXISTS "Org members manage open houses" ON public.open_house_events;
CREATE POLICY "Org members manage open houses"
ON public.open_house_events FOR ALL
TO authenticated
USING (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
)
WITH CHECK (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Admins manage open houses" ON public.open_house_events;
CREATE POLICY "Admins manage open houses"
ON public.open_house_events FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Org members manage floor plans" ON public.floor_plan_measurements;
CREATE POLICY "Org members manage floor plans"
ON public.floor_plan_measurements FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.listings listing
    WHERE listing.id = floor_plan_measurements.listing_id
      AND private.is_organization_member(listing.organization_id)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.listings listing
    WHERE listing.id = floor_plan_measurements.listing_id
      AND private.is_organization_member(listing.organization_id)
  )
);

DROP POLICY IF EXISTS "Admins manage floor plans" ON public.floor_plan_measurements;
CREATE POLICY "Admins manage floor plans"
ON public.floor_plan_measurements FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Users create own SMS USSD requests" ON public.sms_ussd_requests;
CREATE POLICY "Users create own SMS USSD requests"
ON public.sms_ussd_requests FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users view own SMS USSD requests" ON public.sms_ussd_requests;
CREATE POLICY "Users view own SMS USSD requests"
ON public.sms_ussd_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Org members view related SMS USSD requests" ON public.sms_ussd_requests;
CREATE POLICY "Org members view related SMS USSD requests"
ON public.sms_ussd_requests FOR SELECT
TO authenticated
USING (
  organization_id IS NOT NULL
  AND private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Admins manage SMS USSD requests" ON public.sms_ussd_requests;
CREATE POLICY "Admins manage SMS USSD requests"
ON public.sms_ussd_requests FOR ALL
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
    'livestream_provider',
    'Live open-house streaming provider',
    'sandbox',
    'credentials_pending',
    'manual_stream_url',
    'Live open houses can run with manual stream URLs until a streaming provider is selected.',
    '{"feature":"open_house_events","api_keys_later":true}'::jsonb
  ),
  (
    'communications',
    'newsletter_provider',
    'Newsletter and campaign provider',
    'sandbox',
    'credentials_pending',
    'manual_export',
    'Newsletter subscribers are captured without secrets. Export or provider sync can be enabled later.',
    '{"feature":"newsletter_subscribers","api_keys_later":true}'::jsonb
  ),
  (
    'hyperlocal_data',
    'manual_field_collection',
    'Manual hyperlocal field collection',
    'production',
    'configured',
    NULL,
    'Manual field collection is the safe fallback before external data feeds are approved.',
    '{"feature":"hyperlocal_data_sources","api_keys_later":false}'::jsonb
  )
ON CONFLICT (provider_category, provider_key, environment) DO UPDATE
SET
  display_name = EXCLUDED.display_name,
  fallback_provider_key = EXCLUDED.fallback_provider_key,
  notes = EXCLUDED.notes,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

COMMENT ON TABLE public.editorial_posts IS
  'API-key-free CMS foundation for guides, market reports, legal explainers, tutorials, newsletters, and announcements.';
COMMENT ON TABLE public.newsletter_subscribers IS
  'Consent-first newsletter waitlist. External email provider sync can be added later without changing product flows.';
COMMENT ON TABLE public.open_house_events IS
  'Live or recorded open-house event schedule. Stream providers remain optional and server-side.';
COMMENT ON TABLE public.floor_plan_measurements IS
  'Interactive measured floor-plan records linked to listings and media.';
COMMENT ON TABLE public.sms_ussd_requests IS
  'SMS, WhatsApp, and USSD command queue. Provider dispatch remains gated until credentials are added.';
