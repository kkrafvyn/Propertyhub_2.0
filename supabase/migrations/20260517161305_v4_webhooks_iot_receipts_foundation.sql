-- BaytMiftah v4 remaining foundations: signed webhooks, public receipts, and Smart Property Access.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.transaction_receipts
  ADD COLUMN IF NOT EXISTS public_verification_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS verification_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS verification_pdf_url TEXT;

ALTER TABLE public.property_viewings
  ADD COLUMN IF NOT EXISTS smart_access_status TEXT NOT NULL DEFAULT 'not_enabled' CHECK (
    smart_access_status IN ('not_enabled', 'queued', 'generated', 'sent', 'revoked', 'failed')
  ),
  ADD COLUMN IF NOT EXISTS smart_access_grant_id UUID,
  ADD COLUMN IF NOT EXISTS smart_access_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('paystack', 'stripe', 'flutterwave')),
  provider_event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
  processing_status TEXT NOT NULL DEFAULT 'received' CHECK (
    processing_status IN ('received', 'processed', 'ignored', 'failed')
  ),
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_webhook_events_provider_created
ON public.payment_webhook_events(provider, created_at DESC);

CREATE TABLE IF NOT EXISTS public.public_verification_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES public.transaction_receipts(id) ON DELETE SET NULL,
  escrow_id UUID REFERENCES public.property_escrows(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  public_token TEXT NOT NULL UNIQUE,
  receipt_type TEXT NOT NULL DEFAULT 'escrow_verification' CHECK (
    receipt_type IN ('payment_receipt', 'escrow_verification', 'document_verification', 'condition_report')
  ),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_hash TEXT NOT NULL CHECK (length(payload_hash) = 64),
  rsa_signature TEXT,
  public_key_id TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_public_verification_receipts_token
ON public.public_verification_receipts(public_token);

CREATE TABLE IF NOT EXISTS public.property_iot_provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('ttlock', 'yale', 'tuya', 'manual')),
  status TEXT NOT NULL DEFAULT 'configured' CHECK (
    status IN ('configured', 'needs_attention', 'disabled')
  ),
  display_name TEXT NOT NULL,
  provider_account_reference TEXT,
  last_health_check_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, provider, display_name)
);

CREATE TABLE IF NOT EXISTS public.property_iot_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  provider_connection_id UUID REFERENCES public.property_iot_provider_connections(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('ttlock', 'yale', 'tuya', 'manual')),
  device_type TEXT NOT NULL CHECK (
    device_type IN ('smart_lock', 'gate_access', 'smart_meter', 'door_sensor', 'motion_sensor', 'energy_monitor')
  ),
  display_name TEXT NOT NULL,
  room_label TEXT,
  provider_device_id TEXT,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (
    status IN ('online', 'offline', 'needs_attention', 'disabled')
  ),
  battery_percent INTEGER CHECK (battery_percent IS NULL OR battery_percent BETWEEN 0 AND 100),
  last_seen_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_iot_devices_org_property
ON public.property_iot_devices(organization_id, property_id);

CREATE TABLE IF NOT EXISTS public.property_iot_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  viewing_id UUID REFERENCES public.property_viewings(id) ON DELETE SET NULL,
  escrow_id UUID REFERENCES public.property_escrows(id) ON DELETE SET NULL,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  granted_to_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  granted_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  access_reason TEXT NOT NULL CHECK (
    access_reason IN ('viewing', 'tenancy', 'maintenance', 'owner', 'admin', 'emergency')
  ),
  access_scope TEXT NOT NULL DEFAULT 'temporary_code' CHECK (
    access_scope IN ('temporary_code', 'digital_key', 'read_only_meter', 'entry_log_only')
  ),
  device_ids UUID[] NOT NULL DEFAULT '{}',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'active', 'expired', 'revoked', 'failed', 'frozen')
  ),
  access_code_hint TEXT,
  provider_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_property_iot_access_grants_user_status
ON public.property_iot_access_grants(granted_to_user_id, status, starts_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_iot_access_grants_org_property
ON public.property_iot_access_grants(organization_id, property_id, starts_at DESC);

CREATE TABLE IF NOT EXISTS public.property_iot_access_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  device_id UUID REFERENCES public.property_iot_devices(id) ON DELETE SET NULL,
  grant_id UUID REFERENCES public.property_iot_access_grants(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'grant_requested',
      'grant_created',
      'code_generated',
      'grant_sent',
      'unlock_attempted',
      'unlock_succeeded',
      'unlock_failed',
      'grant_revoked',
      'grant_expired',
      'grant_frozen',
      'provider_error'
    )
  ),
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_hash TEXT NOT NULL CHECK (length(event_hash) = 64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_iot_access_events_grant_created
ON public.property_iot_access_events(grant_id, created_at DESC);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_verification_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_iot_provider_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_iot_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_iot_access_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.payment_webhook_events TO authenticated;
GRANT SELECT ON public.public_verification_receipts TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.property_iot_provider_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.property_iot_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.property_iot_access_grants TO authenticated;
GRANT SELECT, INSERT ON public.property_iot_access_events TO authenticated;

DROP POLICY IF EXISTS "Platform admins can view webhook events" ON public.payment_webhook_events;
CREATE POLICY "Platform admins can view webhook events"
ON public.payment_webhook_events FOR SELECT
USING (private.is_platform_admin());

DROP POLICY IF EXISTS "Anyone can read public verification receipts" ON public.public_verification_receipts;
CREATE POLICY "Anyone can read public verification receipts"
ON public.public_verification_receipts FOR SELECT
USING (expires_at IS NULL OR expires_at > NOW());

DROP POLICY IF EXISTS "Org members can manage IoT provider connections" ON public.property_iot_provider_connections;
CREATE POLICY "Org members can manage IoT provider connections"
ON public.property_iot_provider_connections FOR ALL
USING (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
)
WITH CHECK (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Org members can manage IoT devices" ON public.property_iot_devices;
CREATE POLICY "Org members can manage IoT devices"
ON public.property_iot_devices FOR ALL
USING (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
)
WITH CHECK (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "IoT grants are visible to orgs admins and recipients" ON public.property_iot_access_grants;
CREATE POLICY "IoT grants are visible to orgs admins and recipients"
ON public.property_iot_access_grants FOR SELECT
USING (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
  OR granted_to_user_id = auth.uid()
);

DROP POLICY IF EXISTS "Org members can create IoT grants" ON public.property_iot_access_grants;
CREATE POLICY "Org members can create IoT grants"
ON public.property_iot_access_grants FOR INSERT
WITH CHECK (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Org members and admins can update IoT grants" ON public.property_iot_access_grants;
CREATE POLICY "Org members and admins can update IoT grants"
ON public.property_iot_access_grants FOR UPDATE
USING (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
)
WITH CHECK (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "IoT events are visible to orgs admins and recipients" ON public.property_iot_access_events;
CREATE POLICY "IoT events are visible to orgs admins and recipients"
ON public.property_iot_access_events FOR SELECT
USING (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
  OR EXISTS (
    SELECT 1
    FROM public.property_iot_access_grants grant_row
    WHERE grant_row.id = property_iot_access_events.grant_id
      AND grant_row.granted_to_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Org members can append IoT events" ON public.property_iot_access_events;
CREATE POLICY "Org members can append IoT events"
ON public.property_iot_access_events FOR INSERT
WITH CHECK (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
);

DROP TRIGGER IF EXISTS set_property_iot_provider_connections_updated_at ON public.property_iot_provider_connections;
CREATE TRIGGER set_property_iot_provider_connections_updated_at
BEFORE UPDATE ON public.property_iot_provider_connections
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_property_iot_devices_updated_at ON public.property_iot_devices;
CREATE TRIGGER set_property_iot_devices_updated_at
BEFORE UPDATE ON public.property_iot_devices
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_property_iot_access_grants_updated_at ON public.property_iot_access_grants;
CREATE TRIGGER set_property_iot_access_grants_updated_at
BEFORE UPDATE ON public.property_iot_access_grants
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

COMMENT ON TABLE public.payment_webhook_events IS
  'Idempotency and audit rows for signed payment processor webhook events.';

COMMENT ON TABLE public.public_verification_receipts IS
  'Public, token-addressable receipt summaries containing hashes and signatures, not private documents.';

COMMENT ON TABLE public.property_iot_devices IS
  'Smart Property Access device registry. Provider secrets must stay in server-side integrations only.';

COMMENT ON TABLE public.property_iot_access_grants IS
  'Time-boxed user access grants for viewings, tenancy handoff, maintenance, and emergency access.';

NOTIFY pgrst, 'reload schema';
