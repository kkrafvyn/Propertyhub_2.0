-- Atomic workspace chat creation and stable newest-first history.

-- The original marketplace model required exactly two legacy participants.
-- Channels use conversation_participants instead.
ALTER TABLE public.conversations ALTER COLUMN participant_1_id DROP NOT NULL;
ALTER TABLE public.conversations ALTER COLUMN participant_2_id DROP NOT NULL;
ALTER TABLE public.conversations ADD COLUMN workspace_direct_key TEXT;
CREATE UNIQUE INDEX conversations_workspace_direct_pair
  ON public.conversations(organization_id, workspace_direct_key)
  WHERE workspace_direct_key IS NOT NULL;
ALTER TABLE public.conversations ADD CONSTRAINT workspace_direct_identity CHECK (
  workspace_direct_key IS NULL OR (organization_id IS NOT NULL AND conversation_type = 'direct')
);
CREATE INDEX messages_history_cursor ON public.messages(conversation_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION private.require_workspace_chat_member(p_organization_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.account_access_allowed() THEN
    RAISE EXCEPTION 'Account access has been revoked' USING ERRCODE = '42501';
  END IF;
  PERFORM 1 FROM public.organizations WHERE id = p_organization_id AND NOT coalesce(suspended, false) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Workspace unavailable' USING ERRCODE = '42501'; END IF;
  PERFORM 1 FROM public.organization_members WHERE organization_id = p_organization_id AND user_id = auth.uid() FOR SHARE;
  IF NOT FOUND AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Workspace membership required' USING ERRCODE = '42501';
  END IF;
END;
$$;

-- Internal helper. Both entry points validate the caller and serialize channel
-- initialization in the same organization before calling it.
CREATE OR REPLACE FUNCTION private.insert_workspace_channel(
  p_organization_id UUID, p_slug TEXT, p_name TEXT, p_description TEXT, p_is_private BOOLEAN
) RETURNS public.workspace_channels LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_conversation UUID; v_channel public.workspace_channels;
BEGIN
  INSERT INTO public.conversations(conversation_type, organization_id, created_by)
  VALUES ('channel', p_organization_id, auth.uid()) RETURNING id INTO v_conversation;
  INSERT INTO public.workspace_channels(organization_id, conversation_id, slug, name, description, is_private, created_by)
  VALUES(p_organization_id, v_conversation, p_slug, p_name, p_description, p_is_private, auth.uid()) RETURNING * INTO v_channel;
  IF NOT p_is_private THEN
    INSERT INTO public.conversation_participants(conversation_id, user_id, participant_role)
    SELECT v_conversation, m.user_id, 'member' FROM public.organization_members m
    JOIN public.users u ON u.id = m.user_id
    WHERE m.organization_id = p_organization_id AND NOT coalesce(u.banned, false) AND u.account_deletion_requested_at IS NULL;
  END IF;
  INSERT INTO public.conversation_participants(conversation_id, user_id, participant_role)
  VALUES(v_conversation, auth.uid(), 'admin') ON CONFLICT(conversation_id,user_id) DO UPDATE SET participant_role = 'admin';
  RETURN v_channel;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_workspace_channel(
  p_organization_id UUID, p_slug TEXT, p_name TEXT, p_description TEXT DEFAULT NULL, p_is_private BOOLEAN DEFAULT FALSE
) RETURNS public.workspace_channels LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM private.require_workspace_chat_member(p_organization_id);
  IF NOT (public.is_platform_admin() OR private.org_member_has_permission(p_organization_id, 'team:manage')) THEN
    RAISE EXCEPTION 'Channel management permission required' USING ERRCODE = '42501';
  END IF;
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9][a-z0-9-]{0,79}$' OR p_name IS NULL OR length(trim(p_name)) NOT BETWEEN 1 AND 100
    OR length(coalesce(p_description, '')) > 2000 OR p_is_private IS NULL THEN
    RAISE EXCEPTION 'Enter a valid channel name and slug' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('workspace-channels:' || p_organization_id::text, 0));
  RETURN private.insert_workspace_channel(p_organization_id, p_slug, trim(p_name), p_description, p_is_private);
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_default_workspace_channels(p_organization_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_row TEXT[];
BEGIN
  PERFORM private.require_workspace_chat_member(p_organization_id);
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('workspace-channels:' || p_organization_id::text, 0));
  FOREACH v_row SLICE 1 IN ARRAY ARRAY[
    ARRAY['general', 'General', 'Company-wide updates and coordination'],
    ARRAY['maintenance', 'Maintenance', 'Work orders, inspections, and field updates'],
    ARRAY['listings', 'Listings', 'Inventory, marketing, and leasing discussion']
  ] LOOP
    IF NOT EXISTS(SELECT 1 FROM public.workspace_channels WHERE organization_id = p_organization_id AND slug = v_row[1]) THEN
      PERFORM private.insert_workspace_channel(p_organization_id, v_row[1], v_row[2], v_row[3], false);
    END IF;
  END LOOP;
  -- New members receive public-channel participation when opening team chat.
  INSERT INTO public.conversation_participants(conversation_id, user_id, participant_role)
  SELECT conversation_id, auth.uid(), 'member' FROM public.workspace_channels
  WHERE organization_id = p_organization_id AND NOT is_private ON CONFLICT DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.open_workspace_direct_message(p_organization_id UUID, p_other_user_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_key TEXT; v_conversation UUID;
BEGIN
  PERFORM private.require_workspace_chat_member(p_organization_id);
  IF p_other_user_id IS NULL OR p_other_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Select another teammate' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.organization_members m JOIN public.users u ON u.id = m.user_id
    WHERE m.organization_id = p_organization_id AND m.user_id = p_other_user_id
      AND NOT coalesce(u.banned, false) AND u.account_deletion_requested_at IS NULL FOR SHARE OF m, u;
  IF NOT FOUND THEN RAISE EXCEPTION 'An active teammate is required' USING ERRCODE = '42501'; END IF;
  v_key := least(auth.uid(), p_other_user_id)::text || ':' || greatest(auth.uid(), p_other_user_id)::text;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('workspace-dm:' || p_organization_id::text || ':' || v_key, 0));
  SELECT id INTO v_conversation FROM public.conversations WHERE organization_id = p_organization_id AND workspace_direct_key = v_key;
  IF v_conversation IS NOT NULL THEN RETURN v_conversation; END IF;
  -- Reuse the oldest existing exact pair in this workspace, without adopting
  -- personal chats or contextual conversations, or destroying duplicate history.
  SELECT c.id INTO v_conversation FROM public.conversations c
  WHERE c.organization_id = p_organization_id AND c.conversation_type = 'direct'
    AND c.workspace_direct_key IS NULL AND c.property_id IS NULL AND c.unit_id IS NULL
    AND c.listing_id IS NULL AND c.lead_id IS NULL AND c.deal_id IS NULL AND c.lease_id IS NULL
    AND c.booking_id IS NULL AND c.maintenance_issue_id IS NULL AND c.work_order_id IS NULL AND c.customer_id IS NULL
    AND (SELECT count(*) FROM public.conversation_participants cp WHERE cp.conversation_id = c.id) = 2
    AND EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = auth.uid())
    AND EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = p_other_user_id)
  ORDER BY c.created_at, c.id LIMIT 1;
  IF v_conversation IS NOT NULL THEN
    UPDATE public.conversations SET workspace_direct_key = v_key WHERE id = v_conversation;
    RETURN v_conversation;
  END IF;
  INSERT INTO public.conversations(conversation_type, organization_id, created_by, workspace_direct_key)
  VALUES('direct', p_organization_id, auth.uid(), v_key) RETURNING id INTO v_conversation;
  INSERT INTO public.conversation_participants(conversation_id, user_id, participant_role)
  VALUES(v_conversation, auth.uid(), 'member'), (v_conversation, p_other_user_id, 'member');
  RETURN v_conversation;
END;
$$;

-- Preserve generic contextual messaging while preventing direct REST writes
-- from bypassing workspace creation transactions or joining someone else's DM.
CREATE OR REPLACE FUNCTION private.is_managed_workspace_conversation(p_conversation_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS(SELECT 1 FROM public.conversations WHERE id = p_conversation_id
    AND (conversation_type = 'channel' OR workspace_direct_key IS NOT NULL));
$$;
CREATE OR REPLACE FUNCTION private.workspace_conversation_access(p_conversation_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT private.account_access_allowed() AND EXISTS(
    SELECT 1 FROM public.conversations c WHERE c.id = p_conversation_id AND (
      (c.conversation_type <> 'channel' AND c.workspace_direct_key IS NULL) OR
      (EXISTS(SELECT 1 FROM public.organizations o WHERE o.id = c.organization_id AND NOT coalesce(o.suspended, false)) AND (
        public.is_platform_admin() OR (
          EXISTS(SELECT 1 FROM public.organization_members m WHERE m.organization_id = c.organization_id AND m.user_id = auth.uid())
          AND EXISTS(SELECT 1 FROM public.conversation_participants cp WHERE cp.conversation_id = c.id AND cp.user_id = auth.uid())
        )
      ))
    )
  );
$$;
CREATE POLICY workspace_creation_rpc ON public.conversations AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK(conversation_type <> 'channel' AND workspace_direct_key IS NULL);
CREATE POLICY workspace_channel_creation_rpc ON public.workspace_channels AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(false);
CREATE POLICY workspace_participation_rpc ON public.conversation_participants AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK(NOT private.is_managed_workspace_conversation(conversation_id));
CREATE POLICY workspace_conversation_boundary ON public.conversations AS RESTRICTIVE FOR SELECT TO authenticated
  USING(private.workspace_conversation_access(id));
CREATE POLICY workspace_message_boundary ON public.messages AS RESTRICTIVE FOR ALL TO authenticated
  USING(private.workspace_conversation_access(conversation_id)) WITH CHECK(private.workspace_conversation_access(conversation_id));
CREATE POLICY workspace_participant_boundary ON public.conversation_participants AS RESTRICTIVE FOR ALL TO authenticated
  USING(private.workspace_conversation_access(conversation_id)) WITH CHECK(private.workspace_conversation_access(conversation_id));

-- These invoker triggers run as the table writer. Authorized RPCs run as the
-- owning role; authenticated REST callers cannot move a workspace's identities.
CREATE OR REPLACE FUNCTION private.guard_workspace_conversation_identity()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user = 'authenticated' AND (OLD.conversation_type = 'channel' OR OLD.workspace_direct_key IS NOT NULL
    OR NEW.conversation_type = 'channel' OR NEW.workspace_direct_key IS NOT NULL) AND
    (NEW.id, NEW.organization_id, NEW.conversation_type, NEW.workspace_direct_key, NEW.participant_1_id, NEW.participant_2_id)
    IS DISTINCT FROM (OLD.id, OLD.organization_id, OLD.conversation_type, OLD.workspace_direct_key, OLD.participant_1_id, OLD.participant_2_id) THEN
    RAISE EXCEPTION 'Workspace conversation identity is immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_workspace_conversation_identity BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION private.guard_workspace_conversation_identity();
CREATE OR REPLACE FUNCTION private.guard_workspace_participant_identity()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user = 'authenticated' AND (NEW.conversation_id, NEW.user_id, NEW.participant_role)
    IS DISTINCT FROM (OLD.conversation_id, OLD.user_id, OLD.participant_role) THEN
    RAISE EXCEPTION 'Participant identity cannot be changed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_workspace_participant_identity BEFORE UPDATE ON public.conversation_participants
FOR EACH ROW EXECUTE FUNCTION private.guard_workspace_participant_identity();

-- A channel manager must not relink a public channel to somebody else's DM;
-- default-channel initialization would otherwise grant that manager participation.
CREATE OR REPLACE FUNCTION private.guard_workspace_channel_identity()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF current_user = 'authenticated' AND (NEW.id, NEW.organization_id, NEW.conversation_id, NEW.is_private)
    IS DISTINCT FROM (OLD.id, OLD.organization_id, OLD.conversation_id, OLD.is_private) THEN
    RAISE EXCEPTION 'Workspace channel identity and visibility are immutable' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER guard_workspace_channel_identity BEFORE UPDATE ON public.workspace_channels
FOR EACH ROW EXECUTE FUNCTION private.guard_workspace_channel_identity();
REVOKE ALL ON FUNCTION private.guard_workspace_channel_identity() FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.list_workspace_messages(
  p_conversation_id UUID, p_before_created_at TIMESTAMPTZ DEFAULT NULL, p_before_id UUID DEFAULT NULL, p_limit INTEGER DEFAULT 81
) RETURNS TABLE(id UUID, conversation_id UUID, sender_id UUID, content TEXT, created_at TIMESTAMPTZ, message_type TEXT)
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT private.workspace_conversation_access(p_conversation_id)
    OR NOT (public.user_participates_in_conversation(p_conversation_id) OR public.is_platform_admin()) THEN
    RAISE EXCEPTION 'Conversation access denied' USING ERRCODE = '42501';
  END IF;
  IF (p_before_created_at IS NULL) <> (p_before_id IS NULL) OR p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 101 THEN
    RAISE EXCEPTION 'Invalid message cursor or page size' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY SELECT m.id, m.conversation_id, m.sender_id, m.content, m.created_at, m.message_type
    FROM public.messages m WHERE m.conversation_id = p_conversation_id AND NOT m.is_deleted
      AND (p_before_created_at IS NULL OR (m.created_at, m.id) < (p_before_created_at, p_before_id))
    ORDER BY m.created_at DESC, m.id DESC LIMIT p_limit;
END;
$$;

REVOKE ALL ON FUNCTION private.require_workspace_chat_member(UUID), private.insert_workspace_channel(UUID,TEXT,TEXT,TEXT,BOOLEAN),
  public.create_workspace_channel(UUID,TEXT,TEXT,TEXT,BOOLEAN), public.ensure_default_workspace_channels(UUID),
  public.open_workspace_direct_message(UUID,UUID), public.list_workspace_messages(UUID,TIMESTAMPTZ,UUID,INTEGER),
  private.is_managed_workspace_conversation(UUID), private.workspace_conversation_access(UUID),
  private.guard_workspace_conversation_identity(), private.guard_workspace_participant_identity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_workspace_channel(UUID,TEXT,TEXT,TEXT,BOOLEAN), public.ensure_default_workspace_channels(UUID),
  public.open_workspace_direct_message(UUID,UUID), public.list_workspace_messages(UUID,TIMESTAMPTZ,UUID,INTEGER),
  private.is_managed_workspace_conversation(UUID), private.workspace_conversation_access(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
