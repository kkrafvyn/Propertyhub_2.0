-- WhatsApp group bot: linked groups, inbound log, conversation sessions

CREATE TABLE IF NOT EXISTS public.whatsapp_group_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estate_id UUID REFERENCES public.managed_estates(id) ON DELETE SET NULL,
  group_id TEXT NOT NULL,
  group_name TEXT,
  bot_aliases TEXT[] NOT NULL DEFAULT ARRAY['baytmiftah', 'bm', '/bm', '@baytmiftah'],
  respond_without_mention BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  linked_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  UNIQUE (organization_id, group_id)
);

CREATE INDEX IF NOT EXISTS whatsapp_group_channels_org_idx
  ON public.whatsapp_group_channels (organization_id, is_active);

CREATE TABLE IF NOT EXISTS public.whatsapp_inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  group_channel_id UUID REFERENCES public.whatsapp_group_channels(id) ON DELETE SET NULL,
  wa_message_id TEXT,
  sender_phone TEXT NOT NULL,
  sender_name TEXT,
  group_id TEXT,
  is_group BOOLEAN NOT NULL DEFAULT FALSE,
  message_text TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  bot_replied BOOLEAN NOT NULL DEFAULT FALSE,
  bot_reply_text TEXT,
  raw_payload JSONB,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_inbound_wa_message_idx
  ON public.whatsapp_inbound_messages (wa_message_id)
  WHERE wa_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_inbound_org_received_idx
  ON public.whatsapp_inbound_messages (organization_id, received_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_bot_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sender_phone TEXT NOT NULL,
  group_id TEXT,
  session_state TEXT NOT NULL DEFAULT 'idle',
  context JSONB NOT NULL DEFAULT '{}'::JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_bot_sessions_key_idx
  ON public.whatsapp_bot_sessions (organization_id, sender_phone, COALESCE(group_id, ''));

ALTER TABLE public.whatsapp_group_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_inbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_bot_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage whatsapp groups" ON public.whatsapp_group_channels
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = whatsapp_group_channels.organization_id AND m.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = whatsapp_group_channels.organization_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members read whatsapp inbound" ON public.whatsapp_inbound_messages
  FOR SELECT USING (
    organization_id IS NULL OR EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = whatsapp_inbound_messages.organization_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Org members manage bot sessions" ON public.whatsapp_bot_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = whatsapp_bot_sessions.organization_id AND m.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = whatsapp_bot_sessions.organization_id AND m.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_group_channels TO authenticated;
GRANT SELECT ON public.whatsapp_inbound_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_bot_sessions TO authenticated;

COMMENT ON TABLE public.whatsapp_group_channels IS 'WhatsApp groups where the BaytMiftah bot number is added';
COMMENT ON TABLE public.whatsapp_inbound_messages IS 'Inbound WhatsApp DMs and group messages received via Cloud API webhook';
