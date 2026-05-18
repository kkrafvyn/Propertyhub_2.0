-- Paystack refund ledger and transaction refund lifecycle support.
-- This extends the property payment flow with partial/full refunds while
-- keeping immutable receipt hashes as proof of the original payment.

ALTER TABLE public.property_transactions
  DROP CONSTRAINT IF EXISTS property_transactions_status_check;

ALTER TABLE public.property_transactions
  ADD CONSTRAINT property_transactions_status_check
  CHECK (
    status IN (
      'initialized',
      'pending',
      'processing',
      'success',
      'failed',
      'abandoned',
      'reversal_pending',
      'reversed'
    )
  );

ALTER TABLE public.property_transactions
  ADD COLUMN IF NOT EXISTS refund_status TEXT,
  ADD COLUMN IF NOT EXISTS refunded_amount_minor BIGINT NOT NULL DEFAULT 0;

ALTER TABLE public.property_transactions
  DROP CONSTRAINT IF EXISTS property_transactions_refund_status_check;

ALTER TABLE public.property_transactions
  ADD CONSTRAINT property_transactions_refund_status_check
  CHECK (
    refund_status IS NULL OR refund_status IN (
      'pending',
      'processing',
      'needs_attention',
      'failed',
      'processed'
    )
  );

ALTER TABLE public.property_transactions
  DROP CONSTRAINT IF EXISTS property_transactions_refunded_amount_minor_check;

ALTER TABLE public.property_transactions
  ADD CONSTRAINT property_transactions_refunded_amount_minor_check
  CHECK (
    refunded_amount_minor >= 0
    AND refunded_amount_minor <= amount_minor
  );

CREATE TABLE IF NOT EXISTS public.property_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.property_transactions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  requested_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT 'paystack' CHECK (provider IN ('paystack')),
  provider_refund_id TEXT UNIQUE,
  provider_refund_reference TEXT,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  refund_type TEXT NOT NULL CHECK (refund_type IN ('partial', 'full')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'processing', 'needs_attention', 'failed', 'processed')
  ),
  refund_reason TEXT NOT NULL,
  customer_note TEXT,
  merchant_note TEXT,
  processor TEXT,
  expected_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  paystack_response JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_refunds_transaction_created_at
ON public.property_refunds(transaction_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_refunds_org_created_at
ON public.property_refunds(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_refunds_status_created_at
ON public.property_refunds(status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_property_refunds_provider_reference
ON public.property_refunds(provider_refund_reference)
WHERE provider_refund_reference IS NOT NULL;

ALTER TABLE public.property_refunds ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.property_refunds TO authenticated;

DROP POLICY IF EXISTS "Users can view their own property refunds" ON public.property_refunds;
CREATE POLICY "Users can view their own property refunds"
ON public.property_refunds FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.property_transactions property_transaction
    WHERE property_transaction.id = property_refunds.transaction_id
      AND property_transaction.payer_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Organization members can view property refunds" ON public.property_refunds;
CREATE POLICY "Organization members can view property refunds"
ON public.property_refunds FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members organization_member
    WHERE organization_member.organization_id = property_refunds.organization_id
      AND organization_member.user_id = auth.uid()
  )
);

DROP TRIGGER IF EXISTS set_property_refunds_updated_at
ON public.property_refunds;

CREATE TRIGGER set_property_refunds_updated_at
BEFORE UPDATE ON public.property_refunds
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

COMMENT ON TABLE public.property_refunds IS 'Refund attempts and webhook-driven lifecycle state for Paystack property payments.';
