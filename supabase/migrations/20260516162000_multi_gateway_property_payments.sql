-- Open the property payment ledger to the gateway set BaytMiftah will support.
-- Refunds remain Paystack-only until provider-specific refund adapters are added.

ALTER TABLE public.property_transactions
  DROP CONSTRAINT IF EXISTS property_transactions_provider_check;

ALTER TABLE public.property_transactions
  ALTER COLUMN provider SET DEFAULT 'paystack';

ALTER TABLE public.property_transactions
  ADD CONSTRAINT property_transactions_provider_check
  CHECK (provider IN ('paystack', 'flutterwave', 'it_consortium'));

CREATE INDEX IF NOT EXISTS idx_property_transactions_provider_status_created_at
ON public.property_transactions(provider, status, created_at DESC);

COMMENT ON TABLE public.property_transactions IS
  'Property-specific fiat payments processed through Paystack, Flutterwave, or IT Consortium.';

COMMENT ON COLUMN public.property_transactions.provider IS
  'Payment gateway provider: paystack, flutterwave, or it_consortium.';

COMMENT ON TABLE public.property_refunds IS
  'Property payment refunds. Currently Paystack-only until provider-specific refund adapters are enabled.';
