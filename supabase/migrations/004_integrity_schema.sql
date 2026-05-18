-- BaytMiftah Integrity Verification Layer
-- Stores document and receipt hashes without wallet or external-contract dependencies.

CREATE TABLE IF NOT EXISTS public.verification_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (
    document_type IN (
      'title_deed',
      'lease_agreement',
      'inspection_report',
      'utility_bill',
      'id_verification',
      'payment_receipt',
      'business_registration',
      'other'
    )
  ),
  hash_algorithm TEXT NOT NULL DEFAULT 'SHA-256',
  hash_value TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  verification_timestamp TIMESTAMPTZ,
  uploaded_by UUID REFERENCES public.users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, document_id, hash_value)
);

CREATE TABLE IF NOT EXISTS public.integrity_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'document_hash_created',
      'document_verified',
      'receipt_hash_created',
      'receipt_verified',
      'escrow_reviewed',
      'admin_resolution',
      'other'
    )
  ),
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  hash_algorithm TEXT NOT NULL DEFAULT 'SHA-256',
  hash_value TEXT,
  previous_event_hash TEXT,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_hash TEXT NOT NULL,
  signed_at TIMESTAMPTZ,
  signature TEXT,
  public_key_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_hashes_org_doc
ON public.verification_hashes(organization_id, document_id);

CREATE INDEX IF NOT EXISTS idx_verification_hashes_hash
ON public.verification_hashes(hash_value);

CREATE INDEX IF NOT EXISTS idx_integrity_audit_events_org_created_at
ON public.integrity_audit_events(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integrity_audit_events_subject
ON public.integrity_audit_events(subject_type, subject_id, created_at DESC);

ALTER TABLE public.verification_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_audit_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.verification_hashes TO authenticated;
GRANT SELECT ON public.integrity_audit_events TO authenticated;

DROP POLICY IF EXISTS "Organization members can view verification hashes" ON public.verification_hashes;
CREATE POLICY "Organization members can view verification hashes"
ON public.verification_hashes FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = verification_hashes.organization_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Organization members can create verification hashes" ON public.verification_hashes;
CREATE POLICY "Organization members can create verification hashes"
ON public.verification_hashes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = verification_hashes.organization_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Organization members can update verification hashes" ON public.verification_hashes;
CREATE POLICY "Organization members can update verification hashes"
ON public.verification_hashes FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = verification_hashes.organization_id
      AND organization_member.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = verification_hashes.organization_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Organization members can view integrity audit events" ON public.integrity_audit_events;
CREATE POLICY "Organization members can view integrity audit events"
ON public.integrity_audit_events FOR SELECT
USING (
  organization_id IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = integrity_audit_events.organization_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS set_verification_hashes_updated_at
ON public.verification_hashes;

CREATE TRIGGER set_verification_hashes_updated_at
BEFORE UPDATE ON public.verification_hashes
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

COMMENT ON TABLE public.verification_hashes IS
  'Document and receipt SHA-256 hashes used for internal verification.';

COMMENT ON TABLE public.integrity_audit_events IS
  'Append-only integrity event log for hashed documents, receipts, and admin decisions.';
