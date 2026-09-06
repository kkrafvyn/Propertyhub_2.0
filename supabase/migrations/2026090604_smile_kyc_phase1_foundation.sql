-- Smile Identity provider fields + Phase 1 org profile defaults + app release manifest

ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS provider_job_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_reference TEXT,
  ADD COLUMN IF NOT EXISTS provider_status TEXT;

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_provider_job
  ON public.kyc_submissions(provider_job_id)
  WHERE provider_job_id IS NOT NULL;

UPDATE public.platform_kyc_policies
SET provider_engine = 'smile-identity', updated_at = NOW()
WHERE jurisdiction_id = 'GH';

-- Default SaaS entitlements for new organizations (trial business plan)
CREATE OR REPLACE FUNCTION public.ensure_organization_entitlement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.saas_organization_entitlements (
    organization_id,
    plan_code,
    status,
    limits
  )
  VALUES (
    NEW.id,
    CASE
      WHEN NEW.workspace_kind = 'personal' THEN 'personal'
      ELSE 'business_trial'
    END,
    'trial',
    CASE
      WHEN NEW.workspace_kind = 'personal' THEN
        '{"max_users":3,"max_properties":25,"desktop_enabled":false,"ai_requests_monthly":50,"modules":"core"}'::JSONB
      ELSE
        '{"max_users":25,"max_properties":500,"desktop_enabled":true,"ai_requests_monthly":500,"modules":"standard"}'::JSONB
    END
  )
  ON CONFLICT (organization_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_organization_entitlement ON public.organizations;
CREATE TRIGGER trg_ensure_organization_entitlement
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.ensure_organization_entitlement();

COMMENT ON COLUMN public.kyc_submissions.provider_job_id IS 'External KYC provider job/reference (e.g. Smile Identity smile_job_id).';
