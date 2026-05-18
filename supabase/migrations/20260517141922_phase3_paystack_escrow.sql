-- BaytMiftah Phase 3: Paystack escrow, document gate, dispute/release audit trail.
-- Payments stay in Paystack. This ledger tracks the neutral hold/release workflow.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS paystack_transfer_recipient_code TEXT,
  ADD COLUMN IF NOT EXISTS paystack_subaccount_code TEXT,
  ADD COLUMN IF NOT EXISTS escrow_release_account_label TEXT;

ALTER TABLE public.organization_documents
  DROP CONSTRAINT IF EXISTS organization_documents_document_type_check;

ALTER TABLE public.organization_documents
  ADD CONSTRAINT organization_documents_document_type_check
  CHECK (
    document_type IN (
      'agreement',
      'offer_letter',
      'lease_contract',
      'sale_contract',
      'receipt_attachment',
      'identity_pack',
      'ownership_deed',
      'tenancy_agreement',
      'landlord_id',
      'escrow_evidence',
      'other'
    )
  );

ALTER TABLE public.verification_hashes
  DROP CONSTRAINT IF EXISTS verification_hashes_document_type_check;

ALTER TABLE public.verification_hashes
  ADD CONSTRAINT verification_hashes_document_type_check
  CHECK (
    document_type IN (
      'title_deed',
      'lease_agreement',
      'inspection_report',
      'utility_bill',
      'id_verification',
      'business_registration',
      'payment_receipt',
      'escrow_document',
      'escrow_release',
      'escrow_refund',
      'escrow_dispute_resolution',
      'other'
    )
  );

CREATE TABLE IF NOT EXISTS public.property_escrows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES public.property_transactions(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  payer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (
    status IN (
      'initiated',
      'held',
      'docs_pending',
      'docs_approved',
      'released',
      'disputed',
      'refunded',
      'cancelled'
    )
  ),
  required_document_types TEXT[] NOT NULL DEFAULT ARRAY[
    'ownership_deed',
    'tenancy_agreement',
    'landlord_id'
  ],
  cancellation_deadline_at TIMESTAMPTZ,
  documents_submitted_at TIMESTAMPTZ,
  documents_approved_at TIMESTAMPTZ,
  renter_confirmed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  disputed_at TIMESTAMPTZ,
  disputed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  dispute_reason TEXT,
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution TEXT CHECK (
    resolution IS NULL OR resolution IN ('release_to_organization', 'refund_to_payer')
  ),
  resolution_note TEXT,
  paystack_transfer_reference TEXT,
  paystack_transfer_code TEXT,
  paystack_refund_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.property_escrow_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES public.property_escrows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  organization_document_id UUID REFERENCES public.organization_documents(id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL CHECK (
    document_type IN ('ownership_deed', 'tenancy_agreement', 'landlord_id', 'escrow_evidence', 'other')
  ),
  title TEXT NOT NULL,
  document_sha256 TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (
    status IN ('uploaded', 'approved', 'rejected')
  ),
  rejection_reason TEXT,
  reviewed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (escrow_id, document_type)
);

CREATE TABLE IF NOT EXISTS public.property_escrow_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID NOT NULL REFERENCES public.property_escrows(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_event_hash TEXT,
  event_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_escrows_org_status_created
ON public.property_escrows(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_escrows_payer_created
ON public.property_escrows(payer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_escrows_listing
ON public.property_escrows(listing_id);

CREATE INDEX IF NOT EXISTS idx_property_escrow_documents_escrow_status
ON public.property_escrow_documents(escrow_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_escrow_events_escrow_created
ON public.property_escrow_events(escrow_id, created_at DESC);

ALTER TABLE public.property_escrows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_escrow_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_escrow_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.property_escrows TO authenticated;
GRANT SELECT, INSERT ON public.property_escrow_documents TO authenticated;
GRANT SELECT ON public.property_escrow_events TO authenticated;

DROP POLICY IF EXISTS "Escrow parties and admins can view escrows" ON public.property_escrows;
CREATE POLICY "Escrow parties and admins can view escrows"
ON public.property_escrows FOR SELECT
USING (
  payer_user_id = auth.uid()
  OR private.is_platform_admin()
  OR private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Escrow parties and admins can view escrow documents" ON public.property_escrow_documents;
CREATE POLICY "Escrow parties and admins can view escrow documents"
ON public.property_escrow_documents FOR SELECT
USING (
  private.is_platform_admin()
  OR private.is_organization_member(organization_id)
  OR EXISTS (
    SELECT 1
    FROM public.property_escrows escrow
    WHERE escrow.id = property_escrow_documents.escrow_id
      AND escrow.payer_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Organization members can add escrow documents" ON public.property_escrow_documents;
CREATE POLICY "Organization members can add escrow documents"
ON public.property_escrow_documents FOR INSERT
WITH CHECK (
  private.is_organization_member(organization_id)
);

DROP POLICY IF EXISTS "Escrow parties and admins can view escrow events" ON public.property_escrow_events;
CREATE POLICY "Escrow parties and admins can view escrow events"
ON public.property_escrow_events FOR SELECT
USING (
  private.is_platform_admin()
  OR private.is_organization_member(organization_id)
  OR EXISTS (
    SELECT 1
    FROM public.property_escrows escrow
    WHERE escrow.id = property_escrow_events.escrow_id
      AND escrow.payer_user_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS set_property_escrows_updated_at ON public.property_escrows;
CREATE TRIGGER set_property_escrows_updated_at
BEFORE UPDATE ON public.property_escrows
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_property_escrow_documents_updated_at ON public.property_escrow_documents;
CREATE TRIGGER set_property_escrow_documents_updated_at
BEFORE UPDATE ON public.property_escrow_documents
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

CREATE OR REPLACE FUNCTION private.create_property_escrow_after_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions, pg_temp
AS $$
DECLARE
  created_escrow_id UUID;
  previous_hash TEXT;
  payload JSONB;
BEGIN
  IF NEW.status <> 'success' THEN
    RETURN NEW;
  END IF;

  IF NEW.purpose NOT IN ('deposit', 'booking_fee') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.property_escrows (
    transaction_id,
    listing_id,
    property_id,
    organization_id,
    deal_case_id,
    payer_user_id,
    amount_minor,
    currency,
    status,
    cancellation_deadline_at,
    metadata
  )
  VALUES (
    NEW.id,
    NEW.listing_id,
    NEW.property_id,
    NEW.organization_id,
    NEW.deal_case_id,
    NEW.payer_user_id,
    NEW.amount_minor,
    NEW.currency,
    'held',
    COALESCE(NEW.paid_at, NOW()) + INTERVAL '24 hours',
    jsonb_build_object(
      'source', 'payment_success_trigger',
      'provider_reference', NEW.provider_reference,
      'purpose', NEW.purpose
    )
  )
  ON CONFLICT (transaction_id) DO UPDATE SET
    status = CASE
      WHEN public.property_escrows.status = 'initiated' THEN 'held'
      ELSE public.property_escrows.status
    END,
    updated_at = NOW()
  RETURNING id INTO created_escrow_id;

  SELECT event_hash
  INTO previous_hash
  FROM public.property_escrow_events
  WHERE escrow_id = created_escrow_id
  ORDER BY created_at DESC
  LIMIT 1;

  payload := jsonb_build_object(
    'transaction_id', NEW.id,
    'provider_reference', NEW.provider_reference,
    'amount_minor', NEW.amount_minor,
    'currency', NEW.currency,
    'status', 'held',
    'generated_at', NOW()
  );

  INSERT INTO public.property_escrow_events (
    escrow_id,
    organization_id,
    actor_user_id,
    event_type,
    event_payload,
    previous_event_hash,
    event_hash
  )
  VALUES (
    created_escrow_id,
    NEW.organization_id,
    NEW.payer_user_id,
    'escrow_held',
    payload,
    previous_hash,
    encode(extensions.digest((payload || jsonb_build_object('previous_event_hash', previous_hash))::text, 'sha256'), 'hex')
  );

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.create_property_escrow_after_payment() FROM PUBLIC;

DROP TRIGGER IF EXISTS create_property_escrow_after_payment ON public.property_transactions;
CREATE TRIGGER create_property_escrow_after_payment
AFTER INSERT OR UPDATE OF status
ON public.property_transactions
FOR EACH ROW
EXECUTE FUNCTION private.create_property_escrow_after_payment();

COMMENT ON TABLE public.property_escrows IS
  'Paystack-backed escrow hold/release state for deposit and booking payments. Funds are held in BaytMiftah Paystack account until document and confirmation gates pass.';

COMMENT ON TABLE public.property_escrow_documents IS
  'Escrow document gate records linked to internal organization documents and SHA-256 document hashes.';

COMMENT ON TABLE public.property_escrow_events IS
  'Immutable-style escrow audit events chained with SHA-256 hashes inside Postgres.';

NOTIFY pgrst, 'reload schema';
