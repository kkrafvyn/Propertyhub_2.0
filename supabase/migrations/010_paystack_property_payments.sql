-- Gateway-backed property payments with internal receipt integrity verification.
-- This migration adds a dedicated property payment ledger, receipt records,
-- and extends the integrity verification layer to support payment receipts.

CREATE TABLE IF NOT EXISTS public.property_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  payer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'paystack' CHECK (provider IN ('paystack')),
  provider_reference TEXT NOT NULL UNIQUE,
  provider_transaction_id TEXT,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  purpose TEXT NOT NULL DEFAULT 'other' CHECK (
    purpose IN ('deposit', 'rent', 'lease_fee', 'inspection_fee', 'booking_fee', 'purchase_installment', 'other')
  ),
  status TEXT NOT NULL DEFAULT 'initialized' CHECK (
    status IN ('initialized', 'pending', 'processing', 'success', 'failed', 'abandoned', 'reversed')
  ),
  payment_channel TEXT,
  authorization_url TEXT,
  access_code TEXT,
  paid_at TIMESTAMPTZ,
  gateway_response TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.transaction_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES public.property_transactions(id) ON DELETE CASCADE,
  receipt_number TEXT NOT NULL UNIQUE,
  storage_bucket TEXT NOT NULL DEFAULT 'receipts',
  storage_path TEXT NOT NULL,
  receipt_sha256 TEXT NOT NULL,
  receipt_payload JSONB NOT NULL,
  integrity_status TEXT NOT NULL DEFAULT 'hashed' CHECK (
    integrity_status IN ('pending', 'hashed', 'verified', 'failed')
  ),
  integrity_signature TEXT,
  integrity_public_key_id TEXT,
  verification_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_transactions_payer_created_at
ON public.property_transactions(payer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_transactions_org_created_at
ON public.property_transactions(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_transactions_status
ON public.property_transactions(status);

CREATE INDEX IF NOT EXISTS idx_property_transactions_listing
ON public.property_transactions(listing_id);

CREATE INDEX IF NOT EXISTS idx_transaction_receipts_integrity_status
ON public.transaction_receipts(integrity_status, created_at DESC);

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
      'payment_receipt'
    )
  );

ALTER TABLE public.property_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_receipts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.property_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.transaction_receipts TO authenticated;

DROP POLICY IF EXISTS "Users can view their own property transactions" ON public.property_transactions;
CREATE POLICY "Users can view their own property transactions"
ON public.property_transactions FOR SELECT
USING (auth.uid() = payer_user_id);

DROP POLICY IF EXISTS "Organization members can view property transactions" ON public.property_transactions;
CREATE POLICY "Organization members can view property transactions"
ON public.property_transactions FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = property_transactions.organization_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can create their own property transactions" ON public.property_transactions;
CREATE POLICY "Users can create their own property transactions"
ON public.property_transactions FOR INSERT
WITH CHECK (auth.uid() = payer_user_id);

DROP POLICY IF EXISTS "Users can update their own pending property transactions" ON public.property_transactions;
CREATE POLICY "Users can update their own pending property transactions"
ON public.property_transactions FOR UPDATE
USING (auth.uid() = payer_user_id)
WITH CHECK (auth.uid() = payer_user_id);

DROP POLICY IF EXISTS "Users can view their own transaction receipts" ON public.transaction_receipts;
CREATE POLICY "Users can view their own transaction receipts"
ON public.transaction_receipts FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.property_transactions property_transaction
    WHERE property_transaction.id = transaction_receipts.transaction_id
      AND property_transaction.payer_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Organization members can view transaction receipts" ON public.transaction_receipts;
CREATE POLICY "Organization members can view transaction receipts"
ON public.transaction_receipts FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.property_transactions property_transaction
    JOIN public.organization_members organization_member
      ON organization_member.organization_id = property_transaction.organization_id
    WHERE property_transaction.id = transaction_receipts.transaction_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS set_property_transactions_updated_at
ON public.property_transactions;

CREATE TRIGGER set_property_transactions_updated_at
BEFORE UPDATE ON public.property_transactions
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_transaction_receipts_updated_at
ON public.transaction_receipts;

CREATE TRIGGER set_transaction_receipts_updated_at
BEFORE UPDATE ON public.transaction_receipts
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

COMMENT ON TABLE public.property_transactions IS 'Property-specific fiat payments processed through configured payment gateways.';
COMMENT ON TABLE public.transaction_receipts IS 'Server-generated receipts and internal integrity metadata for property transactions.';
