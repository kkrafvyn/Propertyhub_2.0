-- BaytMiftah payment processor unification.
-- Paystack, Stripe, and Flutterwave now share the same escrow release/refund contract.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS flutterwave_beneficiary_id TEXT,
  ADD COLUMN IF NOT EXISTS flutterwave_transfer_beneficiary_id TEXT,
  ADD COLUMN IF NOT EXISTS flutterwave_account_bank TEXT,
  ADD COLUMN IF NOT EXISTS flutterwave_account_number TEXT;

ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS flutterwave_plan_id_ghs TEXT,
  ADD COLUMN IF NOT EXISTS flutterwave_plan_id_usd TEXT,
  ADD COLUMN IF NOT EXISTS flutterwave_plan_id_gbp TEXT,
  ADD COLUMN IF NOT EXISTS flutterwave_plan_id_eur TEXT;

ALTER TABLE public.organization_subscriptions
  DROP CONSTRAINT IF EXISTS organization_subscriptions_provider_check;

ALTER TABLE public.organization_subscriptions
  ADD CONSTRAINT organization_subscriptions_provider_check
  CHECK (provider IN ('paystack', 'stripe', 'flutterwave'));

ALTER TABLE public.organization_subscriptions
  ADD COLUMN IF NOT EXISTS flutterwave_payment_plan_id TEXT,
  ADD COLUMN IF NOT EXISTS flutterwave_subscription_id TEXT;

ALTER TABLE public.organization_subscription_payments
  DROP CONSTRAINT IF EXISTS organization_subscription_payments_provider_check;

ALTER TABLE public.organization_subscription_payments
  ADD CONSTRAINT organization_subscription_payments_provider_check
  CHECK (provider IN ('paystack', 'stripe', 'flutterwave'));

ALTER TABLE public.organization_subscription_payments
  ADD COLUMN IF NOT EXISTS flutterwave_transaction_id TEXT,
  ADD COLUMN IF NOT EXISTS flutterwave_payment_plan_id TEXT;

ALTER TABLE public.property_refunds
  DROP CONSTRAINT IF EXISTS property_refunds_provider_check;

ALTER TABLE public.property_refunds
  ADD CONSTRAINT property_refunds_provider_check
  CHECK (provider IN ('paystack', 'stripe', 'flutterwave'));

ALTER TABLE public.property_refunds
  ADD COLUMN IF NOT EXISTS provider_response JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.property_escrows
  DROP CONSTRAINT IF EXISTS property_escrows_payment_processor_check;

ALTER TABLE public.property_escrows
  ADD CONSTRAINT property_escrows_payment_processor_check
  CHECK (payment_processor IN ('paystack', 'stripe', 'flutterwave'));

ALTER TABLE public.property_escrows
  ADD COLUMN IF NOT EXISTS processor_transfer_provider TEXT CHECK (
    processor_transfer_provider IS NULL
    OR processor_transfer_provider IN ('paystack', 'stripe', 'flutterwave')
  ),
  ADD COLUMN IF NOT EXISTS processor_transfer_reference TEXT,
  ADD COLUMN IF NOT EXISTS processor_transfer_code TEXT,
  ADD COLUMN IF NOT EXISTS processor_refund_provider TEXT CHECK (
    processor_refund_provider IS NULL
    OR processor_refund_provider IN ('paystack', 'stripe', 'flutterwave')
  ),
  ADD COLUMN IF NOT EXISTS processor_refund_reference TEXT;

CREATE OR REPLACE FUNCTION private.set_property_escrow_payment_processor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  transaction_provider TEXT;
BEGIN
  SELECT provider
  INTO transaction_provider
  FROM public.property_transactions
  WHERE id = NEW.transaction_id;

  NEW.payment_processor := CASE
    WHEN transaction_provider IN ('stripe', 'flutterwave') THEN transaction_provider
    ELSE 'paystack'
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.set_property_escrow_payment_processor() FROM PUBLIC;

COMMENT ON COLUMN public.organizations.flutterwave_beneficiary_id IS
  'Optional Flutterwave beneficiary identifier for escrow releases.';

COMMENT ON COLUMN public.organizations.flutterwave_transfer_beneficiary_id IS
  'Optional Flutterwave transfer beneficiary identifier for escrow releases.';

COMMENT ON COLUMN public.organizations.flutterwave_account_bank IS
  'Flutterwave payout bank code. Restrict access through organization RLS and admin-only payout setup screens.';

COMMENT ON COLUMN public.organizations.flutterwave_account_number IS
  'Flutterwave payout account number. Treat as sensitive payout data and do not expose publicly.';

COMMENT ON COLUMN public.subscription_tiers.flutterwave_plan_id_ghs IS
  'Flutterwave recurring payment plan ID for GHS SaaS subscriptions.';

COMMENT ON COLUMN public.organization_subscriptions.flutterwave_payment_plan_id IS
  'Flutterwave recurring payment plan ID used for this workspace subscription.';

COMMENT ON COLUMN public.property_escrows.payment_processor IS
  'Processor that collected the escrow funds and must be used for release/refund: paystack, stripe, or flutterwave.';

COMMENT ON COLUMN public.property_escrows.processor_transfer_reference IS
  'Provider-neutral transfer reference for the escrow release.';

COMMENT ON COLUMN public.property_escrows.processor_refund_reference IS
  'Provider-neutral refund reference for escrow cancellation or dispute resolution.';

COMMENT ON TABLE public.property_refunds IS
  'Refund attempts and webhook-driven lifecycle state for Paystack, Stripe, and Flutterwave property payments.';

NOTIFY pgrst, 'reload schema';
