-- PayAngels payout lifecycle is provider-driven: a request is not paid until
-- the provider reports a successful settlement.
ALTER TABLE public.estate_distribution_approvals DROP CONSTRAINT IF EXISTS estate_distribution_approvals_status_check;
ALTER TABLE public.estate_distribution_approvals ADD CONSTRAINT estate_distribution_approvals_status_check CHECK (status IN ('pending','approved','processing','submitted','rejected','failed','paid'));
ALTER TABLE public.estate_distribution_approvals ADD COLUMN IF NOT EXISTS provider_status TEXT;
ALTER TABLE public.estate_distribution_approvals ADD COLUMN IF NOT EXISTS failure_reason TEXT;