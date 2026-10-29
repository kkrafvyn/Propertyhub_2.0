-- Route new KYC submissions to internal review instead of Prembly (no paid provider calls).
UPDATE public.platform_kyc_policies
SET provider_engine = 'internal-kyc',
    updated_at = NOW()
WHERE provider_engine = 'prembly';
