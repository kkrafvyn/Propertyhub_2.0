-- Retain business records; delete the Auth identity through the admin Edge function.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_deletion_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_deleted_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.admin_prepare_account_deletion(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_target public.users%ROWTYPE;
BEGIN
  PERFORM private.require_account_admin();
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'You cannot delete your own admin account'; END IF;
  SELECT * INTO v_target FROM public.users WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  IF v_target.is_platform_admin THEN
    RAISE EXCEPTION 'Remove platform admin access before deleting this account';
  END IF;
  IF EXISTS (SELECT 1 FROM public.organizations WHERE owner_id = p_user_id)
    OR EXISTS (SELECT 1 FROM public.organization_members WHERE user_id = p_user_id AND role = 'owner') THEN
    RAISE EXCEPTION 'Transfer organization ownership before deleting this account';
  END IF;
  IF v_target.account_deletion_requested_at IS NOT NULL THEN RETURN; END IF;
  UPDATE public.users SET banned = TRUE, is_platform_manager = FALSE,
    platform_console_grants = '{}', account_deletion_requested_at = NOW()
    WHERE id = p_user_id;
  UPDATE public.organization_enrollment_requests SET status = 'withdrawn', updated_at = NOW()
    WHERE requester_user_id = p_user_id AND status = 'pending';
  INSERT INTO public.audit_logs(admin_id, action, target_type, target_id, details)
    VALUES(auth.uid(), 'account_deletion_requested', 'user', p_user_id::TEXT,
      '{"retains_business_records":true}'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_complete_account_deletion(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.require_account_admin();
  PERFORM 1 FROM public.users WHERE id = p_user_id
    AND account_deletion_requested_at IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account deletion has not been requested'; END IF;
  IF EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id AND deleted_at IS NULL) THEN
    RAISE EXCEPTION 'Sign-in account deletion has not completed';
  END IF;
  UPDATE public.users SET account_deleted_at = NOW() WHERE id = p_user_id AND account_deleted_at IS NULL;
  IF FOUND THEN
    INSERT INTO public.audit_logs(admin_id, action, target_type, target_id, details)
    VALUES(auth.uid(), 'account_deleted', 'user', p_user_id::TEXT,
      '{"retains_business_records":true}'::jsonb);
  END IF;
END;
$$;

-- Deleted and pending-deletion identities must never be reinstated by the Ban toggle.
CREATE OR REPLACE FUNCTION private.protect_account_deletion_state()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.account_deletion_requested_at IS DISTINCT FROM OLD.account_deletion_requested_at
    OR NEW.account_deleted_at IS DISTINCT FROM OLD.account_deleted_at THEN
    PERFORM private.require_account_admin();
    IF OLD.account_deletion_requested_at IS NOT NULL AND NEW.account_deletion_requested_at IS DISTINCT FROM OLD.account_deletion_requested_at
      OR OLD.account_deleted_at IS NOT NULL AND NEW.account_deleted_at IS DISTINCT FROM OLD.account_deleted_at THEN
      RAISE EXCEPTION 'Account deletion cannot be reversed';
    END IF;
  END IF;
  IF NEW.account_deletion_requested_at IS NOT NULL THEN
    IF NEW.banned IS DISTINCT FROM TRUE OR NEW.is_platform_admin
      OR NEW.is_platform_manager OR cardinality(NEW.platform_console_grants) > 0 THEN
      RAISE EXCEPTION 'Accounts pending deletion or deleted cannot be reactivated';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER protect_account_deletion_state BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION private.protect_account_deletion_state();
REVOKE ALL ON FUNCTION private.protect_account_deletion_state() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_prepare_account_deletion(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_complete_account_deletion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_prepare_account_deletion(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_complete_account_deletion(UUID) TO authenticated;

-- Serialize ownership/member assignment with deletion, including existing enrollment RPCs.
CREATE OR REPLACE FUNCTION private.require_active_organization_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id UUID; v_requested TIMESTAMPTZ;
BEGIN
  IF TG_TABLE_NAME = 'organizations' THEN v_user_id := NEW.owner_id;
  ELSE v_user_id := NEW.user_id; END IF;
  SELECT account_deletion_requested_at INTO v_requested FROM public.users
    WHERE id = v_user_id FOR UPDATE;
  IF v_requested IS NOT NULL THEN
    RAISE EXCEPTION 'An account pending deletion or deleted cannot receive organization access';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.require_active_organization_user() FROM PUBLIC;
CREATE TRIGGER require_active_organization_owner BEFORE INSERT OR UPDATE OF owner_id ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION private.require_active_organization_user();
CREATE TRIGGER require_active_organization_member BEFORE INSERT OR UPDATE OF user_id ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION private.require_active_organization_user();
