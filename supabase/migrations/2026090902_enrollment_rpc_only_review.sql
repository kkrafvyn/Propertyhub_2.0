-- Force enrollment approve/reject through SECURITY DEFINER RPCs (no direct staff UPDATE).

DROP POLICY IF EXISTS "Platform staff review enrollment requests" ON public.organization_enrollment_requests;

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
    OR public.is_platform_staff()
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

CREATE OR REPLACE FUNCTION public.reject_organization_enrollment_request(
  p_request_id UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NOT (
    public.is_platform_admin()
    OR public.is_platform_staff()
    OR public.has_platform_console_grant('organizations')
  ) THEN
    RAISE EXCEPTION 'Access denied: platform enrollment review required';
  END IF;

  UPDATE public.organization_enrollment_requests
  SET
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    review_notes = p_review_notes,
    updated_at = NOW()
  WHERE id = p_request_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending enrollment request not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_organization_enrollment_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_organization_enrollment_request(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.reject_organization_enrollment_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_organization_enrollment_request(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
