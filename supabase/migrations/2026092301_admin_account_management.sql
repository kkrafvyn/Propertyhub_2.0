-- Account operations are platform-admin only, regardless of console grants.
CREATE OR REPLACE FUNCTION private.require_account_admin()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND is_platform_admin AND NOT COALESCE(banned, FALSE)
  ) THEN
    RAISE EXCEPTION 'Only an active platform admin can manage accounts';
  END IF;
  IF EXISTS (SELECT 1 FROM auth.mfa_factors WHERE user_id = auth.uid() AND status = 'verified')
    AND COALESCE(auth.jwt()->>'aal', '') <> 'aal2' THEN
    RAISE EXCEPTION 'Complete multi-factor authentication before managing accounts';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION private.require_account_admin() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.admin_create_user_organization(
  p_user_id UUID, p_name TEXT, p_slug TEXT, p_business_type TEXT
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user public.users%ROWTYPE;
  v_request_id UUID;
  v_org_id UUID;
  v_slug TEXT := lower(trim(p_slug));
BEGIN
  PERFORM private.require_account_admin();
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_user.banned, FALSE) THEN
    RAISE EXCEPTION 'Choose an active user';
  END IF;
  IF NOT public.is_user_kyc_verified(p_user_id) THEN
    RAISE EXCEPTION 'Approve the user identity verification before creating an organization';
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'Organization name must contain 2 to 120 characters';
  END IF;
  IF v_slug IS NULL OR length(v_slug) NOT BETWEEN 3 AND 63
    OR v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
    RAISE EXCEPTION 'Use a 3 to 63 character slug containing lowercase letters, numbers and single hyphens';
  END IF;
  IF p_business_type IS NULL OR p_business_type <> ALL(ARRAY[
    'property_owner', 'property_management', 'agency_brokerage', 'developer',
    'investment_portfolio', 'facility_management', 'construction_services',
    'contractor_services', 'hybrid'
  ]) THEN
    RAISE EXCEPTION 'Choose a supported organization business type';
  END IF;
  IF EXISTS (SELECT 1 FROM public.organization_enrollment_requests
    WHERE requester_user_id = p_user_id AND status = 'pending') THEN
    RAISE EXCEPTION 'This user has a pending enrollment. Review it in Enrollment Requests first';
  END IF;
  IF EXISTS (SELECT 1 FROM public.organizations WHERE lower(slug) = v_slug)
    OR EXISTS (SELECT 1 FROM public.organization_enrollment_requests
      WHERE lower(desired_slug) = v_slug AND status = 'pending') THEN
    RAISE EXCEPTION 'That organization slug is already taken or reserved';
  END IF;

  INSERT INTO public.organization_enrollment_requests
    (requester_user_id, company_name, desired_slug, contact_email, contact_phone,
     business_types, workspace_kind)
  VALUES (p_user_id, trim(p_name), v_slug, v_user.email, v_user.phone,
    ARRAY[p_business_type], 'company') RETURNING id INTO v_request_id;
  -- Reuse enrollment provisioning, KYC checks and owner membership creation.
  v_org_id := public.approve_organization_enrollment_request(v_request_id, 'Created by platform admin for existing user');
  INSERT INTO public.audit_logs(admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'admin_create_user_organization', 'organization', v_org_id::TEXT,
    jsonb_build_object('user_id', p_user_id, 'enrollment_request_id', v_request_id));
  RETURN v_org_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_create_user_organization(UUID,TEXT,TEXT,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_create_user_organization(UUID,TEXT,TEXT,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_assign_organization_member(
  p_user_id UUID, p_organization_id UUID, p_role TEXT
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_owner_id UUID;
  v_suspended BOOLEAN;
  v_previous_role TEXT;
BEGIN
  PERFORM private.require_account_admin();
  PERFORM 1 FROM public.users WHERE id = p_user_id AND NOT COALESCE(banned, FALSE) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose an active user'; END IF;
  SELECT owner_id, suspended INTO v_owner_id, v_suspended
    FROM public.organizations WHERE id = p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organization not found'; END IF;
  IF COALESCE(v_suspended, FALSE) THEN RAISE EXCEPTION 'Reinstate this organization before assigning members'; END IF;
  IF p_role IS NULL OR p_role <> ALL(ARRAY[
    'managing_director', 'organization_admin', 'head_property_management',
    'property_manager', 'manager', 'facilities_manager', 'estate_officer',
    'caretaker', 'sales_manager', 'agent', 'sales_agent', 'marketing_manager',
    'marketing_officer', 'finance_manager', 'finance_officer', 'collections_officer',
    'technician', 'customer_service_manager', 'customer_service_agent', 'analyst',
    'contractor', 'developer'
  ]) THEN RAISE EXCEPTION 'Choose a supported member role; ownership transfers are separate'; END IF;
  SELECT role INTO v_previous_role FROM public.organization_members
    WHERE organization_id = p_organization_id AND user_id = p_user_id;
  IF v_owner_id = p_user_id OR v_previous_role = 'owner' THEN
    RAISE EXCEPTION 'Organization owners cannot be demoted through member assignment';
  END IF;
  INSERT INTO public.organization_members(organization_id, user_id, role)
    VALUES(p_organization_id, p_user_id, p_role)
    ON CONFLICT(organization_id, user_id) DO UPDATE SET role = EXCLUDED.role;
  -- Preserve existing scopes, custom permissions and approval limits.
  INSERT INTO public.audit_logs(admin_id, action, target_type, target_id, details)
  VALUES(auth.uid(), 'admin_assign_organization_member', 'user', p_user_id::TEXT,
    jsonb_build_object('organization_id', p_organization_id, 'previous_role', v_previous_role, 'role', p_role));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_assign_organization_member(UUID,UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_organization_member(UUID,UUID,TEXT) TO authenticated;
