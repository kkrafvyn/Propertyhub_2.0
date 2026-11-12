BEGIN;
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('support-attachments','support-attachments',false,10485760,ARRAY['application/pdf','image/png','image/jpeg'])
 ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
CREATE TABLE public.platform_support_attachments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),case_id uuid NOT NULL REFERENCES public.platform_support_cases(id),
 storage_path text NOT NULL UNIQUE,filename text NOT NULL CHECK(length(filename) BETWEEN 1 AND 200),
 uploaded_by uuid NOT NULL REFERENCES public.users(id),created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_support_attachments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_support_attachments FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.platform_support_attachments TO authenticated;
CREATE POLICY support_attachment_read ON public.platform_support_attachments FOR SELECT TO authenticated USING(public.can_read_support_thread(case_id));
CREATE FUNCTION public.can_access_support_file(p_path text) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE v_case uuid;
BEGIN
 IF split_part(p_path,'/',1)!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN false; END IF;
 v_case:=split_part(p_path,'/',1)::uuid;
 RETURN public.can_read_support_thread(v_case);
END; $$;
REVOKE ALL ON FUNCTION public.can_access_support_file(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.can_access_support_file(text) TO authenticated;
CREATE POLICY support_file_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id='support-attachments' AND public.can_access_support_file(name));
CREATE POLICY support_file_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING(bucket_id<>'support-attachments' OR public.can_access_support_file(name));
CREATE POLICY support_file_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id='support-attachments' AND owner_id=auth.uid()::text AND public.can_access_support_file(name));
CREATE POLICY support_file_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(bucket_id<>'support-attachments' OR (owner_id=auth.uid()::text AND public.can_access_support_file(name)));
CREATE POLICY support_file_no_overwrite ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING(bucket_id<>'support-attachments') WITH CHECK(bucket_id<>'support-attachments');
CREATE POLICY support_file_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING(bucket_id<>'support-attachments' OR (
 owner_id=auth.uid()::text AND public.can_access_support_file(name) AND NOT EXISTS(SELECT 1 FROM public.platform_support_attachments a WHERE a.storage_path=name)
));
CREATE POLICY support_file_orphan_delete ON storage.objects FOR DELETE TO authenticated USING(bucket_id='support-attachments' AND owner_id=auth.uid()::text AND public.can_access_support_file(name) AND NOT EXISTS(SELECT 1 FROM public.platform_support_attachments a WHERE a.storage_path=name));
CREATE FUNCTION public.support_attach_file(p_case uuid,p_path text,p_filename text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_id uuid;
BEGIN
 IF NOT public.can_read_support_thread(p_case) OR split_part(p_path,'/',1)<>p_case::text OR length(trim(coalesce(p_filename,''))) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'Attachment access denied'; END IF;
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='support-attachments' AND name=p_path AND owner_id=auth.uid()::text) THEN RAISE EXCEPTION 'Upload the attachment before linking it'; END IF;
 INSERT INTO public.platform_support_attachments(case_id,storage_path,filename,uploaded_by) VALUES(p_case,p_path,trim(p_filename),auth.uid()) RETURNING id INTO v_id;
 RETURN v_id;
END; $$;

CREATE TABLE public.platform_account_recoveries (
 case_id uuid PRIMARY KEY REFERENCES public.platform_support_cases(id),account_id uuid NOT NULL REFERENCES public.users(id),
 approved_by uuid NOT NULL REFERENCES public.users(id),factor_ids uuid[] NOT NULL,
 state text NOT NULL DEFAULT 'approved' CHECK(state IN ('approved','processing','completed','manual_review','cancelled')),
 ready_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),notification_error boolean NOT NULL DEFAULT false
);
ALTER TABLE public.platform_account_recoveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.platform_account_recoveries FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.platform_account_recoveries TO authenticated;
GRANT SELECT,UPDATE ON public.platform_account_recoveries TO service_role;
CREATE POLICY recovery_read ON public.platform_account_recoveries FOR SELECT TO authenticated USING(public.admin_can_access_support_case('mfa_recovery'));
CREATE FUNCTION public.admin_approve_account_recovery(p_case uuid,p_evidence text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_case public.platform_support_cases%ROWTYPE; v_factors uuid[];
BEGIN
 PERFORM private.require_admin_upgrade_access('support');
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=auth.uid() AND is_platform_admin) THEN RAISE EXCEPTION 'Platform owner approval required'; END IF;
 SELECT * INTO v_case FROM public.platform_support_cases WHERE id=p_case FOR UPDATE;
 IF NOT FOUND OR v_case.category<>'mfa_recovery' OR v_case.status='resolved' OR v_case.account_id IS NULL THEN RAISE EXCEPTION 'Active recovery case required'; END IF;
 IF auth.uid() IN (v_case.created_by,v_case.account_id) THEN RAISE EXCEPTION 'An independent owner must approve recovery'; END IF;
 IF length(trim(coalesce(p_evidence,''))) NOT BETWEEN 40 AND 4000 THEN RAISE EXCEPTION 'Record identity verification evidence and the reason for recovery'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=v_case.account_id AND NOT coalesce(banned,false) AND account_deletion_requested_at IS NULL) THEN RAISE EXCEPTION 'Account is not eligible for recovery'; END IF;
 SELECT coalesce(array_agg(id ORDER BY id),'{}'::uuid[]) INTO v_factors FROM auth.mfa_factors WHERE user_id=v_case.account_id;
 IF cardinality(v_factors)=0 THEN RAISE EXCEPTION 'Account has no authenticator to recover'; END IF;
 INSERT INTO public.platform_account_recoveries(case_id,account_id,approved_by,factor_ids) VALUES(p_case,v_case.account_id,auth.uid(),v_factors);
 INSERT INTO public.platform_support_case_events(case_id,actor_id,note) VALUES(p_case,auth.uid(),'Recovery approved with a 24-hour waiting period. Evidence: '||trim(p_evidence));
 INSERT INTO public.notification_logs(user_id,notification_type,channel,subject,content,delivered,delivered_at,read)
 VALUES(v_case.account_id,'account_recovery','in_app','Account recovery requested','An owner approved an authenticator recovery request. Contact support immediately if you did not request it. Recovery cannot proceed for 24 hours.',true,now(),false);
 RETURN v_case.account_id;
END; $$;
CREATE FUNCTION public.admin_claim_account_recovery(p_case uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row public.platform_account_recoveries%ROWTYPE; v_factors uuid[];
BEGIN
 PERFORM private.require_admin_upgrade_access('support');
 IF NOT EXISTS(SELECT 1 FROM public.users WHERE id=auth.uid() AND is_platform_admin) THEN RAISE EXCEPTION 'Platform owner required'; END IF;
 SELECT * INTO v_row FROM public.platform_account_recoveries WHERE case_id=p_case FOR UPDATE;
 IF NOT FOUND OR v_row.state<>'approved' OR v_row.ready_at>now() OR v_row.account_id=auth.uid() THEN RAISE EXCEPTION 'Recovery is unavailable, already started, or still in its waiting period'; END IF;
 IF EXISTS(SELECT 1 FROM public.platform_support_cases WHERE id=p_case AND status='resolved') THEN RAISE EXCEPTION 'Recovery case was closed'; END IF;
 SELECT coalesce(array_agg(id ORDER BY id),'{}'::uuid[]) INTO v_factors FROM auth.mfa_factors WHERE user_id=v_row.account_id;
 IF v_factors<>v_row.factor_ids THEN RAISE EXCEPTION 'Authenticators changed after approval. A new review is required.'; END IF;
 UPDATE public.platform_account_recoveries SET state='processing' WHERE case_id=p_case;
 INSERT INTO public.platform_support_case_events(case_id,actor_id,note) VALUES(p_case,auth.uid(),'Owner started approved account recovery.');
 RETURN v_row.account_id;
END; $$;
CREATE FUNCTION public.complete_admin_account_recovery(p_case uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row public.platform_account_recoveries%ROWTYPE;
BEGIN
 SELECT * INTO v_row FROM public.platform_account_recoveries WHERE case_id=p_case FOR UPDATE;
 IF NOT FOUND OR v_row.state<>'processing' THEN RAISE EXCEPTION 'No recovery in progress'; END IF;
 IF EXISTS(SELECT 1 FROM auth.mfa_factors WHERE user_id=v_row.account_id) THEN RAISE EXCEPTION 'Authenticator removal is incomplete'; END IF;
 DELETE FROM auth.sessions WHERE user_id=v_row.account_id;
 UPDATE public.platform_account_recoveries SET state='completed',completed_at=now() WHERE case_id=p_case;
 INSERT INTO public.platform_support_case_events(case_id,actor_id,note) VALUES(p_case,v_row.approved_by,'Recovery completed. Existing sessions were revoked; the account must sign in and enroll a new authenticator.');
 INSERT INTO public.notification_logs(user_id,notification_type,channel,subject,content,delivered,delivered_at,read)
 VALUES(v_row.account_id,'account_recovery','in_app','Authenticator recovery completed','Your authenticator was reset after an approved recovery review. Sign in and set up a new authenticator before entering protected areas.',true,now(),false);
END; $$;
CREATE FUNCTION public.my_account_recoveries() RETURNS TABLE(case_id uuid,state text,ready_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT r.case_id,r.state,r.ready_at FROM public.platform_account_recoveries r
 WHERE r.account_id=auth.uid() AND private.account_access_allowed() AND r.state IN ('approved','processing','manual_review') ORDER BY r.created_at DESC;
$$;
CREATE FUNCTION public.cancel_my_account_recovery(p_case uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN RAISE EXCEPTION 'Active account required'; END IF;
 UPDATE public.platform_account_recoveries SET state='cancelled' WHERE case_id=p_case AND account_id=auth.uid() AND state='approved';
 IF NOT FOUND THEN RAISE EXCEPTION 'Recovery cannot be cancelled here. Contact support immediately.'; END IF;
 INSERT INTO public.platform_support_case_events(case_id,actor_id,note) VALUES(p_case,auth.uid(),'The account holder cancelled the recovery request.');
END; $$;
REVOKE ALL ON FUNCTION public.my_account_recoveries(),public.cancel_my_account_recovery(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.my_account_recoveries(),public.cancel_my_account_recovery(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.complete_admin_account_recovery(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_admin_account_recovery(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.support_attach_file(uuid,text,text),public.admin_approve_account_recovery(uuid,text),public.admin_claim_account_recovery(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.support_attach_file(uuid,text,text),public.admin_approve_account_recovery(uuid,text),public.admin_claim_account_recovery(uuid) TO authenticated;
COMMIT;
