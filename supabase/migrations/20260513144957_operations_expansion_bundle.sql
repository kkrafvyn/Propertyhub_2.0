-- Operations expansion bundle:
-- 1. Document center with version history and e-sign metadata
-- 2. Calendar availability + reschedule links
-- 3. Automation run tracking and scheduling foundations
-- 4. Finance and field operations helpers
-- 5. Moderation review cases and audit events

ALTER TABLE public.deal_cases
  ADD COLUMN IF NOT EXISTS follow_up_reminded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS stale_nudged_at TIMESTAMPTZ;

ALTER TABLE public.property_viewings
  ADD COLUMN IF NOT EXISTS external_calendar_provider TEXT CHECK (
    external_calendar_provider IS NULL
    OR external_calendar_provider IN ('google', 'outlook', 'ics')
  ),
  ADD COLUMN IF NOT EXISTS external_calendar_event_id TEXT,
  ADD COLUMN IF NOT EXISTS calendar_sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (
    calendar_sync_status IN ('pending', 'synced', 'failed', 'not_connected')
  ),
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reschedule_requested_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.organization_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_family_id UUID NOT NULL DEFAULT gen_random_uuid(),
  previous_version_id UUID REFERENCES public.organization_documents(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.property_transactions(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  version_number INTEGER NOT NULL DEFAULT 1 CHECK (version_number > 0),
  title TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'agreement',
      'offer_letter',
      'lease_contract',
      'sale_contract',
      'receipt_attachment',
      'identity_pack',
      'other'
    )
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'sent', 'partially_signed', 'signed', 'archived')
  ),
  signature_required BOOLEAN NOT NULL DEFAULT TRUE,
  current_version BOOLEAN NOT NULL DEFAULT TRUE,
  public_visibility BOOLEAN NOT NULL DEFAULT FALSE,
  content_markdown TEXT,
  public_summary TEXT,
  signed_copy_bucket TEXT,
  signed_copy_path TEXT,
  document_sha256 TEXT,
  external_signer_name TEXT,
  external_signer_email TEXT,
  signed_at TIMESTAMPTZ,
  signed_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  signed_by_name TEXT,
  signature_method TEXT CHECK (
    signature_method IS NULL OR signature_method IN ('typed', 'uploaded', 'system')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organization_documents_org_type
ON public.organization_documents(organization_id, document_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_organization_documents_family_version
ON public.organization_documents(document_family_id, version_number DESC);

CREATE INDEX IF NOT EXISTS idx_organization_documents_listing_public
ON public.organization_documents(listing_id, public_visibility, status);

CREATE TABLE IF NOT EXISTS public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.organization_documents(id) ON DELETE CASCADE,
  signer_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_role TEXT NOT NULL DEFAULT 'client' CHECK (
    signer_role IN (
      'organization_representative',
      'client',
      'witness',
      'manager'
    )
  ),
  signature_type TEXT NOT NULL DEFAULT 'typed' CHECK (
    signature_type IN ('typed', 'drawn', 'system')
  ),
  signature_value TEXT,
  ip_address TEXT,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_signatures_document
ON public.document_signatures(document_id, signed_at DESC);

CREATE TABLE IF NOT EXISTS public.document_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.organization_documents(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.agent_availability_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'Africa/Accra',
  buffer_minutes INTEGER NOT NULL DEFAULT 15 CHECK (buffer_minutes BETWEEN 0 AND 180),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id, day_of_week, start_time, end_time)
);

CREATE INDEX IF NOT EXISTS idx_agent_availability_rules_org_user
ON public.agent_availability_rules(organization_id, user_id, day_of_week);

CREATE TABLE IF NOT EXISTS public.calendar_sync_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'ics')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'connected', 'error', 'disconnected')
  ),
  external_calendar_id TEXT,
  external_account_email TEXT,
  connection_metadata JSONB,
  sync_error TEXT,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id, provider)
);

CREATE TABLE IF NOT EXISTS public.viewing_reschedule_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viewing_id UUID NOT NULL UNIQUE REFERENCES public.property_viewings(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_viewing_reschedule_links_token
ON public.viewing_reschedule_links(token);

CREATE TABLE IF NOT EXISTS public.field_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  viewing_id UUID REFERENCES public.property_viewings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  details TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_field_activity_logs_org_created
ON public.field_activity_logs(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type TEXT NOT NULL CHECK (
    run_type IN ('saved_search_alerts', 'follow_up_reminders', 'stale_pipeline', 'viewing_reminders')
  ),
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  summary JSONB,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS public.fraud_review_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.fraud_alerts(id) ON DELETE SET NULL,
  report_id UUID REFERENCES public.fraud_reports(id) ON DELETE SET NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'investigating', 'escalated', 'resolved', 'dismissed')
  ),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'critical')
  ),
  summary TEXT NOT NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_review_cases_status_priority
ON public.fraud_review_cases(status, priority, created_at DESC);

CREATE TABLE IF NOT EXISTS public.fraud_case_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.fraud_review_cases(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  note TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.organization_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_sync_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewing_reschedule_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_review_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_case_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.organization_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.document_signatures TO authenticated;
GRANT SELECT, INSERT ON public.document_activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_availability_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.calendar_sync_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.viewing_reschedule_links TO authenticated;
GRANT SELECT, INSERT ON public.field_activity_logs TO authenticated;
GRANT SELECT ON public.automation_runs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.fraud_review_cases TO authenticated;
GRANT SELECT, INSERT ON public.fraud_case_events TO authenticated;
GRANT SELECT ON public.organization_documents TO anon;

DROP POLICY IF EXISTS "Organization members can manage documents" ON public.organization_documents;
CREATE POLICY "Organization members can manage documents"
ON public.organization_documents FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_documents.organization_id
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_documents.organization_id
      AND membership.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Related users can view shared documents" ON public.organization_documents;
CREATE POLICY "Related users can view shared documents"
ON public.organization_documents FOR SELECT
USING (
  public_visibility = TRUE
  OR EXISTS (
    SELECT 1
    FROM public.deal_cases deal_case
    WHERE deal_case.id = organization_documents.deal_case_id
      AND deal_case.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.property_transactions property_transaction
    WHERE property_transaction.id = organization_documents.transaction_id
      AND property_transaction.payer_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Public can view shared trust documents" ON public.organization_documents;
CREATE POLICY "Public can view shared trust documents"
ON public.organization_documents FOR SELECT
TO anon
USING (
  public_visibility = TRUE
  AND status IN ('sent', 'partially_signed', 'signed')
);

DROP POLICY IF EXISTS "Accessible users can sign documents" ON public.document_signatures;
CREATE POLICY "Accessible users can sign documents"
ON public.document_signatures FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_documents document
    WHERE document.id = document_signatures.document_id
      AND (
        document.public_visibility = TRUE
        OR EXISTS (
          SELECT 1
          FROM public.organization_members membership
          WHERE membership.organization_id = document.organization_id
            AND membership.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.deal_cases deal_case
          WHERE deal_case.id = document.deal_case_id
            AND deal_case.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "Accessible users can create signatures" ON public.document_signatures;
CREATE POLICY "Accessible users can create signatures"
ON public.document_signatures FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_documents document
    WHERE document.id = document_signatures.document_id
      AND (
        document.public_visibility = TRUE
        OR EXISTS (
          SELECT 1
          FROM public.organization_members membership
          WHERE membership.organization_id = document.organization_id
            AND membership.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1
          FROM public.deal_cases deal_case
          WHERE deal_case.id = document.deal_case_id
            AND deal_case.user_id = auth.uid()
        )
      )
  )
);

DROP POLICY IF EXISTS "Organization members can log document activity" ON public.document_activity_logs;
CREATE POLICY "Organization members can log document activity"
ON public.document_activity_logs FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_documents document
    JOIN public.organization_members membership
      ON membership.organization_id = document.organization_id
    WHERE document.id = document_activity_logs.document_id
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_documents document
    JOIN public.organization_members membership
      ON membership.organization_id = document.organization_id
    WHERE document.id = document_activity_logs.document_id
      AND membership.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Organization members can manage availability" ON public.agent_availability_rules;
CREATE POLICY "Organization members can manage availability"
ON public.agent_availability_rules FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = agent_availability_rules.organization_id
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = agent_availability_rules.organization_id
      AND membership.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Members can manage calendar sync connections" ON public.calendar_sync_connections;
CREATE POLICY "Members can manage calendar sync connections"
ON public.calendar_sync_connections FOR ALL
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = calendar_sync_connections.organization_id
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = calendar_sync_connections.organization_id
      AND membership.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Organization members can manage reschedule links" ON public.viewing_reschedule_links;
CREATE POLICY "Organization members can manage reschedule links"
ON public.viewing_reschedule_links FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.property_viewings viewing
    JOIN public.organization_members membership
      ON membership.organization_id = viewing.organization_id
    WHERE viewing.id = viewing_reschedule_links.viewing_id
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.property_viewings viewing
    JOIN public.organization_members membership
      ON membership.organization_id = viewing.organization_id
    WHERE viewing.id = viewing_reschedule_links.viewing_id
      AND membership.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view own reschedule links" ON public.viewing_reschedule_links;
CREATE POLICY "Users can view own reschedule links"
ON public.viewing_reschedule_links FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.property_viewings viewing
    WHERE viewing.id = viewing_reschedule_links.viewing_id
      AND viewing.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Organization members can manage field activity logs" ON public.field_activity_logs;
CREATE POLICY "Organization members can manage field activity logs"
ON public.field_activity_logs FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = field_activity_logs.organization_id
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = field_activity_logs.organization_id
      AND membership.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Authenticated users can view automation runs" ON public.automation_runs;
CREATE POLICY "Authenticated users can view automation runs"
ON public.automation_runs FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage fraud review cases" ON public.fraud_review_cases;
CREATE POLICY "Authenticated users can manage fraud review cases"
ON public.fraud_review_cases FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can manage fraud case events" ON public.fraud_case_events;
CREATE POLICY "Authenticated users can manage fraud case events"
ON public.fraud_case_events FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

DROP TRIGGER IF EXISTS set_organization_documents_updated_at
ON public.organization_documents;
CREATE TRIGGER set_organization_documents_updated_at
BEFORE UPDATE ON public.organization_documents
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_agent_availability_rules_updated_at
ON public.agent_availability_rules;
CREATE TRIGGER set_agent_availability_rules_updated_at
BEFORE UPDATE ON public.agent_availability_rules
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_calendar_sync_connections_updated_at
ON public.calendar_sync_connections;
CREATE TRIGGER set_calendar_sync_connections_updated_at
BEFORE UPDATE ON public.calendar_sync_connections
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_fraud_review_cases_updated_at
ON public.fraud_review_cases;
CREATE TRIGGER set_fraud_review_cases_updated_at
BEFORE UPDATE ON public.fraud_review_cases
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'documents',
  'documents',
  FALSE,
  5242880,
  ARRAY['text/plain', 'application/pdf', 'application/json']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Authorized users can view organization documents" ON storage.objects;
CREATE POLICY "Authorized users can view organization documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (
    EXISTS (
      SELECT 1
      FROM public.organization_documents document
      WHERE document.signed_copy_bucket = 'documents'
        AND document.signed_copy_path = name
        AND (
          document.public_visibility = TRUE
          OR EXISTS (
            SELECT 1
            FROM public.organization_members membership
            WHERE membership.organization_id = document.organization_id
              AND membership.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.deal_cases deal_case
            WHERE deal_case.id = document.deal_case_id
              AND deal_case.user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1
            FROM public.property_transactions property_transaction
            WHERE property_transaction.id = document.transaction_id
              AND property_transaction.payer_user_id = auth.uid()
          )
        )
    )
  )
);

DROP POLICY IF EXISTS "Organization members can upload documents" ON storage.objects;
CREATE POLICY "Organization members can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id::text = (storage.foldername(name))[1]
      AND membership.user_id = auth.uid()
  )
);

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT jobid
  INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'baytmiftah-automation-dispatcher'
  LIMIT 1;

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  IF EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'project_url')
    AND EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key') THEN
    PERFORM cron.schedule(
      'baytmiftah-automation-dispatcher',
      '*/15 * * * *',
      $job$
        SELECT net.http_post(
          url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/automation-dispatcher',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
          ),
          body := jsonb_build_object('source', 'pg_cron', 'scheduled_at', now())
        ) AS request_id;
      $job$
    );
  END IF;
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'Cron/Vault tables are not available yet. Schedule automation-dispatcher after secrets are configured.';
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Cron schedule could not be created automatically. Configure it manually after deployment.';
END $$;

COMMENT ON TABLE public.organization_documents IS 'Organization deal documents, signed copies, and versioned agreement records.';
COMMENT ON TABLE public.document_signatures IS 'Typed or system-captured signatures linked to organization documents.';
COMMENT ON TABLE public.agent_availability_rules IS 'Team availability windows used for viewing scheduling and sync exports.';
COMMENT ON TABLE public.calendar_sync_connections IS 'External calendar connection metadata for Google, Outlook, or ICS exports.';
COMMENT ON TABLE public.field_activity_logs IS 'Quick field-mode notes captured during visits, handoffs, or inspections.';
COMMENT ON TABLE public.automation_runs IS 'Execution logs for scheduled saved-search, viewing, and follow-up automation.';
COMMENT ON TABLE public.fraud_review_cases IS 'Internal moderation cases tracking review, escalation, and resolution steps.';
