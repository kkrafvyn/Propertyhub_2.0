-- Personal workspace kind, KYC-gated enrollment, platform KYC policies per jurisdiction

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS workspace_kind TEXT NOT NULL DEFAULT 'company'
    CHECK (workspace_kind IN ('personal', 'company'));

ALTER TABLE public.organization_enrollment_requests
  ADD COLUMN IF NOT EXISTS workspace_kind TEXT NOT NULL DEFAULT 'company'
    CHECK (workspace_kind IN ('personal', 'company'));

ALTER TABLE public.organization_enrollment_requests
  ADD COLUMN IF NOT EXISTS operating_jurisdiction TEXT NOT NULL DEFAULT 'GH';

ALTER TABLE public.organization_enrollment_requests
  ADD COLUMN IF NOT EXISTS kyc_submission_id UUID REFERENCES public.kyc_submissions(id) ON DELETE SET NULL;

ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS context TEXT NOT NULL DEFAULT 'consumer'
    CHECK (context IN ('consumer', 'workspace'));

ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS jurisdiction_id TEXT;

ALTER TABLE public.kyc_submissions
  ADD COLUMN IF NOT EXISTS provider_engine TEXT;

CREATE INDEX IF NOT EXISTS idx_kyc_submissions_context_status
  ON public.kyc_submissions(context, status, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_enrollment_workspace_kind
  ON public.organization_enrollment_requests(workspace_kind, status);

-- Platform-wide KYC policy per jurisdiction (admin configurable)
CREATE TABLE IF NOT EXISTS public.platform_kyc_policies (
  jurisdiction_id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  consumer_booking_required BOOLEAN NOT NULL DEFAULT TRUE,
  workspace_enrollment_required BOOLEAN NOT NULL DEFAULT TRUE,
  provider_engine TEXT NOT NULL DEFAULT 'internal-kyc',
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

ALTER TABLE public.platform_kyc_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read kyc policies" ON public.platform_kyc_policies;
CREATE POLICY "Authenticated read kyc policies"
  ON public.platform_kyc_policies FOR SELECT
  TO authenticated
  USING (enabled = TRUE);

DROP POLICY IF EXISTS "Platform staff manage kyc policies" ON public.platform_kyc_policies;
CREATE POLICY "Platform staff manage kyc policies"
  ON public.platform_kyc_policies FOR ALL
  USING (
    public.is_platform_admin()
    OR public.has_platform_console_grant('trust')
    OR public.has_platform_console_grant('organizations')
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.has_platform_console_grant('trust')
    OR public.has_platform_console_grant('organizations')
  );

INSERT INTO public.platform_kyc_policies (
  jurisdiction_id, label, consumer_booking_required, workspace_enrollment_required, provider_engine
)
VALUES
  ('GH', 'Ghana', TRUE, TRUE, 'ghana-trust'),
  ('NG', 'Nigeria', TRUE, TRUE, 'internal-kyc'),
  ('KE', 'Kenya', TRUE, TRUE, 'internal-kyc'),
  ('ZA', 'South Africa', TRUE, TRUE, 'internal-kyc'),
  ('US', 'United States', TRUE, TRUE, 'transunion-smartmove'),
  ('GB', 'United Kingdom', TRUE, TRUE, 'internal-kyc'),
  ('EU', 'European Union', TRUE, TRUE, 'internal-kyc'),
  ('AE', 'United Arab Emirates', TRUE, TRUE, 'internal-kyc'),
  ('CA', 'Canada', TRUE, TRUE, 'internal-kyc'),
  ('AU', 'Australia', TRUE, TRUE, 'internal-kyc'),
  ('IN', 'India', TRUE, TRUE, 'internal-kyc'),
  ('GLOBAL', 'International (default)', TRUE, TRUE, 'internal-kyc')
ON CONFLICT (jurisdiction_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_user_kyc_verified(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.kyc_submissions ks
    WHERE ks.user_id = p_user_id
      AND ks.status = 'verified'
  )
  OR EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = p_user_id
      AND u.verified = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.user_has_kyc_submission(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.kyc_submissions ks
    WHERE ks.user_id = p_user_id
      AND ks.status IN ('submitted', 'in_review', 'verified')
  );
$$;

CREATE OR REPLACE FUNCTION public.approve_organization_enrollment_request(
  p_request_id UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_request public.organization_enrollment_requests%ROWTYPE;
  v_org_id UUID;
  v_slug TEXT;
  v_is_personal BOOLEAN;
BEGIN
  IF NOT (
    public.is_platform_admin()
    OR public.has_platform_console_grant('organizations')
  ) THEN
    RAISE EXCEPTION 'Access denied: platform enrollment approval required';
  END IF;

  SELECT * INTO v_request
  FROM public.organization_enrollment_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Enrollment request is not pending';
  END IF;

  IF NOT public.is_user_kyc_verified(v_request.requester_user_id) THEN
    RAISE EXCEPTION 'Applicant identity verification (KYC) must be approved before workspace access is granted';
  END IF;

  v_is_personal := COALESCE(v_request.workspace_kind, 'company') = 'personal';
  v_slug := lower(trim(v_request.desired_slug));
  IF v_slug IS NULL OR length(v_slug) = 0 THEN
    RAISE EXCEPTION 'Invalid workspace slug';
  END IF;

  IF EXISTS (SELECT 1 FROM public.organizations o WHERE lower(o.slug) = v_slug) THEN
    RAISE EXCEPTION 'Workspace slug already taken';
  END IF;

  INSERT INTO public.organizations (
    name,
    slug,
    description,
    email,
    phone,
    website,
    owner_id,
    verified,
    suspended,
    business_types,
    company_setup_completed,
    workspace_kind
  )
  VALUES (
    v_request.company_name,
    v_slug,
    v_request.description,
    v_request.contact_email,
    v_request.contact_phone,
    v_request.website,
    v_request.requester_user_id,
    TRUE,
    FALSE,
    CASE
      WHEN v_is_personal THEN ARRAY['property_owner']::TEXT[]
      ELSE COALESCE(v_request.business_types, '{}')
    END,
    CASE WHEN v_is_personal THEN TRUE ELSE FALSE END,
    COALESCE(v_request.workspace_kind, 'company')
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role
  )
  VALUES (
    v_org_id,
    v_request.requester_user_id,
    'owner'
  );

  UPDATE public.organization_enrollment_requests
  SET
    status = 'approved',
    organization_id = v_org_id,
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    review_notes = p_review_notes,
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN v_org_id;
END;
$$;
