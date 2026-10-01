-- Route Ghana KYC to Prembly. The edge function remains fail-closed until
-- PREMBLY_API_KEY and the contracted PREMBLY_VERIFICATION_PATH are configured.
UPDATE public.platform_kyc_policies
SET provider_engine = 'prembly', updated_at = NOW()
WHERE UPPER(jurisdiction_id) = 'GH';

COMMENT ON COLUMN public.kyc_submissions.provider_engine IS
  'Server-assigned KYC provider engine (for example prembly, smile-identity, or internal-kyc).';
