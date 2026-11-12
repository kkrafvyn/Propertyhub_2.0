BEGIN;
ALTER TABLE public.platform_support_cases ADD COLUMN priority text NOT NULL DEFAULT 'normal'
 CHECK(priority IN ('low','normal','high','urgent'));
ALTER TABLE public.platform_support_cases ADD COLUMN last_reminded_at timestamptz;
CREATE TABLE public.platform_support_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES public.platform_support_cases(id),
 author_id uuid NOT NULL REFERENCES public.users(id),content text NOT NULL CHECK(length(trim(content)) BETWEEN 1 AND 4000),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION public.can_read_support_thread(p_case uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT auth.uid() IS NOT NULL AND private.account_access_allowed() AND EXISTS (
  SELECT 1 FROM public.platform_support_cases c WHERE c.id=p_case AND
   (public.admin_can_access_support_case(c.category) OR (c.category='support' AND c.account_id=auth.uid()))
 );
$$;
REVOKE ALL ON FUNCTION public.can_read_support_thread(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_read_support_thread(uuid) TO authenticated;
CREATE POLICY customer_support_case_read ON public.platform_support_cases FOR SELECT TO authenticated
 USING(category='support' AND account_id=auth.uid() AND private.account_access_allowed());
ALTER TABLE public.platform_support_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_support_messages FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.platform_support_messages TO authenticated;
CREATE POLICY support_message_read ON public.platform_support_messages FOR SELECT TO authenticated USING(public.can_read_support_thread(case_id));

CREATE FUNCTION public.support_send_message(p_case uuid,p_content text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_case public.platform_support_cases%ROWTYPE; v_id uuid; v_recipient uuid;
BEGIN
 SELECT * INTO v_case FROM public.platform_support_cases WHERE id=p_case FOR UPDATE;
 IF NOT FOUND OR v_case.category<>'support' OR NOT public.can_read_support_thread(p_case) THEN RAISE EXCEPTION 'Support thread unavailable'; END IF;
 IF length(trim(coalesce(p_content,''))) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Enter a message up to 4000 characters'; END IF;
 INSERT INTO public.platform_support_messages(case_id,author_id,content) VALUES(p_case,auth.uid(),trim(p_content)) RETURNING id INTO v_id;
 UPDATE public.platform_support_cases SET updated_at=now(),revision=revision+1,
  status=CASE WHEN status='resolved' THEN 'open' ELSE status END WHERE id=p_case;
 v_recipient:=CASE WHEN auth.uid()=v_case.account_id THEN v_case.assigned_to ELSE v_case.account_id END;
 IF v_recipient IS NOT NULL AND v_recipient<>auth.uid() THEN
  INSERT INTO public.notification_logs(user_id,notification_type,channel,subject,content,delivered,delivered_at,read)
   VALUES(v_recipient,'support_reply','in_app','New support reply','There is a new reply in your support case.',true,now(),false);
 END IF;
 RETURN v_id;
END; $$;
CREATE FUNCTION public.customer_create_support_case(p_subject text,p_message text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN RAISE EXCEPTION 'Sign in to contact support'; END IF;
 IF length(trim(coalesce(p_subject,''))) NOT BETWEEN 3 AND 200 OR length(trim(coalesce(p_message,''))) NOT BETWEEN 10 AND 4000 THEN RAISE EXCEPTION 'Add a subject and detailed message'; END IF;
 IF (SELECT count(*) FROM public.platform_support_cases WHERE account_id=auth.uid() AND created_at>now()-interval '1 hour')>=5 THEN RAISE EXCEPTION 'Please wait before creating another case'; END IF;
 INSERT INTO public.platform_support_cases(subject,category,account_id,created_by) VALUES(trim(p_subject),'support',auth.uid(),auth.uid()) RETURNING id INTO v_id;
 INSERT INTO public.platform_support_messages(case_id,author_id,content) VALUES(v_id,auth.uid(),trim(p_message));
 RETURN v_id;
END; $$;
CREATE FUNCTION public.admin_support_staff(p_case uuid)
RETURNS TABLE(id uuid,full_name text,email text) LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_category text; v_grant text;
BEGIN
 SELECT category INTO v_category FROM public.platform_support_cases WHERE platform_support_cases.id=p_case;
 IF NOT public.admin_can_access_support_case(v_category) THEN RAISE EXCEPTION 'Staff lookup denied'; END IF;
 v_grant:=CASE v_category WHEN 'delivery_retry' THEN 'communications' WHEN 'payment_review' THEN 'payments' ELSE 'support' END;
 RETURN QUERY SELECT u.id,u.full_name::text,u.email::text FROM public.users u WHERE NOT coalesce(u.banned,false)
 AND u.account_deletion_requested_at IS NULL AND (u.is_platform_admin OR 'support'=ANY(u.platform_console_grants) OR v_grant=ANY(u.platform_console_grants)) ORDER BY u.full_name NULLS LAST,u.id LIMIT 500;
END; $$;
CREATE FUNCTION public.admin_set_case_priority(p_case uuid,p_revision integer,p_priority text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_case public.platform_support_cases%ROWTYPE;
BEGIN
 SELECT * INTO v_case FROM public.platform_support_cases WHERE id=p_case FOR UPDATE;
 IF NOT FOUND OR NOT public.admin_can_access_support_case(v_case.category) THEN RAISE EXCEPTION 'Case access denied'; END IF;
 IF p_revision IS NULL OR p_revision<>v_case.revision THEN RAISE EXCEPTION 'Case changed. Refresh before saving.'; END IF;
 IF p_priority IS NULL OR p_priority NOT IN ('low','normal','high','urgent') THEN RAISE EXCEPTION 'Invalid priority'; END IF;
 UPDATE public.platform_support_cases SET priority=p_priority,revision=revision+1,updated_at=now(),
 due_at=created_at+CASE p_priority WHEN 'urgent' THEN interval '2 hours' WHEN 'high' THEN interval '8 hours' WHEN 'low' THEN interval '72 hours' ELSE interval '24 hours' END WHERE id=p_case;
 INSERT INTO public.platform_support_case_events(case_id,actor_id,note) VALUES(p_case,auth.uid(),'Priority changed to '||p_priority);
END; $$;
CREATE FUNCTION public.admin_remind_overdue_support() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_case public.platform_support_cases%ROWTYPE; v_count integer:=0;
BEGIN
 PERFORM private.require_admin_upgrade_access('support');
 FOR v_case IN SELECT * FROM public.platform_support_cases WHERE status<>'resolved' AND due_at<now() AND assigned_to IS NOT NULL
 AND (last_reminded_at IS NULL OR last_reminded_at<now()-interval '24 hours') FOR UPDATE SKIP LOCKED LOOP
  INSERT INTO public.notification_logs(user_id,notification_type,channel,subject,content,delivered,delivered_at,read)
  VALUES(v_case.assigned_to,'support_overdue','in_app','Support follow-up overdue','Review an overdue case in the platform support queue.',true,now(),false);
  UPDATE public.platform_support_cases SET last_reminded_at=now() WHERE id=v_case.id;
  v_count:=v_count+1;
 END LOOP;
 RETURN v_count;
END; $$;

CREATE TABLE public.ai_daily_usage (
 organization_id uuid NOT NULL REFERENCES public.organizations(id),agent_name text NOT NULL,usage_day date NOT NULL,
 action_count integer NOT NULL DEFAULT 0 CHECK(action_count>=0),PRIMARY KEY(organization_id,agent_name,usage_day)
);
CREATE TABLE public.ai_usage_reservations (
 organization_id uuid NOT NULL,agent_name text NOT NULL,request_id uuid NOT NULL,actor_id uuid NOT NULL REFERENCES public.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(organization_id,agent_name,request_id)
);
ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ai_daily_usage,public.ai_usage_reservations FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ai_daily_usage TO authenticated;
CREATE POLICY ai_usage_read ON public.ai_daily_usage FOR SELECT TO authenticated USING(public.admin_can_review_ai());
CREATE FUNCTION public.consume_ai_action(p_organization uuid,p_agent text,p_tool text,p_request uuid) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_budget integer; v_enabled boolean; v_count integer; v_day date:=(now() AT TIME ZONE 'UTC')::date;
BEGIN
 IF auth.uid() IS NULL OR NOT private.account_access_allowed() OR NOT (
 (public.has_platform_console_grant('ai_governance') AND coalesce(auth.jwt()->>'aal','')='aal2') OR
 EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id=p_organization AND m.user_id=auth.uid())
 ) THEN RAISE EXCEPTION 'Organization AI access denied' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR length(trim(coalesce(p_agent,''))) NOT BETWEEN 1 AND 100 OR length(trim(coalesce(p_tool,''))) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'Agent, tool and request ID are required'; END IF;
 IF EXISTS(SELECT 1 FROM public.ai_org_controls WHERE organization_id=p_organization AND NOT globally_enabled)
 OR EXISTS(SELECT 1 FROM public.ai_tool_allowlist WHERE organization_id=p_organization AND tool_name=p_tool AND NOT enabled) THEN RAISE EXCEPTION 'AI is paused for this organization or tool'; END IF;
 SELECT enabled,daily_action_budget INTO v_enabled,v_budget FROM public.ai_agent_controls WHERE organization_id=p_organization AND agent_name=p_agent;
 IF FOUND AND NOT v_enabled THEN RAISE EXCEPTION 'Agent is paused'; END IF;
 v_budget:=coalesce(v_budget,100);
 -- Serialize request deduplication and consumption for this organization/agent.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_organization::text||':'||p_agent,0));
 IF EXISTS(SELECT 1 FROM public.ai_usage_reservations WHERE organization_id=p_organization AND agent_name=p_agent AND request_id=p_request) THEN
  SELECT action_count INTO v_count FROM public.ai_daily_usage WHERE organization_id=p_organization AND agent_name=p_agent AND usage_day=v_day;
  RETURN coalesce(v_count,0);
 END IF;
 IF v_budget<=0 THEN RAISE EXCEPTION 'Daily AI action budget exhausted'; END IF;
 INSERT INTO public.ai_daily_usage(organization_id,agent_name,usage_day,action_count) VALUES(p_organization,p_agent,v_day,1)
 ON CONFLICT(organization_id,agent_name,usage_day) DO UPDATE SET action_count=public.ai_daily_usage.action_count+1
 WHERE public.ai_daily_usage.action_count<v_budget RETURNING action_count INTO v_count;
 IF NOT FOUND THEN RAISE EXCEPTION 'Daily AI action budget exhausted'; END IF;
 INSERT INTO public.ai_usage_reservations(organization_id,agent_name,request_id,actor_id) VALUES(p_organization,p_agent,p_request,auth.uid());
 RETURN v_count;
END; $$;

CREATE TABLE public.platform_delivery_retries (
 source_attempt_id uuid PRIMARY KEY REFERENCES public.communication_delivery_attempts(id),
 retry_attempt_id uuid NOT NULL UNIQUE REFERENCES public.communication_delivery_attempts(id),actor_id uuid NOT NULL REFERENCES public.users(id),
 state text NOT NULL DEFAULT 'processing' CHECK(state IN ('processing','sent','failed','unknown')),reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_delivery_retries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_delivery_retries FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.platform_delivery_retries TO authenticated;
CREATE POLICY delivery_retry_read ON public.platform_delivery_retries FOR SELECT TO authenticated USING(public.admin_can_access_support_case('delivery_retry'));
CREATE FUNCTION public.admin_claim_delivery_retry(p_attempt uuid,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row public.communication_delivery_attempts%ROWTYPE; v_id uuid;
BEGIN
 PERFORM private.require_admin_upgrade_access('communications');
 IF length(trim(coalesce(p_reason,''))) NOT BETWEEN 10 AND 1000 THEN RAISE EXCEPTION 'Record a detailed retry reason'; END IF;
 SELECT * INTO v_row FROM public.communication_delivery_attempts WHERE id=p_attempt FOR UPDATE;
 IF NOT FOUND OR v_row.status<>'failed' OR v_row.channel NOT IN ('whatsapp','sms') OR v_row.message_id IS NULL OR v_row.recipient_user_id IS NULL THEN RAISE EXCEPTION 'This delivery cannot be retried'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(v_row.message_id::text||v_row.recipient_user_id::text||v_row.channel,0));
 IF EXISTS(SELECT 1 FROM public.communication_delivery_attempts a WHERE a.message_id=v_row.message_id AND a.recipient_user_id=v_row.recipient_user_id AND a.channel=v_row.channel AND (a.status IN ('queued','sent','delivered') OR a.attempt_number>v_row.attempt_number)) THEN RAISE EXCEPTION 'A newer or possibly delivered attempt already exists. Review before retrying.'; END IF;
 INSERT INTO public.communication_delivery_attempts(organization_id,conversation_id,message_id,recipient_user_id,channel,attempt_number,status)
 VALUES(v_row.organization_id,v_row.conversation_id,v_row.message_id,v_row.recipient_user_id,v_row.channel,v_row.attempt_number+1,'queued') RETURNING id INTO v_id;
 INSERT INTO public.platform_delivery_retries(source_attempt_id,retry_attempt_id,actor_id,reason) VALUES(p_attempt,v_id,auth.uid(),trim(p_reason));
 RETURN v_id;
END; $$;

CREATE POLICY platform_payment_read ON public.property_transactions FOR SELECT TO authenticated USING(public.has_platform_console_grant('payments') AND coalesce(auth.jwt()->>'aal','')='aal2');
CREATE POLICY platform_refunds_read ON public.property_refunds FOR SELECT TO authenticated USING(public.has_platform_console_grant('payments') AND coalesce(auth.jwt()->>'aal','')='aal2');
ALTER TABLE public.platform_support_cases ADD COLUMN source_ledger text NOT NULL DEFAULT 'platform' CHECK(source_ledger IN ('platform','property'));
CREATE FUNCTION public.admin_create_property_payment_case(p_transaction uuid,p_subject text,p_note text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_tx public.property_transactions%ROWTYPE; v_id uuid;
BEGIN
 PERFORM private.require_admin_upgrade_access('payments');
 SELECT * INTO v_tx FROM public.property_transactions WHERE id=p_transaction;
 IF NOT FOUND OR length(trim(coalesce(p_subject,''))) NOT BETWEEN 3 AND 200 OR length(trim(coalesce(p_note,''))) NOT BETWEEN 10 AND 4000 THEN RAISE EXCEPTION 'Valid transaction, subject and note required'; END IF;
 INSERT INTO public.platform_support_cases(subject,category,organization_id,account_id,source_id,source_ledger,created_by)
 VALUES(trim(p_subject),'payment_review',v_tx.organization_id,v_tx.payer_user_id,v_tx.id,'property',auth.uid()) RETURNING id INTO v_id;
 INSERT INTO public.platform_support_case_events(case_id,actor_id,note) VALUES(v_id,auth.uid(),trim(p_note));
 RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.support_send_message(uuid,text),public.customer_create_support_case(text,text),public.admin_support_staff(uuid),
 public.admin_set_case_priority(uuid,integer,text),public.admin_remind_overdue_support(),public.consume_ai_action(uuid,text,text,uuid),
 public.admin_claim_delivery_retry(uuid,text),public.admin_create_property_payment_case(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.support_send_message(uuid,text),public.customer_create_support_case(text,text),public.admin_support_staff(uuid),
 public.admin_set_case_priority(uuid,integer,text),public.admin_remind_overdue_support(),public.consume_ai_action(uuid,text,text,uuid),
 public.admin_claim_delivery_retry(uuid,text),public.admin_create_property_payment_case(uuid,text,text) TO authenticated;
GRANT SELECT,UPDATE ON public.platform_delivery_retries TO service_role;
COMMIT;
