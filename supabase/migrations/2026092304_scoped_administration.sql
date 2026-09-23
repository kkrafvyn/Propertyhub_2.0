CREATE OR REPLACE FUNCTION private.is_org_admin(p_org UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT private.account_access_allowed() AND (public.is_platform_admin() OR EXISTS(
    SELECT 1 FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_org AND m.user_id=auth.uid() AND NOT COALESCE(o.suspended,FALSE)
      AND m.role IN ('owner','organization_admin','managing_director')));
$$;

CREATE OR REPLACE FUNCTION private.role_department(p_role TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT CASE
    WHEN p_role IN ('owner','managing_director') THEN 'executive'
    WHEN p_role='organization_admin' THEN 'administration'
    WHEN p_role IN ('head_property_management','property_manager','manager','estate_officer','developer') THEN 'property'
    WHEN p_role IN ('facilities_manager','caretaker','technician','contractor','vendor') THEN 'maintenance'
    WHEN p_role IN ('sales_manager','agent','sales_agent','marketing_manager','marketing_officer') THEN 'sales'
    WHEN p_role IN ('finance_manager','finance_officer','collections_officer') THEN 'finance'
    WHEN p_role IN ('customer_service_manager','customer_service_agent') THEN 'support'
    WHEN p_role='analyst' THEN 'analytics' END;
$$;

CREATE OR REPLACE FUNCTION private.manages_department(p_org UUID,p_department TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT private.account_access_allowed() AND EXISTS(
    SELECT 1 FROM public.organization_members m JOIN public.organizations o ON o.id=m.organization_id
    WHERE m.organization_id=p_org AND m.user_id=auth.uid() AND NOT COALESCE(o.suspended,FALSE)
    AND (EXISTS(SELECT 1 FROM public.organization_departments d WHERE d.organization_id=p_org
       AND d.department_key=p_department AND d.head_user_id=auth.uid())
      OR ((m.role IN ('manager','head_property_management','sales_manager','finance_manager',
        'facilities_manager','marketing_manager','customer_service_manager') OR m.permissions @> '["team:manage"]'::jsonb)
        AND private.role_department(m.role)=p_department)));
$$;

CREATE OR REPLACE FUNCTION private.can_manage_member(p_org UUID,p_role TEXT,p_department UUID,p_user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT private.is_org_admin(p_org) OR (
    p_user IS DISTINCT FROM auth.uid() AND p_role NOT IN ('owner','organization_admin','managing_director')
    AND private.manages_department(p_org,COALESCE(
      (SELECT department_key FROM public.organization_departments WHERE id=p_department AND organization_id=p_org),
      private.role_department(p_role)))
    AND private.manages_department(p_org,private.role_department(p_role)));
$$;

CREATE OR REPLACE FUNCTION private.can_manage_organization_members(target_organization_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT private.is_org_admin(target_organization_id);
$$;

CREATE OR REPLACE FUNCTION private.can_assign_member_role(p_organization_id UUID,p_target_role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT private.is_org_admin(p_organization_id) OR (p_target_role NOT IN ('owner','organization_admin','managing_director')
    AND private.manages_department(p_organization_id,private.role_department(p_target_role)));
$$;

-- Remove permissive legacy write policies so they cannot bypass section scope.
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid='public.organization_members'::regclass
    AND polpermissive AND polcmd IN ('*','a','w','d') LOOP
    EXECUTE format('DROP POLICY %I ON public.organization_members',r.polname);
  END LOOP;
END; $$;
CREATE POLICY scoped_member_management ON public.organization_members FOR ALL TO authenticated
  USING(private.can_manage_member(organization_id,role,department_id,user_id))
  WITH CHECK(private.can_manage_member(organization_id,role,department_id,user_id));
CREATE POLICY invited_user_membership ON public.organization_members FOR INSERT TO authenticated
  WITH CHECK(user_id=auth.uid() AND EXISTS(SELECT 1 FROM public.organization_invitations i
    WHERE i.organization_id=organization_members.organization_id AND i.role=organization_members.role
      AND lower(i.email)=lower(auth.jwt()->>'email') AND i.status='pending' AND i.expires_at>NOW()));

CREATE OR REPLACE FUNCTION private.guard_member_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_org UUID; v_target UUID;
BEGIN
  IF auth.uid() IS NULL AND auth.role()='service_role' THEN RETURN COALESCE(NEW,OLD); END IF;
  v_org:=COALESCE(OLD.organization_id,NEW.organization_id); v_target:=COALESCE(OLD.user_id,NEW.user_id);
  IF TG_OP<>'INSERT' THEN
    IF OLD.role='owner' AND (TG_OP='DELETE' OR NEW.role IS DISTINCT FROM OLD.role)
      AND EXISTS(SELECT 1 FROM public.organizations WHERE id=v_org AND owner_id=v_target) THEN
      RAISE EXCEPTION 'Transfer ownership before removing or changing an owner';
    END IF;
    IF NOT private.can_manage_member(v_org,OLD.role,OLD.department_id,v_target) THEN
      RAISE EXCEPTION 'This member is outside your administrative section';
    END IF;
  END IF;
  IF TG_OP='UPDATE' AND (NEW.organization_id<>OLD.organization_id OR NEW.user_id<>OLD.user_id) THEN
    RAISE EXCEPTION 'Membership identity cannot be changed';
  END IF;
  IF TG_OP<>'DELETE' THEN
    IF private.role_department(NEW.role) IS NULL AND NEW.role NOT IN ('property_owner','enterprise_operator') THEN
      RAISE EXCEPTION 'Unsupported organization role';
    END IF;
    IF NEW.role='owner' AND NOT EXISTS(SELECT 1 FROM public.organizations WHERE id=NEW.organization_id AND owner_id=NEW.user_id) THEN
      RAISE EXCEPTION 'Use ownership transfer to appoint an organization owner';
    END IF;
    IF NEW.department_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.organization_departments
      WHERE id=NEW.department_id AND organization_id=NEW.organization_id) THEN
      RAISE EXCEPTION 'Department must belong to this organization';
    END IF;
    -- Provisioning an owner via enrollment runs as a platform admin.
    IF NOT private.can_manage_member(NEW.organization_id,NEW.role,NEW.department_id,NEW.user_id) THEN
      -- Accepting an invitation is handled by its existing checked SECURITY DEFINER RPC.
      IF TG_OP<>'INSERT' OR NEW.user_id<>auth.uid() OR NOT EXISTS(
        SELECT 1 FROM public.organization_invitations i
        WHERE lower(i.email)=lower(auth.jwt()->>'email') AND i.organization_id=NEW.organization_id AND i.role=NEW.role
          AND i.status='pending' AND i.expires_at>NOW()) THEN
        RAISE EXCEPTION 'You cannot assign this role outside your administrative section';
      END IF;
    END IF;
  END IF;
  IF TG_OP='UPDATE' AND NOT private.is_org_admin(v_org) THEN
    IF (to_jsonb(NEW)-'role'-'department_id'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'role'-'department_id'-'updated_at') THEN
      RAISE EXCEPTION 'Only organization administrators can change custom permissions, property scope or approval limits';
    END IF;
    IF OLD.department_id IS NOT NULL AND NEW.department_id IS DISTINCT FROM OLD.department_id THEN
      RAISE EXCEPTION 'Only organization administrators can move members between departments';
    END IF;
  END IF;
  RETURN COALESCE(NEW,OLD);
END;
$$;
CREATE TRIGGER guard_member_changes BEFORE INSERT OR UPDATE OR DELETE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION private.guard_member_changes();

CREATE OR REPLACE FUNCTION private.guard_department_head()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF NEW.head_user_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.organization_members m
    WHERE m.organization_id=NEW.organization_id AND m.user_id=NEW.head_user_id
      AND (m.department_id=NEW.id OR (m.department_id IS NULL AND private.role_department(m.role)=NEW.department_key))) THEN
    RAISE EXCEPTION 'Department head must be a member of this organization and department';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_department_head BEFORE INSERT OR UPDATE ON public.organization_departments
  FOR EACH ROW EXECUTE FUNCTION private.guard_department_head();

CREATE TABLE public.platform_activity (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id UUID,
  department_key TEXT,
  actor_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX platform_activity_created ON public.platform_activity(created_at DESC,id DESC);
CREATE INDEX platform_activity_scope ON public.platform_activity(organization_id,department_key,created_at DESC);
ALTER TABLE public.platform_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY activity_scoped_read ON public.platform_activity FOR SELECT TO authenticated USING(
  private.account_access_allowed() AND (public.is_platform_admin() OR
    private.is_org_admin(organization_id) OR private.manages_department(organization_id,department_key)));
GRANT SELECT ON public.platform_activity TO authenticated;

CREATE OR REPLACE FUNCTION private.record_platform_activity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row JSONB:=COALESCE(to_jsonb(NEW),to_jsonb(OLD)); v_org UUID; v_department TEXT;
BEGIN
  v_org:=NULLIF(v_row->>'organization_id','')::uuid;
  IF TG_TABLE_NAME='organizations' THEN v_org:=(v_row->>'id')::uuid; END IF;
  IF v_org IS NOT NULL THEN
    SELECT d.department_key INTO v_department FROM public.organization_departments d
      WHERE d.organization_id=v_org AND d.id=NULLIF(v_row->>'department_id','')::uuid;
    IF v_department IS NULL THEN
      SELECT COALESCE(d.department_key,private.role_department(m.role)) INTO v_department
      FROM public.organization_members m LEFT JOIN public.organization_departments d ON d.id=m.department_id
      WHERE m.organization_id=v_org AND m.user_id=auth.uid();
    END IF;
  END IF;
  INSERT INTO public.platform_activity(organization_id,department_key,actor_id,action,entity_type,entity_id)
    VALUES(v_org,v_department,auth.uid(),lower(TG_OP),TG_TABLE_NAME,COALESCE(v_row->>'id',v_row->>'user_id'));
  RETURN COALESCE(NEW,OLD);
END;
$$;
-- Metadata only: no row payload, document text, credentials or payment details.
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relname NOT IN
      ('platform_activity','operational_events','audit_logs','notification_logs','user_sessions')
  LOOP EXECUTE format('CREATE TRIGGER record_platform_activity AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION private.record_platform_activity()',r.relname); END LOOP;
END; $$;

CREATE POLICY platform_admin_all_operational_events ON public.operational_events FOR SELECT TO authenticated
  USING(public.is_platform_admin() AND private.account_access_allowed());

CREATE OR REPLACE FUNCTION public.require_platform_operations_access()
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN PERFORM private.require_account_admin(); END;
$$;
REVOKE ALL ON FUNCTION public.require_platform_operations_access() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.require_platform_operations_access() TO authenticated;

CREATE OR REPLACE FUNCTION public.record_client_error(p_context TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Account access has been revoked';
  END IF;
  IF p_context IS NULL OR p_context<>ALL(ARRAY['window.error','window.unhandledrejection','react-boundary','application']) THEN
    RAISE EXCEPTION 'Invalid error category';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext('client-error:'||auth.uid()::text));
  IF (SELECT count(*) FROM public.operational_events WHERE service='client-app'
    AND metadata->>'actor_id'=auth.uid()::text AND created_at>NOW()-INTERVAL '5 minutes')>=20 THEN RETURN; END IF;
  INSERT INTO public.operational_events(service,event_type,severity,message,metadata)
    VALUES('client-app',p_context,'error','Browser error reported',jsonb_build_object('actor_id',auth.uid()));
END;
$$;
REVOKE ALL ON FUNCTION public.record_client_error(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_client_error(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.organization_admin_sections(p_org UUID)
RETURNS JSONB LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT jsonb_build_object('organizationAdmin',private.is_org_admin(p_org),'departments',COALESCE((
    SELECT jsonb_agg(jsonb_build_object('key',d.department_key,'name',d.name))
    FROM public.organization_departments d WHERE d.organization_id=p_org
      AND (private.is_org_admin(p_org) OR private.manages_department(p_org,d.department_key))),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.organization_admin_sections(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.organization_admin_sections(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.can_invite_organization_role(p_org UUID,p_role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
  SELECT p_role<>'owner' AND private.role_department(p_role) IS NOT NULL
    AND private.can_assign_member_role(p_org,p_role);
$$;
REVOKE ALL ON FUNCTION public.can_invite_organization_role(UUID,TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_invite_organization_role(UUID,TEXT) TO authenticated;
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT polname FROM pg_policy WHERE polrelid='public.organization_invitations'::regclass
    AND polpermissive AND polcmd IN ('*','a','w','d') LOOP
    EXECUTE format('DROP POLICY %I ON public.organization_invitations',r.polname);
  END LOOP;
END; $$;
CREATE POLICY scoped_invitation_management ON public.organization_invitations FOR ALL TO authenticated
  USING(public.can_invite_organization_role(organization_id,role))
  WITH CHECK(public.can_invite_organization_role(organization_id,role));

-- Platform oversight is global. Organization administration stays inside its tenant.
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN SELECT c.relname,c.oid FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
  LOOP
    EXECUTE format('CREATE POLICY platform_admin_oversight ON public.%I FOR SELECT TO authenticated USING (public.is_platform_admin() AND private.account_access_allowed())',r.relname);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',r.relname);
    IF r.relname IN ('organization_contacts','workspace_tasks','organization_departments','organization_units',
      'properties','listings','maintenance_requests','organization_conversations','organization_approval_chains','automation_workflows')
      AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=r.oid AND attname='organization_id' AND atttypid='uuid'::regtype AND NOT attisdropped) THEN
      EXECUTE format('CREATE POLICY organization_admin_control ON public.%I FOR ALL TO authenticated USING (private.is_org_admin(organization_id)) WITH CHECK (private.is_org_admin(organization_id))',r.relname);
      EXECUTE format('GRANT INSERT,UPDATE,DELETE ON public.%I TO authenticated',r.relname);
    END IF;
  END LOOP;
END; $$;
CREATE POLICY organization_admin_settings ON public.organizations FOR UPDATE TO authenticated
  USING(private.is_org_admin(id)) WITH CHECK(private.is_org_admin(id));

CREATE OR REPLACE FUNCTION private.guard_organization_admin_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_platform_admin() AND
    (NEW.verified IS DISTINCT FROM OLD.verified OR NEW.suspended IS DISTINCT FROM OLD.suspended
      OR NEW.owner_id IS DISTINCT FROM OLD.owner_id) THEN
    RAISE EXCEPTION 'Only platform admins can change organization verification, suspension or ownership';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_organization_admin_update() FROM PUBLIC;
CREATE TRIGGER guard_organization_admin_update BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION private.guard_organization_admin_update();

CREATE OR REPLACE FUNCTION public.admin_transfer_organization_ownership(p_org UUID,p_new_owner UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_old UUID;
BEGIN
  PERFORM private.require_account_admin();
  PERFORM 1 FROM public.users WHERE id=p_new_owner AND NOT COALESCE(banned,FALSE)
    AND account_deletion_requested_at IS NULL FOR UPDATE;
  IF NOT FOUND OR NOT public.is_user_kyc_verified(p_new_owner) THEN RAISE EXCEPTION 'New owner must be an active, identity-verified user'; END IF;
  SELECT owner_id INTO v_old FROM public.organizations WHERE id=p_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Organization not found'; END IF;
  IF v_old=p_new_owner THEN RETURN; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.organization_members WHERE organization_id=p_org AND user_id=p_new_owner) THEN
    RAISE EXCEPTION 'Add the new owner to the organization before transferring ownership';
  END IF;
  UPDATE public.organizations SET owner_id=p_new_owner WHERE id=p_org;
  UPDATE public.organization_members SET role='organization_admin' WHERE organization_id=p_org AND user_id=v_old AND role='owner';
  UPDATE public.organization_members SET role='owner',scope_mode='organization',department_id=NULL
    WHERE organization_id=p_org AND user_id=p_new_owner;
  INSERT INTO public.audit_logs(admin_id,action,target_type,target_id,details)
    VALUES(auth.uid(),'organization_ownership_transferred','organization',p_org::text,jsonb_build_object('previous_owner',v_old,'new_owner',p_new_owner));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_transfer_organization_ownership(UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_transfer_organization_ownership(UUID,UUID) TO authenticated;

CREATE OR REPLACE FUNCTION private.is_department_manager(p_org UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=p_org AND m.user_id=auth.uid()
   AND (m.role IN ('manager','head_property_management','sales_manager','finance_manager','facilities_manager','marketing_manager','customer_service_manager')
     OR m.permissions @> '["team:manage"]'::jsonb))
 OR EXISTS(SELECT 1 FROM public.organization_departments WHERE organization_id=p_org AND head_user_id=auth.uid());
$$;
CREATE OR REPLACE FUNCTION private.can_control_section_task(p_org UUID,p_assignee UUID,p_creator UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT private.is_org_admin(p_org) OR NOT private.is_department_manager(p_org) OR
   COALESCE(p_assignee,p_creator)=auth.uid() OR EXISTS(
   SELECT 1 FROM public.organization_members m WHERE m.organization_id=p_org AND m.user_id=COALESCE(p_assignee,p_creator)
     AND private.can_manage_member(p_org,m.role,m.department_id,m.user_id));
$$;
CREATE POLICY department_task_boundary ON public.workspace_tasks AS RESTRICTIVE FOR ALL TO authenticated
  USING(private.can_control_section_task(organization_id,assigned_to,created_by))
  WITH CHECK(private.can_control_section_task(organization_id,assigned_to,created_by));
CREATE POLICY department_task_control ON public.workspace_tasks FOR ALL TO authenticated
  USING(private.is_department_manager(organization_id) AND private.can_control_section_task(organization_id,assigned_to,created_by))
  WITH CHECK(private.is_department_manager(organization_id) AND private.can_control_section_task(organization_id,assigned_to,created_by));
REVOKE ALL ON FUNCTION private.is_department_manager(UUID),private.can_control_section_task(UUID,UUID,UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_department_manager(UUID),private.can_control_section_task(UUID,UUID,UUID) TO authenticated;

REVOKE ALL ON FUNCTION private.is_org_admin(UUID),private.role_department(TEXT),private.manages_department(UUID,TEXT),
  private.can_manage_member(UUID,TEXT,UUID,UUID),private.guard_member_changes(),private.guard_department_head(),private.record_platform_activity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_org_admin(UUID),private.role_department(TEXT),private.manages_department(UUID,TEXT),
  private.can_manage_member(UUID,TEXT,UUID,UUID) TO authenticated;
NOTIFY pgrst, 'reload schema';

-- Server permission catalog aligned with workspace-permissions.ts. Unknown roles fail closed.
CREATE OR REPLACE FUNCTION private.workspace_role_has_permission(p_role TEXT,p_permission TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT p_permission=ANY(CASE p_role
    WHEN 'owner' THEN ARRAY['listings:read','listings:write','leads:read','leads:write','finance:read','finance:write','team:manage','documents:write','contacts:write','tasks:write']::text[]
    WHEN 'managing_director' THEN ARRAY['listings:read','listings:write','leads:read','leads:write','finance:read','finance:write','team:manage','documents:write','contacts:write','tasks:write']::text[]
    WHEN 'organization_admin' THEN ARRAY['listings:read','listings:write','leads:read','leads:write','finance:read','finance:write','team:manage','documents:write','contacts:write','tasks:write']::text[]
    WHEN 'platform_admin' THEN ARRAY['listings:read','listings:write','leads:read','leads:write','finance:read','finance:write','team:manage','documents:write','contacts:write','tasks:write']::text[]
    WHEN 'enterprise_operator' THEN ARRAY['listings:read','listings:write','leads:read','leads:write','finance:read','finance:write','team:manage','documents:write','contacts:write','tasks:write']::text[]
    WHEN 'head_property_management' THEN ARRAY['listings:read','listings:write','leads:read','documents:write','contacts:write','tasks:write']::text[]
    WHEN 'manager' THEN ARRAY['listings:read','listings:write','leads:read','documents:write','contacts:write','tasks:write']::text[]
    WHEN 'property_manager' THEN ARRAY['listings:read','listings:write','leads:read','leads:write','finance:read','documents:write','contacts:write','tasks:write']::text[]
    WHEN 'facilities_manager' THEN ARRAY['listings:read','listings:write','tasks:write','documents:write']::text[]
    WHEN 'estate_officer' THEN ARRAY['listings:read','tasks:write','documents:write']::text[]
    WHEN 'caretaker' THEN ARRAY['listings:read','tasks:write']::text[]
    WHEN 'technician' THEN ARRAY['listings:read','tasks:write']::text[]
    WHEN 'finance_manager' THEN ARRAY['listings:read','finance:read','finance:write','team:manage','documents:write']::text[]
    WHEN 'finance_officer' THEN ARRAY['listings:read','finance:read','finance:write','documents:write']::text[]
    WHEN 'collections_officer' THEN ARRAY['listings:read','finance:read','leads:read','tasks:write']::text[]
    WHEN 'sales_manager' THEN ARRAY['listings:read','listings:write','leads:read','leads:write','contacts:write','tasks:write','documents:write','team:manage']::text[]
    WHEN 'agent' THEN ARRAY['listings:read','listings:write','leads:read','leads:write','documents:write','contacts:write','tasks:write']::text[]
    WHEN 'sales_agent' THEN ARRAY['listings:read','listings:write','leads:read','leads:write','documents:write','contacts:write','tasks:write']::text[]
    WHEN 'marketing_manager' THEN ARRAY['listings:read','listings:write','leads:read','team:manage']::text[]
    WHEN 'marketing_officer' THEN ARRAY['listings:read','listings:write','leads:read']::text[]
    WHEN 'customer_service_manager' THEN ARRAY['listings:read','leads:read','leads:write','contacts:write','tasks:write','team:manage']::text[]
    WHEN 'customer_service_agent' THEN ARRAY['listings:read','leads:read','leads:write','contacts:write','tasks:write']::text[]
    WHEN 'analyst' THEN ARRAY['listings:read','leads:read','finance:read']::text[]
    WHEN 'platform_analyst' THEN ARRAY['listings:read','leads:read','finance:read']::text[]
    WHEN 'property_owner' THEN ARRAY['listings:read','finance:read']::text[]
    WHEN 'contractor' THEN ARRAY['listings:read','tasks:write']::text[]
    WHEN 'vendor' THEN ARRAY['listings:read','tasks:write']::text[]
    WHEN 'developer' THEN ARRAY['listings:read','listings:write','leads:read','documents:write']::text[]
    ELSE ARRAY[]::text[] END);
$$;
