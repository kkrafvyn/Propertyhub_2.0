-- BaytMiftah KYC is performed in-app through AI pre-screening and human review.
-- This prevents new submissions from being routed to external identity providers.
UPDATE public.platform_kyc_policies
SET provider_engine = 'internal-kyc',
    updated_at = NOW()
WHERE provider_engine IS DISTINCT FROM 'internal-kyc';

COMMENT ON COLUMN public.kyc_submissions.provider_engine IS
  'Server-assigned KYC route. BaytMiftah uses internal-kyc: AI pre-screening plus human review.';
