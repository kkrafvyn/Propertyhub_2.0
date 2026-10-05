-- Platform staff cross-tenant read policies + extended console grant allowlist.

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
    WHERE grant_name <> ALL(ARRAY[
      'users','organizations','listings','moderation','trust','support','revenue','settings',
      'integrations','ai_governance','payments','communications'
    ]);
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

CREATE OR REPLACE FUNCTION public.require_platform_operations_access()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Authentication required';
  END IF;
  IF NOT private.account_access_allowed() THEN
    RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Account access has been revoked';
  END IF;
  IF public.is_platform_admin() THEN
    IF COALESCE(auth.jwt()->>'aal', '') <> 'aal2' THEN
      RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Platform admin operations require MFA (AAL2)';
    END IF;
    RETURN;
  END IF;
  IF public.has_platform_console_grant('integrations') THEN
    RETURN;
  END IF;
  RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Platform operations access required';
END;
$$;

DROP POLICY IF EXISTS platform_staff_read_payment_transactions ON public.payment_transactions;
CREATE POLICY platform_staff_read_payment_transactions ON public.payment_transactions
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_platform_console_grant('payments')
    OR public.has_platform_console_grant('revenue')
  );

DROP POLICY IF EXISTS platform_staff_read_estate_ai_action_logs ON public.estate_ai_action_logs;
CREATE POLICY platform_staff_read_estate_ai_action_logs ON public.estate_ai_action_logs
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_platform_console_grant('ai_governance')
  );

DROP POLICY IF EXISTS platform_staff_read_communication_delivery ON public.communication_delivery_attempts;
CREATE POLICY platform_staff_read_communication_delivery ON public.communication_delivery_attempts
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR public.has_platform_console_grant('communications')
    OR public.has_platform_console_grant('support')
  );

DROP POLICY IF EXISTS platform_admin_read_role_audit ON public.audit_logs;
CREATE POLICY platform_admin_read_role_audit ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    AND action IN (
      'admin_set_user_platform_access',
      'admin_set_user_account_state',
      'admin_prepare_account_deletion',
      'admin_complete_account_deletion'
    )
  );
