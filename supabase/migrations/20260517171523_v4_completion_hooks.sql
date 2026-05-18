-- BaytMiftah v4 completion hooks: payout setup, printable receipts,
-- condition report media, and Smart Property Access command audit.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS payment_setup_status TEXT NOT NULL DEFAULT 'not_started' CHECK (
    payment_setup_status IN ('not_started', 'needs_details', 'ready', 'needs_review', 'disabled')
  ),
  ADD COLUMN IF NOT EXISTS flutterwave_subaccount_id TEXT,
  ADD COLUMN IF NOT EXISTS payout_setup_notes TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_checklist JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

ALTER TABLE public.transaction_receipts
  ADD COLUMN IF NOT EXISTS receipt_html TEXT,
  ADD COLUMN IF NOT EXISTS receipt_pdf_status TEXT NOT NULL DEFAULT 'html_ready' CHECK (
    receipt_pdf_status IN ('not_started', 'html_ready', 'generated', 'failed')
  ),
  ADD COLUMN IF NOT EXISTS receipt_generated_at TIMESTAMPTZ;

ALTER TABLE public.property_condition_reports
  ADD COLUMN IF NOT EXISTS photo_storage_paths TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS photo_captured_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.property_iot_command_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  device_id UUID REFERENCES public.property_iot_devices(id) ON DELETE SET NULL,
  grant_id UUID REFERENCES public.property_iot_access_grants(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL CHECK (provider IN ('ttlock', 'yale', 'tuya', 'manual')),
  command_type TEXT NOT NULL CHECK (
    command_type IN (
      'generate_viewing_code',
      'send_access_grant',
      'revoke_access_grant',
      'sync_device_health'
    )
  ),
  command_status TEXT NOT NULL DEFAULT 'queued' CHECK (
    command_status IN ('queued', 'sent', 'succeeded', 'failed', 'skipped')
  ),
  provider_reference TEXT,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_iot_command_events_org_created
ON public.property_iot_command_events(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_iot_command_events_grant_created
ON public.property_iot_command_events(grant_id, created_at DESC);

ALTER TABLE public.property_iot_command_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.property_iot_command_events TO authenticated;

DROP POLICY IF EXISTS "Org members and admins can read Smart Access command events"
ON public.property_iot_command_events;
CREATE POLICY "Org members and admins can read Smart Access command events"
ON public.property_iot_command_events FOR SELECT
USING (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Org members and admins can append Smart Access command events"
ON public.property_iot_command_events;
CREATE POLICY "Org members and admins can append Smart Access command events"
ON public.property_iot_command_events FOR INSERT
WITH CHECK (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
);

CREATE OR REPLACE FUNCTION public.reject_property_iot_command_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'property_iot_command_events is append-only';
END;
$$;

DROP TRIGGER IF EXISTS reject_property_iot_command_event_update
ON public.property_iot_command_events;
CREATE TRIGGER reject_property_iot_command_event_update
BEFORE UPDATE ON public.property_iot_command_events
FOR EACH ROW EXECUTE FUNCTION public.reject_property_iot_command_event_mutation();

DROP TRIGGER IF EXISTS reject_property_iot_command_event_delete
ON public.property_iot_command_events;
CREATE TRIGGER reject_property_iot_command_event_delete
BEFORE DELETE ON public.property_iot_command_events
FOR EACH ROW EXECUTE FUNCTION public.reject_property_iot_command_event_mutation();

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'condition-report-media',
  'condition-report-media',
  FALSE,
  20971520,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Condition media is visible to escrow parties and orgs"
ON storage.objects;
CREATE POLICY "Condition media is visible to escrow parties and orgs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'condition-report-media'
  AND (
    private.can_manage_platform()
    OR private.is_organization_member(((storage.foldername(name))[1])::uuid)
    OR ((storage.foldername(name))[3])::uuid = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.property_escrows escrow
      WHERE escrow.id::text = (storage.foldername(name))[2]
        AND escrow.payer_user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Condition media can be uploaded by escrow parties and orgs"
ON storage.objects;
CREATE POLICY "Condition media can be uploaded by escrow parties and orgs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'condition-report-media'
  AND (
    private.can_manage_platform()
    OR private.is_organization_member(((storage.foldername(name))[1])::uuid)
    OR (
      ((storage.foldername(name))[3])::uuid = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM public.property_escrows escrow
        WHERE escrow.id::text = (storage.foldername(name))[2]
          AND escrow.payer_user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Condition media can be updated by owners and orgs"
ON storage.objects;
CREATE POLICY "Condition media can be updated by owners and orgs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'condition-report-media'
  AND (
    private.can_manage_platform()
    OR private.is_organization_member(((storage.foldername(name))[1])::uuid)
    OR ((storage.foldername(name))[3])::uuid = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'condition-report-media'
  AND (
    private.can_manage_platform()
    OR private.is_organization_member(((storage.foldername(name))[1])::uuid)
    OR ((storage.foldername(name))[3])::uuid = auth.uid()
  )
);

DROP POLICY IF EXISTS "Condition media can be deleted by owners and orgs"
ON storage.objects;
CREATE POLICY "Condition media can be deleted by owners and orgs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'condition-report-media'
  AND (
    private.can_manage_platform()
    OR private.is_organization_member(((storage.foldername(name))[1])::uuid)
    OR ((storage.foldername(name))[3])::uuid = auth.uid()
  )
);

COMMENT ON COLUMN public.organizations.payment_setup_status IS
  'Operational payout readiness for Paystack, Stripe, or later Flutterwave lanes.';

COMMENT ON COLUMN public.transaction_receipts.receipt_html IS
  'Print-ready receipt HTML used by public verification pages and Save as PDF browser flows.';

COMMENT ON TABLE public.property_iot_command_events IS
  'Append-only command audit for Smart Property Access provider requests.';

NOTIFY pgrst, 'reload schema';
