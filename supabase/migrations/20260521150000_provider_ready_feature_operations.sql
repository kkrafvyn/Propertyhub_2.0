-- Provider-ready feature operations.
-- Adds queues and action records that let the product workflows run without
-- external provider credentials.

CREATE TABLE IF NOT EXISTS public.newsletter_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  editorial_post_id UUID REFERENCES public.editorial_posts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'queued', 'provider_pending', 'sent', 'cancelled', 'archived')
  ),
  target_topics TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  provider_key TEXT,
  scheduled_at TIMESTAMPTZ,
  queued_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  recipient_count INTEGER NOT NULL DEFAULT 0 CHECK (recipient_count >= 0),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.open_house_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  open_house_event_id UUID NOT NULL REFERENCES public.open_house_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (
    status IN ('registered', 'confirmed', 'attended', 'no_show', 'cancelled')
  ),
  reminders_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (open_house_event_id, email)
);

CREATE TABLE IF NOT EXISTS public.community_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID REFERENCES public.community_contributions(id) ON DELETE CASCADE,
  space_id UUID REFERENCES public.neighborhood_community_spaces(id) ON DELETE CASCADE,
  reporter_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    status IN ('submitted', 'reviewed', 'dismissed', 'actioned')
  ),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.feature_operation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key TEXT NOT NULL,
  entity_table TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'recorded' CHECK (
    status IN ('recorded', 'queued', 'completed', 'failed', 'cancelled')
  ),
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_newsletter_campaigns_status
ON public.newsletter_campaigns(status, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS idx_open_house_registrations_event
ON public.open_house_registrations(open_house_event_id, status);

CREATE INDEX IF NOT EXISTS idx_community_reports_status
ON public.community_reports(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_operation_events_entity
ON public.feature_operation_events(entity_table, entity_id, created_at DESC);

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'newsletter_campaigns',
    'open_house_registrations',
    'community_reports',
    'feature_operation_events'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;

GRANT SELECT, INSERT, UPDATE ON
  public.newsletter_campaigns,
  public.open_house_registrations,
  public.community_reports,
  public.feature_operation_events
TO authenticated;

GRANT INSERT ON public.open_house_registrations TO anon;

DROP TRIGGER IF EXISTS set_newsletter_campaigns_updated_at ON public.newsletter_campaigns;
CREATE TRIGGER set_newsletter_campaigns_updated_at
BEFORE UPDATE ON public.newsletter_campaigns
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_open_house_registrations_updated_at ON public.open_house_registrations;
CREATE TRIGGER set_open_house_registrations_updated_at
BEFORE UPDATE ON public.open_house_registrations
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_community_reports_updated_at ON public.community_reports;
CREATE TRIGGER set_community_reports_updated_at
BEFORE UPDATE ON public.community_reports
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP POLICY IF EXISTS "Admins manage newsletter campaigns" ON public.newsletter_campaigns;
CREATE POLICY "Admins manage newsletter campaigns"
ON public.newsletter_campaigns FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Anyone can register for scheduled open houses" ON public.open_house_registrations;
CREATE POLICY "Anyone can register for scheduled open houses"
ON public.open_house_registrations FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.open_house_events event
    WHERE event.id = open_house_registrations.open_house_event_id
      AND event.status IN ('scheduled', 'live')
  )
);

DROP POLICY IF EXISTS "Users view own open house registrations" ON public.open_house_registrations;
CREATE POLICY "Users view own open house registrations"
ON public.open_house_registrations FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Org members view open house registrations" ON public.open_house_registrations;
CREATE POLICY "Org members view open house registrations"
ON public.open_house_registrations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.open_house_events event
    WHERE event.id = open_house_registrations.open_house_event_id
      AND event.organization_id IS NOT NULL
      AND private.is_organization_member(event.organization_id)
  )
);

DROP POLICY IF EXISTS "Admins manage open house registrations" ON public.open_house_registrations;
CREATE POLICY "Admins manage open house registrations"
ON public.open_house_registrations FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Users create community reports" ON public.community_reports;
CREATE POLICY "Users create community reports"
ON public.community_reports FOR INSERT
TO authenticated
WITH CHECK (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS "Users view own community reports" ON public.community_reports;
CREATE POLICY "Users view own community reports"
ON public.community_reports FOR SELECT
TO authenticated
USING (reporter_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage community reports" ON public.community_reports;
CREATE POLICY "Admins manage community reports"
ON public.community_reports FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Users create own feature operation events" ON public.feature_operation_events;
CREATE POLICY "Users create own feature operation events"
ON public.feature_operation_events FOR INSERT
TO authenticated
WITH CHECK (actor_user_id = auth.uid());

DROP POLICY IF EXISTS "Users view own feature operation events" ON public.feature_operation_events;
CREATE POLICY "Users view own feature operation events"
ON public.feature_operation_events FOR SELECT
TO authenticated
USING (actor_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins manage feature operation events" ON public.feature_operation_events;
CREATE POLICY "Admins manage feature operation events"
ON public.feature_operation_events FOR ALL
TO authenticated
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

COMMENT ON TABLE public.newsletter_campaigns IS
  'Newsletter, SMS, and WhatsApp campaign queue. Provider dispatch can be added later.';
COMMENT ON TABLE public.open_house_registrations IS
  'Open-house RSVP and attendance queue for live or recorded property tours.';
COMMENT ON TABLE public.community_reports IS
  'Report queue for community posts, emergency alerts, local guides, and neighborhood content.';
COMMENT ON TABLE public.feature_operation_events IS
  'Lightweight operation log for provider-ready feature workflow actions.';
