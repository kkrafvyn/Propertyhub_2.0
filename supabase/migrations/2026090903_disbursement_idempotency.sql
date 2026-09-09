-- Disbursement idempotency: unique provider payout references.

CREATE UNIQUE INDEX IF NOT EXISTS estate_distribution_approvals_payout_reference_uidx
  ON public.estate_distribution_approvals (payout_reference)
  WHERE payout_reference IS NOT NULL;

ALTER TABLE public.estate_contractor_work_orders
  ADD COLUMN IF NOT EXISTS provider_disbursement_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS estate_work_orders_provider_disbursement_uidx
  ON public.estate_contractor_work_orders (provider_disbursement_id)
  WHERE provider_disbursement_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
