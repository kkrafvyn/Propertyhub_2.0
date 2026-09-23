-- Reject blocked/deleted identities even when their access JWT has not expired.
CREATE OR REPLACE FUNCTION private.account_access_allowed()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NULL OR (
    EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND deleted_at IS NULL
      AND (banned_until IS NULL OR banned_until <= NOW()))
    AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid()
      AND (COALESCE(banned,FALSE) OR account_deletion_requested_at IS NOT NULL))
  );
$$;
REVOKE ALL ON FUNCTION private.account_access_allowed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.account_access_allowed() TO anon, authenticated, service_role;

-- Preserve an existing PostgREST pre-request hook rather than replace its behavior.
CREATE TABLE IF NOT EXISTS private.account_guard_config (
  singleton BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK(singleton), previous_hook REGPROCEDURE
);
DO $$
DECLARE v_hook TEXT;
BEGIN
  SELECT substr(setting, length('pgrst.db_pre_request=')+1) INTO v_hook
  FROM pg_db_role_setting s CROSS JOIN LATERAL unnest(s.setconfig) setting
  WHERE s.setrole IN (0, (SELECT oid FROM pg_roles WHERE rolname='authenticator'))
    AND s.setdatabase IN (0, (SELECT oid FROM pg_database WHERE datname=current_database()))
    AND setting LIKE 'pgrst.db_pre_request=%'
  ORDER BY (s.setrole <> 0) DESC, (s.setdatabase <> 0) DESC LIMIT 1;
  IF v_hook IS NOT NULL AND v_hook <> '' AND v_hook <> 'public.enforce_account_access' THEN
    IF to_regprocedure(v_hook || '()') IS NULL THEN RAISE EXCEPTION 'Cannot preserve unknown pre-request hook: %', v_hook; END IF;
    INSERT INTO private.account_guard_config VALUES(TRUE, to_regprocedure(v_hook || '()')) ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
CREATE OR REPLACE FUNCTION public.enforce_account_access()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_schema TEXT; v_name TEXT;
BEGIN
  IF NOT private.account_access_allowed() THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Account access has been revoked';
  END IF;
  SELECT n.nspname, p.proname INTO v_schema,v_name FROM private.account_guard_config c
    JOIN pg_proc p ON p.oid=c.previous_hook::oid JOIN pg_namespace n ON n.oid=p.pronamespace;
  IF v_name IS NOT NULL THEN EXECUTE format('SELECT %I.%I()',v_schema,v_name); END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.enforce_account_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enforce_account_access() TO anon, authenticated, service_role;
DO $$ BEGIN
  EXECUTE format('ALTER ROLE authenticator IN DATABASE %I SET pgrst.db_pre_request = %L',current_database(),'public.enforce_account_access');
END; $$;

-- RLS also protects Storage and Realtime paths which do not run PostgREST hooks.
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT n.nspname,c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind='r' AND c.relrowsecurity AND
      (n.nspname='public' OR (n.nspname='storage' AND c.relname='objects'))
  LOOP
    EXECUTE format('CREATE POLICY active_account_required ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated USING ((SELECT private.account_access_allowed())) WITH CHECK ((SELECT private.account_access_allowed()))',r.nspname,r.relname);
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION private.sync_account_block()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.banned IS DISTINCT FROM OLD.banned THEN
    PERFORM private.require_account_admin();
    IF NEW.id=auth.uid() THEN RAISE EXCEPTION 'You cannot block your own administrator account'; END IF;
    IF NEW.banned AND NEW.is_platform_admin THEN
      RAISE EXCEPTION 'Remove platform admin access before blocking this account';
    END IF;
    UPDATE auth.users SET banned_until=CASE WHEN NEW.banned THEN NOW()+INTERVAL '100 years' ELSE NULL END WHERE id=NEW.id;
    IF NEW.banned THEN
      DELETE FROM auth.refresh_tokens WHERE user_id::text=NEW.id::text;
      DELETE FROM auth.sessions WHERE user_id=NEW.id;
      UPDATE public.organization_api_keys SET status='revoked' WHERE created_by=NEW.id AND status='active';
      UPDATE public.external_access_grants SET revoked_at=NOW() WHERE revoked_at IS NULL
        AND (created_by=NEW.id OR lower(recipient_email)=lower(NEW.email));
    END IF;
    INSERT INTO public.audit_logs(admin_id,action,target_type,target_id,details)
      VALUES(auth.uid(),CASE WHEN NEW.banned THEN 'account_blocked' ELSE 'account_unblocked' END,'user',NEW.id::text,'{}');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.sync_account_block() FROM PUBLIC;
CREATE TRIGGER sync_account_block AFTER UPDATE OF banned ON public.users
  FOR EACH ROW EXECUTE FUNCTION private.sync_account_block();
-- Apply enforcement to already blocked accounts as well.
UPDATE auth.users a SET banned_until=NOW()+INTERVAL '100 years' FROM public.users u
  WHERE a.id=u.id AND (u.banned OR u.account_deletion_requested_at IS NOT NULL);
DELETE FROM auth.sessions s USING public.users u WHERE s.user_id=u.id
  AND (u.banned OR u.account_deletion_requested_at IS NOT NULL);
DELETE FROM auth.refresh_tokens t USING public.users u WHERE t.user_id::text=u.id::text
  AND (u.banned OR u.account_deletion_requested_at IS NOT NULL);
UPDATE public.organization_api_keys k SET status='revoked' FROM public.users u
  WHERE k.created_by=u.id AND (u.banned OR u.account_deletion_requested_at IS NOT NULL);
UPDATE public.external_access_grants g SET revoked_at=NOW() FROM public.users u
  WHERE g.revoked_at IS NULL AND (g.created_by=u.id OR lower(g.recipient_email)=lower(u.email))
    AND (u.banned OR u.account_deletion_requested_at IS NOT NULL);
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
