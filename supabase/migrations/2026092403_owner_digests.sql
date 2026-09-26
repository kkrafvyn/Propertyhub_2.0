ALTER TABLE public.owner_oversight_notification_prefs ADD COLUMN digest_timezone TEXT NOT NULL DEFAULT 'UTC';
-- Service jobs must check the recipient's current scope rather than relying on
-- auth.uid(), which is absent for workers. Removing membership/access stops future
-- reports even when an older management agreement has not yet been ended.
CREATE OR REPLACE FUNCTION private.owner_has_property_scope(p_user UUID,p_org UUID,p_property UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.organization_members m
  JOIN public.organizations o ON o.id=m.organization_id AND NOT coalesce(o.suspended,false)
  JOIN public.properties p ON p.id=p_property AND p.organization_id=m.organization_id
  WHERE m.user_id=p_user AND m.organization_id=p_org AND (
   coalesce(m.scope_mode,'organization')='organization' OR (m.scope_mode='properties' AND (
    EXISTS(SELECT 1 FROM public.organization_member_property_scopes s WHERE s.organization_id=p_org AND s.user_id=p_user AND s.property_id=p_property)
    OR EXISTS(SELECT 1 FROM public.organization_member_unit_scopes s
      JOIN public.organization_units u ON u.id=s.unit_id AND u.organization_id=p_org
      JOIN public.organization_unit_properties p ON p.organization_unit_id=u.id AND p.property_id=p_property
      WHERE s.organization_id=p_org AND s.user_id=p_user)
   ))));
$$;
REVOKE ALL ON FUNCTION private.owner_has_property_scope(UUID,UUID,UUID) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION private.validate_digest_timezone() RETURNS TRIGGER LANGUAGE plpgsql SET search_path='' AS $$
BEGIN IF NOT EXISTS(SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=NEW.digest_timezone) THEN RAISE EXCEPTION 'Choose a valid IANA time zone'; END IF; RETURN NEW; END; $$;
CREATE TRIGGER owner_digest_timezone BEFORE INSERT OR UPDATE ON public.owner_oversight_notification_prefs FOR EACH ROW EXECUTE FUNCTION private.validate_digest_timezone();
CREATE TABLE public.owner_digest_deliveries(
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),user_id UUID NOT NULL REFERENCES public.users(id),cadence TEXT NOT NULL CHECK(cadence IN('daily','weekly')),
 period_start TIMESTAMPTZ NOT NULL,period_end TIMESTAMPTZ NOT NULL,period_start_date DATE NOT NULL,digest_timezone TEXT NOT NULL,
 notification_id UUID REFERENCES public.notification_logs(id),
 status TEXT NOT NULL DEFAULT 'delivered' CHECK(status='delivered'),created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK(period_end>period_start),UNIQUE(user_id,cadence,period_start_date)
);
ALTER TABLE public.owner_digest_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_digest_read ON public.owner_digest_deliveries FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_platform_admin());
CREATE POLICY active_account_required ON public.owner_digest_deliveries AS RESTRICTIVE FOR ALL TO authenticated USING(private.account_access_allowed()) WITH CHECK(private.account_access_allowed());
GRANT SELECT ON public.owner_digest_deliveries TO authenticated;
GRANT ALL ON public.owner_digest_deliveries TO service_role;
CREATE TRIGGER track_platform_activity AFTER INSERT OR UPDATE OR DELETE ON public.owner_digest_deliveries FOR EACH ROW EXECUTE FUNCTION private.record_platform_activity();
-- In-app delivery and its receipt commit together. Retrying a local calendar
-- period, including after a time-zone change, cannot add a second notification.
-- The service-only clock parameter also permits deterministic restore/testing.
CREATE OR REPLACE FUNCTION public.deliver_owner_digests(p_run_at TIMESTAMPTZ DEFAULT NOW())
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p RECORD; v_cadence TEXT; end_local TIMESTAMP; start_at TIMESTAMPTZ; end_at TIMESTAMPTZ; notification UUID; sent INTEGER:=0; work_orders INTEGER; expenses INTEGER; outstanding INTEGER;
BEGIN
 IF p_run_at IS NULL OR NOT isfinite(p_run_at) THEN RAISE EXCEPTION 'A finite digest run time is required'; END IF;
 FOR p IN SELECT f.* FROM public.owner_oversight_notification_prefs f JOIN public.users u ON u.id=f.user_id
  LEFT JOIN public.notification_preferences n ON n.user_id=f.user_id
  WHERE (f.daily_digest OR f.weekly_digest) AND coalesce(n.in_app_enabled,true) AND coalesce(n.notification_frequency,'daily')<>'never'
  AND NOT coalesce(u.banned,false) AND u.account_deletion_requested_at IS NULL AND u.account_deleted_at IS NULL
  AND EXISTS(SELECT 1 FROM auth.users a WHERE a.id=u.id AND a.deleted_at IS NULL AND (a.banned_until IS NULL OR a.banned_until<=now()))
  FOR UPDATE OF f SKIP LOCKED
 LOOP
  FOREACH v_cadence IN ARRAY ARRAY['daily','weekly'] LOOP
   IF (v_cadence='daily' AND NOT p.daily_digest) OR (v_cadence='weekly' AND NOT p.weekly_digest) THEN CONTINUE; END IF;
   end_local:=date_trunc(CASE WHEN v_cadence='daily' THEN 'day' ELSE 'week' END,p_run_at AT TIME ZONE p.digest_timezone);
   end_at:=end_local AT TIME ZONE p.digest_timezone;
   start_at:=(end_local-CASE WHEN v_cadence='daily' THEN INTERVAL '1 day' ELSE INTERVAL '1 week' END) AT TIME ZONE p.digest_timezone;
   IF EXISTS(SELECT 1 FROM public.owner_digest_deliveries d WHERE d.user_id=p.user_id AND d.cadence=v_cadence
    AND d.period_start_date=(start_at AT TIME ZONE p.digest_timezone)::date) THEN CONTINUE; END IF;
   IF NOT EXISTS(SELECT 1 FROM public.property_management_agreements a JOIN public.organizations o ON o.id=a.managing_organization_id
    JOIN public.properties prop ON prop.id=a.property_id AND prop.organization_id=a.managing_organization_id
    WHERE a.owner_user_id=p.user_id AND a.status='active'
      AND a.reporting_cadence=CASE WHEN v_cadence='daily' THEN 'daily_digest' ELSE 'weekly' END
      AND NOT coalesce(o.suspended,false)
      AND private.owner_has_property_scope(p.user_id,a.managing_organization_id,a.property_id)) THEN CONTINUE; END IF;
   SELECT count(*) INTO work_orders FROM public.estate_work_orders w WHERE coalesce(w.updated_at,w.created_at)>=start_at AND coalesce(w.updated_at,w.created_at)<end_at
    AND EXISTS(SELECT 1 FROM public.property_management_agreements a JOIN public.managed_estates e ON e.id=w.estate_id
      JOIN public.organizations o ON o.id=a.managing_organization_id
      JOIN public.properties prop ON prop.id=a.property_id AND prop.organization_id=a.managing_organization_id
      WHERE a.owner_user_id=p.user_id AND a.status='active' AND a.reporting_cadence=CASE WHEN v_cadence='daily' THEN 'daily_digest' ELSE 'weekly' END
      AND NOT coalesce(o.suspended,false) AND a.property_id=e.property_id AND e.organization_id=a.managing_organization_id
      AND private.owner_has_property_scope(p.user_id,a.managing_organization_id,a.property_id)
      AND coalesce(a.permissions->>'view_maintenance','true')='true');
   SELECT count(*) FILTER(WHERE x.created_at>=start_at AND x.created_at<end_at),count(*) FILTER(WHERE x.status='pending') INTO expenses,outstanding
    FROM public.owner_expense_approvals x JOIN public.property_management_agreements a ON a.id=x.agreement_id
    JOIN public.organizations o ON o.id=a.managing_organization_id
    JOIN public.properties prop ON prop.id=a.property_id AND prop.organization_id=a.managing_organization_id
    WHERE x.owner_user_id=p.user_id AND a.owner_user_id=p.user_id AND x.organization_id=a.managing_organization_id
      AND (x.property_id IS NULL OR x.property_id=a.property_id) AND a.status='active'
      AND a.reporting_cadence=CASE WHEN v_cadence='daily' THEN 'daily_digest' ELSE 'weekly' END
      AND NOT coalesce(o.suspended,false) AND coalesce(a.permissions->>'approve_expenses','true')='true'
      AND private.owner_has_property_scope(p.user_id,a.managing_organization_id,a.property_id);
   INSERT INTO public.notification_logs(user_id,notification_type,channel,subject,content,delivered,delivered_at,action_url,notification_category)
   VALUES(p.user_id,'owner_'||v_cadence||'_digest','in_app','Owner '||v_cadence||' digest',
    'Period '||(start_at AT TIME ZONE p.digest_timezone)::date||' to '||end_local::date||' (end exclusive, '||p.digest_timezone||'): '||work_orders||' work orders last updated, '||expenses||' expense requests created. Currently '||outstanding||' pending approvals.',true,now(),'/app/workspace-access','System') RETURNING id INTO notification;
   INSERT INTO public.owner_digest_deliveries(user_id,cadence,period_start,period_end,period_start_date,digest_timezone,notification_id)
    VALUES(p.user_id,v_cadence,start_at,end_at,(start_at AT TIME ZONE p.digest_timezone)::date,p.digest_timezone,notification);
   sent:=sent+1;
  END LOOP;
 END LOOP;
 RETURN sent;
END; $$;
REVOKE ALL ON FUNCTION public.deliver_owner_digests(TIMESTAMPTZ),private.validate_digest_timezone() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.deliver_owner_digests(TIMESTAMPTZ) TO service_role;
NOTIFY pgrst,'reload schema';
