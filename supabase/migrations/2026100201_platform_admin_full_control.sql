-- Give platform administrators explicit, audited control over account and organization state.
-- These RPCs deliberately retain the AAL2 requirement enforced by require_account_admin().

CREATE OR REPLACE FUNCTION public.admin_set_user_platform_access(
  p_user_id UUID,
  p_is_platform_admin BOOLEAN,
  p_grants TEXT[] DEFAULT '{}'
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_before public.users;
  v_after public.users;
  v_grants TEXT[];
  v_invalid_grants TEXT[];
BEGIN
  PERFORM private.require_account_admin();

  IF p_user_id = auth.uid() THEN
    RAISE EXCEPTION 'A platform admin cannot change their own platform access';
  END IF;

  SELECT * INTO v_before FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_before.account_deleted_at IS NOT NULL OR v_before.account_deletion_requested_at IS NOT NULL THEN
    RAISE EXCEPTION 'Platform access cannot be granted to an account pending deletion';
  END IF;
  IF COALESCE(v_before.banned, FALSE) AND COALESCE(p_is_platform_admin, FALSE) THEN
    RAISE EXCEPTION 'Restore the account before promoting it to platform admin';
  END IF;

  SELECT COALESCE(array_agg(DISTINCT grant_name ORDER BY grant_name), '{}'::TEXT[])
    INTO v_grants
    FROM unnest(COALESCE(p_grants, '{}'::TEXT[])) AS grant_name;
  SELECT COALESCE(array_agg(grant_name), '{}'::TEXT[])
    INTO v_invalid_grants
    FROM unnest(v_grants) AS grant_name
    WHERE grant_name <> ALL(ARRAY['users','organizations','listings','moderation','trust','support','revenue','settings']);
  IF CARDINALITY(v_invalid_grants) > 0 THEN
    RAISE EXCEPTION 'Unsupported platform grants: %', array_to_string(v_invalid_grants, ', ');
  END IF;

  UPDATE public.users
  SET is_platform_admin = COALESCE(p_is_platform_admin, FALSE),
      platform_console_grants = CASE WHEN COALESCE(p_is_platform_admin, FALSE) THEN '{}'::TEXT[] ELSE v_grants END,
      is_platform_manager = CASE WHEN COALESCE(p_is_platform_admin, FALSE) THEN FALSE ELSE CARDINALITY(v_grants) > 0 END,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_after;

  INSERT INTO public.audit_logs(admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'admin_set_user_platform_access', 'user', p_user_id::TEXT,
    jsonb_build_object(
      'before', jsonb_build_object('is_platform_admin', v_before.is_platform_admin, 'grants', v_before.platform_console_grants),
      'after', jsonb_build_object('is_platform_admin', v_after.is_platform_admin, 'grants', v_after.platform_console_grants)
    ));
  RETURN v_after;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_account_state(
  p_user_id UUID,
  p_verified BOOLEAN DEFAULT NULL,
  p_banned BOOLEAN DEFAULT NULL
)
RETURNS public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_before public.users;
  v_after public.users;
BEGIN
  PERFORM private.require_account_admin();
  SELECT * INTO v_before FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_before.account_deleted_at IS NOT NULL THEN RAISE EXCEPTION 'This account has already been deleted'; END IF;
  IF p_user_id = auth.uid() AND p_banned IS TRUE THEN RAISE EXCEPTION 'A platform admin cannot ban their own account'; END IF;
  IF v_before.is_platform_admin AND p_banned IS TRUE THEN
    RAISE EXCEPTION 'Remove platform admin access before banning this account';
  END IF;

  UPDATE public.users
  SET verified = COALESCE(p_verified, verified),
      banned = COALESCE(p_banned, banned),
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING * INTO v_after;

  INSERT INTO public.audit_logs(admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'admin_set_user_account_state', 'user', p_user_id::TEXT,
    jsonb_build_object(
      'before', jsonb_build_object('verified', v_before.verified, 'banned', v_before.banned),
      'after', jsonb_build_object('verified', v_after.verified, 'banned', v_after.banned)
    ));
  RETURN v_after;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_organization_state(
  p_organization_id UUID,
  p_verified BOOLEAN DEFAULT NULL,
  p_suspended BOOLEAN DEFAULT NULL
)
RETURNS public.organizations
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_before public.organizations;
  v_after public.organizations;
BEGIN
  PERFORM private.require_account_admin();
  SELECT * INTO v_before FROM public.organizations WHERE id = p_organization_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organization not found'; END IF;

  UPDATE public.organizations
  SET verified = COALESCE(p_verified, verified),
      suspended = COALESCE(p_suspended, suspended),
      updated_at = NOW()
  WHERE id = p_organization_id
  RETURNING * INTO v_after;

  INSERT INTO public.audit_logs(admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'admin_set_organization_state', 'organization', p_organization_id::TEXT,
    jsonb_build_object(
      'before', jsonb_build_object('verified', v_before.verified, 'suspended', v_before.suspended),
      'after', jsonb_build_object('verified', v_after.verified, 'suspended', v_after.suspended)
    ));
  RETURN v_after;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_platform_access(UUID, BOOLEAN, TEXT[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_user_account_state(UUID, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_organization_state(UUID, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_platform_access(UUID, BOOLEAN, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_user_account_state(UUID, BOOLEAN, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_organization_state(UUID, BOOLEAN, BOOLEAN) TO authenticated;

NOTIFY pgrst, 'reload schema';
