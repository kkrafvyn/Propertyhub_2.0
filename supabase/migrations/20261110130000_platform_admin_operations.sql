-- Local upgrade: deploy only after review. No provider messages, refunds, or MFA resets are dispatched.
BEGIN;
CREATE TABLE public.platform_support_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL CHECK (length(trim(subject)) BETWEEN 3 AND 200),
  category text NOT NULL CHECK (category IN ('support','delivery_retry','payment_review','mfa_recovery')),
  organization_id uuid REFERENCES public.organizations(id),
  account_id uuid REFERENCES public.users(id), source_id uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','waiting','resolved')),
  assigned_to uuid REFERENCES public.users(id), created_by uuid NOT NULL REFERENCES public.users(id),
  due_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
  revision integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX platform_support_active_source ON public.platform_support_cases(category,source_id)
  WHERE source_id IS NOT NULL AND status <> 'resolved';
CREATE INDEX platform_support_queue ON public.platform_support_cases(status,updated_at DESC,id);
CREATE TABLE public.platform_support_case_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.platform_support_cases(id),
  actor_id uuid NOT NULL REFERENCES public.users(id), note text NOT NULL CHECK (length(trim(note)) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX platform_support_history ON public.platform_support_case_events(case_id,created_at,id);

CREATE FUNCTION private.require_admin_upgrade_access(p_grant text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.account_access_allowed()
     OR NOT public.has_platform_console_grant(p_grant)
     OR coalesce(auth.jwt()->>'aal','') <> 'aal2' THEN
    RAISE EXCEPTION 'Active staff access and completed two-factor verification are required' USING ERRCODE='42501';
  END IF;
END; $$;
REVOKE ALL ON FUNCTION private.require_admin_upgrade_access(text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.admin_can_access_support_case(p_category text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND private.account_access_allowed()
    AND coalesce(auth.jwt()->>'aal','')='aal2' AND (
      public.has_platform_console_grant('support') OR
      (p_category='delivery_retry' AND public.has_platform_console_grant('communications')) OR
      (p_category='payment_review' AND public.has_platform_console_grant('payments'))
    );
$$;
REVOKE ALL ON FUNCTION public.admin_can_access_support_case(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_can_access_support_case(text) TO authenticated;

ALTER TABLE public.platform_support_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_support_case_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_support_cases,public.platform_support_case_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.platform_support_cases,public.platform_support_case_events TO authenticated;
CREATE POLICY support_case_read ON public.platform_support_cases FOR SELECT TO authenticated
  USING (public.admin_can_access_support_case(category));
CREATE POLICY support_event_read ON public.platform_support_case_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.platform_support_cases c WHERE c.id=case_id AND public.admin_can_access_support_case(c.category)));

CREATE FUNCTION public.admin_create_support_case(p_subject text,p_category text,p_account uuid,p_organization uuid,p_source uuid,p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_org uuid; v_account uuid;
BEGIN
  IF NOT public.admin_can_access_support_case(p_category) THEN RAISE EXCEPTION 'Support case access denied' USING ERRCODE='42501'; END IF;
  IF p_category NOT IN ('support','delivery_retry','payment_review','mfa_recovery') OR p_category IS NULL
     OR length(trim(coalesce(p_subject,''))) NOT BETWEEN 3 AND 200
     OR length(trim(coalesce(p_note,''))) NOT BETWEEN 10 AND 4000 THEN RAISE EXCEPTION 'A valid category, subject and detailed note are required'; END IF;
  v_org:=p_organization; v_account:=p_account;
  IF p_category='delivery_retry' THEN
    IF NOT public.has_platform_console_grant('communications') THEN RAISE EXCEPTION 'Communications permission required'; END IF;
    SELECT organization_id,recipient_user_id INTO v_org,v_account FROM public.communication_delivery_attempts WHERE id=p_source AND status='failed';
    IF NOT FOUND THEN RAISE EXCEPTION 'Only a failed delivery can be submitted for retry review'; END IF;
  ELSIF p_category='payment_review' THEN
    IF NOT public.has_platform_console_grant('payments') THEN RAISE EXCEPTION 'Payments permission required'; END IF;
    SELECT user_id INTO v_account FROM public.payment_transactions WHERE id=p_source;
    IF NOT FOUND THEN RAISE EXCEPTION 'Payment not found'; END IF;
    v_org:=NULL; -- This ledger has no organization association. Do not infer one.
  ELSIF p_category='mfa_recovery' THEN
    IF p_account IS NULL OR NOT EXISTS (SELECT 1 FROM public.users WHERE id=p_account) THEN RAISE EXCEPTION 'Recovery requires an existing account'; END IF;
    p_source:=p_account;
  ELSE
    p_source:=NULL;
  END IF;
  INSERT INTO public.platform_support_cases(subject,category,organization_id,account_id,source_id,created_by)
    VALUES(trim(p_subject),p_category,v_org,v_account,p_source,auth.uid()) RETURNING id INTO v_id;
  INSERT INTO public.platform_support_case_events(case_id,actor_id,note) VALUES(v_id,auth.uid(),trim(p_note));
  RETURN v_id;
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'An active review already exists for this record';
END; $$;

CREATE FUNCTION public.admin_update_support_case(p_id uuid,p_revision integer,p_status text,p_assignee uuid,p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_case public.platform_support_cases%ROWTYPE; v_grant text;
BEGIN
  SELECT * INTO v_case FROM public.platform_support_cases WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR NOT public.admin_can_access_support_case(v_case.category) THEN RAISE EXCEPTION 'Case unavailable or access denied'; END IF;
  IF p_revision IS NULL OR v_case.revision<>p_revision THEN RAISE EXCEPTION 'This case changed. Refresh before saving.'; END IF;
  IF p_status IS NULL OR p_status NOT IN ('open','in_progress','waiting','resolved') OR length(trim(coalesce(p_note,''))) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Select a status and add a note'; END IF;
  IF v_case.category='mfa_recovery' AND p_status='resolved' AND NOT EXISTS (
    SELECT 1 FROM public.users WHERE id=auth.uid() AND is_platform_admin
  ) THEN RAISE EXCEPTION 'An owner must complete the recovery review'; END IF;
  v_grant:=CASE v_case.category WHEN 'delivery_retry' THEN 'communications' WHEN 'payment_review' THEN 'payments' ELSE 'support' END;
  IF p_assignee IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id=p_assignee AND (u.is_platform_admin OR 'support'=ANY(u.platform_console_grants) OR v_grant=ANY(u.platform_console_grants))
  ) THEN RAISE EXCEPTION 'Assign to a staff member with access to this case'; END IF;
  UPDATE public.platform_support_cases SET status=p_status,assigned_to=p_assignee,revision=revision+1,updated_at=now() WHERE id=p_id;
  INSERT INTO public.platform_support_case_events(case_id,actor_id,note)
    VALUES(p_id,auth.uid(),format('Status: %s; assignee: %s. %s',p_status,coalesce(p_assignee::text,'unassigned'),trim(p_note)));
END; $$;

CREATE TABLE public.platform_ai_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), organization_id uuid NOT NULL REFERENCES public.organizations(id),
  actor_id uuid NOT NULL REFERENCES public.users(id), action_id uuid REFERENCES public.estate_ai_action_logs(id),
  note text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_ai_review_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_ai_review_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.platform_ai_review_events TO authenticated;
CREATE FUNCTION public.admin_can_review_ai() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL AND private.account_access_allowed()
    AND public.has_platform_console_grant('ai_governance') AND coalesce(auth.jwt()->>'aal','')='aal2';
$$;
REVOKE ALL ON FUNCTION public.admin_can_review_ai() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_can_review_ai() TO authenticated;
CREATE POLICY ai_review_read ON public.platform_ai_review_events FOR SELECT TO authenticated
 USING(public.admin_can_review_ai());
CREATE POLICY platform_ai_control_read ON public.ai_agent_controls FOR SELECT TO authenticated
 USING(public.admin_can_review_ai());

CREATE FUNCTION public.admin_decide_ai_action(p_id uuid,p_decision text,p_note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_org uuid;
BEGIN
  PERFORM private.require_admin_upgrade_access('ai_governance');
  IF p_decision IS NULL OR p_decision NOT IN ('approved','rejected') OR length(trim(coalesce(p_note,''))) NOT BETWEEN 10 AND 4000 THEN RAISE EXCEPTION 'A decision and detailed review note are required'; END IF;
  UPDATE public.estate_ai_action_logs SET action_status=p_decision,approved_by=auth.uid(),decided_at=now()
    WHERE id=p_id AND action_status='recommended' RETURNING organization_id INTO v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Action is unavailable or has already been reviewed'; END IF;
  INSERT INTO public.platform_ai_review_events(organization_id,actor_id,action_id,note)
    VALUES(v_org,auth.uid(),p_id,p_decision || ': ' || trim(p_note));
END; $$;

CREATE FUNCTION public.admin_set_ai_control(p_organization uuid,p_agent text,p_enabled boolean,p_budget integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.require_admin_upgrade_access('ai_governance');
  IF p_agent IS NULL OR length(trim(p_agent)) NOT BETWEEN 1 AND 100 OR p_enabled IS NULL OR p_budget IS NULL OR p_budget NOT BETWEEN 0 AND 100000 THEN RAISE EXCEPTION 'Valid agent name, enabled flag and daily budget are required'; END IF;
  INSERT INTO public.ai_agent_controls(organization_id,agent_name,enabled,daily_action_budget,updated_by,updated_at)
    VALUES(p_organization,trim(p_agent),p_enabled,p_budget,auth.uid(),now())
    ON CONFLICT(organization_id,agent_name) DO UPDATE SET enabled=excluded.enabled,daily_action_budget=excluded.daily_action_budget,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
  INSERT INTO public.platform_ai_review_events(organization_id,actor_id,note)
    VALUES(p_organization,auth.uid(),format('Agent %s: enabled=%s; daily budget=%s',trim(p_agent),p_enabled,p_budget));
END; $$;

REVOKE ALL ON FUNCTION public.admin_create_support_case(text,text,uuid,uuid,uuid,text),
 public.admin_update_support_case(uuid,integer,text,uuid,text),public.admin_decide_ai_action(uuid,text,text),
 public.admin_set_ai_control(uuid,text,boolean,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_create_support_case(text,text,uuid,uuid,uuid,text),
 public.admin_update_support_case(uuid,integer,text,uuid,text),public.admin_decide_ai_action(uuid,text,text),
 public.admin_set_ai_control(uuid,text,boolean,integer) TO authenticated;
CREATE FUNCTION public.admin_require_communication_access() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN PERFORM private.require_admin_upgrade_access('communications'); END; $$;
REVOKE ALL ON FUNCTION public.admin_require_communication_access() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_require_communication_access() TO authenticated;
COMMIT;
