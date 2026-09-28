-- Additive hardening for participant, developer API, webhook, audit and resource-binding findings.

-- Conversation access must be established by an authorized path, not a known UUID.
CREATE OR REPLACE FUNCTION private.can_join_conversation(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND (
        c.participant_1_id = auth.uid()
        OR c.participant_2_id = auth.uid()
        OR (
          c.organization_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.organization_members m
            WHERE m.organization_id = c.organization_id AND m.user_id = auth.uid()
          )
          AND c.conversation_type IN ('group', 'support', 'organization_shared', 'channel')
        )
      )
  );
$$;

DROP POLICY IF EXISTS "users can insert themselves as participant" ON public.conversation_participants;
CREATE POLICY "authorized users can self join conversations"
ON public.conversation_participants
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND participant_role = 'member'
  AND private.can_join_conversation(conversation_id)
);

CREATE OR REPLACE FUNCTION private.guard_conversation_participant_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND auth.role() = 'authenticated'
    AND (NEW.user_id IS DISTINCT FROM auth.uid() OR NEW.participant_role <> 'member') THEN
    RAISE EXCEPTION 'Participant identity and privileged role are server-controlled';
  END IF;
  IF TG_OP = 'UPDATE' AND auth.role() = 'authenticated'
    AND (NEW.conversation_id, NEW.user_id, NEW.participant_role)
      IS DISTINCT FROM (OLD.conversation_id, OLD.user_id, OLD.participant_role) THEN
    RAISE EXCEPTION 'Participant identity and role are immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_conversation_participant_identity ON public.conversation_participants;
CREATE TRIGGER trg_guard_conversation_participant_identity
BEFORE INSERT OR UPDATE ON public.conversation_participants
FOR EACH ROW EXECUTE FUNCTION private.guard_conversation_participant_identity();

-- Developer API and webhook management requires explicit capability; raw secrets are never selectable.
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.organization_api_keys, public.organization_webhook_subscriptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.organization_api_keys, public.organization_webhook_subscriptions TO authenticated;
DROP POLICY IF EXISTS "Org members read API keys" ON public.organization_api_keys;
DROP POLICY IF EXISTS "Org admins manage API keys" ON public.organization_api_keys;
DROP POLICY IF EXISTS "Org members read webhooks" ON public.organization_webhook_subscriptions;
DROP POLICY IF EXISTS "Org admins manage webhooks" ON public.organization_webhook_subscriptions;
CREATE POLICY "Developer capability reads API keys" ON public.organization_api_keys FOR SELECT
USING (private.org_member_has_permission(organization_id, 'developer_api:manage'));
CREATE POLICY "Developer capability reads webhooks" ON public.organization_webhook_subscriptions FOR SELECT
USING (private.org_member_has_permission(organization_id, 'webhooks:manage'));

CREATE OR REPLACE FUNCTION public.create_organization_api_key(
  p_organization_id UUID, p_name TEXT, p_scopes TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_raw TEXT; v_row public.organization_api_keys;
BEGIN
  IF NOT private.org_member_has_permission(p_organization_id, 'developer_api:manage') THEN
    RAISE EXCEPTION 'Developer API management capability is required';
  END IF;
  IF p_name IS NULL OR btrim(p_name) = '' OR p_scopes IS NULL THEN RAISE EXCEPTION 'Key name and scopes are required'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_scopes) s WHERE s NOT IN ('properties:read','properties:write','units:read','work_orders:read','work_orders:write','submeter:read','submeter:write','finance:read','accounting:sync')) THEN
    RAISE EXCEPTION 'Unsupported API scope';
  END IF;
  v_raw := 'bm_live_' || encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.organization_api_keys(organization_id,name,key_prefix,key_hash,scopes,status,created_by)
  VALUES(p_organization_id,btrim(p_name),left(v_raw,18),encode(digest(v_raw,'sha256'),'hex'),p_scopes,'active',auth.uid())
  RETURNING * INTO v_row;
  RETURN jsonb_build_object('id',v_row.id,'name',v_row.name,'key_prefix',v_row.key_prefix,'scopes',v_row.scopes,'status',v_row.status,'created_at',v_row.created_at,'secret',v_raw);
END;
$$;
REVOKE ALL ON FUNCTION public.create_organization_api_key(UUID,TEXT,TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_api_key(UUID,TEXT,TEXT[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_organization_api_key(p_key_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org UUID;
BEGIN
  SELECT organization_id INTO v_org FROM public.organization_api_keys WHERE id = p_key_id;
  IF v_org IS NULL OR NOT private.org_member_has_permission(v_org, 'developer_api:manage') THEN
    RAISE EXCEPTION 'Developer API management capability is required';
  END IF;
  UPDATE public.organization_api_keys SET status='revoked' WHERE id=p_key_id AND status='active';
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_organization_api_key(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_organization_api_key(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_organization_webhook(
  p_organization_id UUID, p_url TEXT, p_description TEXT, p_event_types TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_secret TEXT; v_row public.organization_webhook_subscriptions;
BEGIN
  IF NOT private.org_member_has_permission(p_organization_id, 'webhooks:manage') THEN RAISE EXCEPTION 'Webhook management capability is required'; END IF;
  IF p_url IS NULL OR p_url !~ '^https://' THEN RAISE EXCEPTION 'Webhook URL must use HTTPS'; END IF;
  v_secret := 'whsec_' || encode(gen_random_bytes(32), 'hex');
  INSERT INTO public.organization_webhook_subscriptions(organization_id,url,description,event_types,secret,status)
  VALUES(p_organization_id,p_url,btrim(COALESCE(p_description,'')),COALESCE(p_event_types,'{}'),v_secret,'active')
  RETURNING * INTO v_row;
  RETURN jsonb_build_object('id',v_row.id,'organization_id',v_row.organization_id,'url',v_row.url,'description',v_row.description,'event_types',v_row.event_types,'status',v_row.status,'created_at',v_row.created_at,'secret',v_secret);
END;
$$;
REVOKE ALL ON FUNCTION public.create_organization_webhook(UUID,TEXT,TEXT,TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_organization_webhook(UUID,TEXT,TEXT,TEXT[]) TO authenticated;

-- Delivery receipts and audit logs are system-owned append-only records.
REVOKE INSERT, UPDATE, DELETE ON public.message_delivery, public.document_activity_logs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.message_delivery, public.document_activity_logs TO authenticated;
DROP POLICY IF EXISTS "system can insert delivery records" ON public.message_delivery;
CREATE POLICY "Recipients may mark own receipts read" ON public.message_delivery FOR UPDATE TO authenticated
USING (recipient_id = auth.uid()) WITH CHECK (recipient_id = auth.uid() AND status = 'read');
DROP POLICY IF EXISTS "Organization members can log document activity" ON public.document_activity_logs;
CREATE POLICY "Authorized users view document activity" ON public.document_activity_logs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.organization_documents d JOIN public.organization_members m ON m.organization_id=d.organization_id WHERE d.id=document_activity_logs.document_id AND m.user_id=auth.uid()));

CREATE OR REPLACE FUNCTION public.record_document_activity(p_document_id UUID, p_action TEXT, p_details JSONB DEFAULT '{}'::JSONB)
RETURNS public.document_activity_logs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.document_activity_logs;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organization_documents d JOIN public.organization_members m ON m.organization_id=d.organization_id WHERE d.id=p_document_id AND m.user_id=auth.uid()) THEN RAISE EXCEPTION 'Document access denied'; END IF;
  INSERT INTO public.document_activity_logs(document_id,actor_user_id,action,details,created_at) VALUES(p_document_id,auth.uid(),p_action,p_details,NOW()) RETURNING * INTO v_row;
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.record_document_activity(UUID,TEXT,JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_document_activity(UUID,TEXT,JSONB) TO authenticated;

-- Cross-resource binding guards.
CREATE OR REPLACE FUNCTION public.guard_operational_resource_bindings()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'staff_time_entries' AND NEW.issue_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.estate_issues i WHERE i.id=NEW.issue_id AND i.organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'Issue does not belong to organization'; END IF;
  IF TG_TABLE_NAME = 'maintenance_calendar_events' AND NEW.estate_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.managed_estates e WHERE e.id=NEW.estate_id AND e.organization_id=NEW.organization_id) THEN RAISE EXCEPTION 'Estate does not belong to organization'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_staff_time_resource_binding ON public.staff_time_entries;
CREATE TRIGGER trg_staff_time_resource_binding BEFORE INSERT OR UPDATE ON public.staff_time_entries FOR EACH ROW EXECUTE FUNCTION public.guard_operational_resource_bindings();
DROP TRIGGER IF EXISTS trg_calendar_resource_binding ON public.maintenance_calendar_events;
CREATE TRIGGER trg_calendar_resource_binding BEFORE INSERT OR UPDATE ON public.maintenance_calendar_events FOR EACH ROW EXECUTE FUNCTION public.guard_operational_resource_bindings();

-- Field activity actors are derived from the authenticated session.
CREATE OR REPLACE FUNCTION public.guard_field_activity_actor()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.role() = 'authenticated' AND NEW.user_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Field activity actor must be the authenticated user'; END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_guard_field_activity_actor ON public.field_activity_logs;
CREATE TRIGGER trg_guard_field_activity_actor BEFORE INSERT OR UPDATE ON public.field_activity_logs FOR EACH ROW EXECUTE FUNCTION public.guard_field_activity_actor();

-- Owner tax statements are generated from trusted statement runs, not caller-supplied amounts.
REVOKE INSERT, UPDATE, DELETE ON public.owner_tax_statements FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.owner_tax_statements TO authenticated;
CREATE OR REPLACE FUNCTION public.generate_owner_tax_statement(p_organization_id UUID, p_owner_user_id UUID, p_period_start DATE, p_period_end DATE)
RETURNS public.owner_tax_statements LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.owner_tax_statements;
BEGIN
  IF NOT private.org_member_has_permission(p_organization_id,'finance:read') THEN RAISE EXCEPTION 'Finance capability is required'; END IF;
  INSERT INTO public.owner_tax_statements(organization_id,owner_user_id,period_start,period_end,gross_rent_minor,withholding_tax_minor,net_paid_minor,currency)
  SELECT p_organization_id,p_owner_user_id,p_period_start,p_period_end,COALESCE(SUM(s.gross_collections_minor),0),0,COALESCE(SUM(s.net_distributable_minor),0),MIN(s.currency)
  FROM public.estate_owner_statement_runs s JOIN public.managed_estates e ON e.id=s.estate_id
  WHERE e.organization_id=p_organization_id AND s.owner_user_id=p_owner_user_id AND s.period_start>=p_period_start AND s.period_end<=p_period_end AND s.status IN ('approved','queued','delivered')
  ON CONFLICT (organization_id,owner_user_id,period_start,period_end) DO UPDATE SET gross_rent_minor=EXCLUDED.gross_rent_minor,net_paid_minor=EXCLUDED.net_paid_minor,currency=EXCLUDED.currency
  RETURNING * INTO v_row;
  RETURN v_row;
END; $$;
REVOKE ALL ON FUNCTION public.generate_owner_tax_statement(UUID,UUID,DATE,DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_owner_tax_statement(UUID,UUID,DATE,DATE) TO authenticated;
