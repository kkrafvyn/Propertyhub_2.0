-- ============================================================
-- BaytMiftah REOS — Realtime Contextual Messaging System
-- Migration: 2026081908
-- Architecture: Postgres (source of truth) +
--               Supabase Realtime Broadcast (transport) +
--               FCM push (offline delivery)
-- ============================================================

-- ── 1. conversations ─────────────────────────────────────────────────────────
-- Replaces the old two-participant-only model with a flexible
-- group / support / organization-shared model and contextual FKs.

CREATE TABLE IF NOT EXISTS conversations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_type    TEXT NOT NULL CHECK (conversation_type IN (
                         'direct', 'group', 'support', 'organization_shared'
                       )),
  title                TEXT,                 -- display name for groups / support threads

  -- ── Contextual entity links (nullable, any combination) ──────────────────
  customer_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id      UUID REFERENCES organizations(id) ON DELETE CASCADE,
  property_id          UUID,                 -- references properties(id)
  unit_id              UUID,                 -- references units(id)
  listing_id           UUID,                 -- references listings(id)
  lead_id              UUID,                 -- references deal_cases(id)
  deal_id              UUID,                 -- references deal_cases(id)
  lease_id             UUID,                 -- references leases(id)
  booking_id           UUID,                 -- references bookings(id)
  maintenance_issue_id UUID,                 -- references maintenance_issues(id)
  work_order_id        UUID,                 -- references work_orders(id)

  -- ── Snapshot / cache ─────────────────────────────────────────────────────
  last_message_preview TEXT,
  last_message_at      TIMESTAMPTZ,
  metadata             JSONB DEFAULT '{}'::JSONB,

  created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Earlier marketplace chat used a two-participant conversations table. Preserve
-- those conversations and extend it in place rather than attempting to recreate
-- the table, which would leave the contextual indexes below without their columns.
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS conversation_type TEXT NOT NULL DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'group', 'support', 'organization_shared')),
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS property_id UUID,
  ADD COLUMN IF NOT EXISTS unit_id UUID,
  ADD COLUMN IF NOT EXISTS listing_id UUID,
  ADD COLUMN IF NOT EXISTS lead_id UUID,
  ADD COLUMN IF NOT EXISTS deal_id UUID,
  ADD COLUMN IF NOT EXISTS lease_id UUID,
  ADD COLUMN IF NOT EXISTS booking_id UUID,
  ADD COLUMN IF NOT EXISTS maintenance_issue_id UUID,
  ADD COLUMN IF NOT EXISTS work_order_id UUID,
  ADD COLUMN IF NOT EXISTS last_message_preview TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX idx_conversations_organization_id ON conversations(organization_id);
CREATE INDEX idx_conversations_customer_id     ON conversations(customer_id);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at DESC NULLS LAST);
CREATE INDEX idx_conversations_unit_id         ON conversations(unit_id) WHERE unit_id IS NOT NULL;
CREATE INDEX idx_conversations_work_order_id   ON conversations(work_order_id) WHERE work_order_id IS NOT NULL;

-- ── 2. conversation_participants ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id       UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  participant_role      TEXT NOT NULL DEFAULT 'member' CHECK (participant_role IN (
                          'buyer', 'tenant', 'resident', 'landlord', 'agent',
                          'contractor', 'support', 'admin', 'member'
                        )),
  joined_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_read_at          TIMESTAMPTZ,
  is_muted              BOOLEAN NOT NULL DEFAULT FALSE,
  notification_preference TEXT NOT NULL DEFAULT 'all' CHECK (notification_preference IN (
                            'all', 'mentions', 'none'
                          )),

  PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_user_id ON conversation_participants(user_id);

-- ── 3. messages ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS messages (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id     UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_type         TEXT NOT NULL DEFAULT 'user' CHECK (sender_type IN (
                        'user', 'agent', 'contractor', 'system', 'ai_bot'
                      )),

  content             TEXT NOT NULL DEFAULT '',
  message_type        TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN (
                        'text', 'image', 'document', 'location',
                        'property_card', 'lease_card', 'maintenance_card',
                        'work_order_card', 'action_request', 'system_event'
                      )),
  metadata            JSONB DEFAULT '{}'::JSONB,   -- structured payload for cards/actions
  reply_to_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,

  is_pinned           BOOLEAN NOT NULL DEFAULT FALSE,
  is_edited           BOOLEAN NOT NULL DEFAULT FALSE,
  is_deleted          BOOLEAN NOT NULL DEFAULT FALSE,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_type TEXT NOT NULL DEFAULT 'user' CHECK (sender_type IN ('user', 'agent', 'contractor', 'system', 'ai_bot')),
  ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'document', 'location', 'property_card', 'lease_card', 'maintenance_card', 'work_order_card', 'action_request', 'system_event')),
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_edited BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_sender_id       ON messages(sender_id);
-- Full-text search across message content
CREATE INDEX idx_messages_fts ON messages USING gin(to_tsvector('english', content));

-- Trigger: keep conversations.last_message_preview and last_message_at fresh
CREATE OR REPLACE FUNCTION fn_update_conversation_last_message()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE conversations
  SET
    last_message_preview = LEFT(NEW.content, 200),
    last_message_at      = NEW.created_at,
    updated_at           = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_conversation_last_message
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION fn_update_conversation_last_message();

-- ── 4. message_attachments ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_attachments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id      UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url        TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  file_type       TEXT NOT NULL,         -- MIME type
  file_size_bytes BIGINT,
  thumbnail_url   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_msg_attachments_message_id ON message_attachments(message_id);

-- ── 5. message_reactions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS message_reactions (
  message_id  UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX idx_msg_reactions_message_id ON message_reactions(message_id);

-- ── 6. message_delivery ──────────────────────────────────────────────────────
-- Per-recipient delivery receipts (for direct & group)
CREATE TABLE IF NOT EXISTS message_delivery (
  message_id    UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  delivered_at  TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,

  PRIMARY KEY (message_id, recipient_id)
);

CREATE INDEX idx_msg_delivery_recipient ON message_delivery(recipient_id, status);

-- ── 7. blocked_users ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (blocker_id, blocked_id)
);

-- ── 8. fcm_device_tokens ─────────────────────────────────────────────────────
-- Stores per-device FCM tokens for push notifications
CREATE TABLE IF NOT EXISTS fcm_device_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT NOT NULL UNIQUE,
  platform    TEXT NOT NULL DEFAULT 'web' CHECK (platform IN ('web', 'android', 'ios')),
  device_info JSONB DEFAULT '{}'::JSONB,   -- browser/device metadata
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fcm_tokens_user_id ON fcm_device_tokens(user_id) WHERE is_active = TRUE;

-- ── 9. Row Level Security (RLS) ──────────────────────────────────────────────

-- conversations: visible only if user is a participant
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants can view their conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "authenticated users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "participants can update conversation metadata"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = id
        AND cp.user_id = auth.uid()
    )
  );

-- conversation_participants: own participation only
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users can view their own participation"
  ON conversation_participants FOR SELECT
  USING (user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_id
        AND cp2.user_id = auth.uid()
    )
  );

CREATE POLICY "users can insert themselves as participant"
  ON conversation_participants FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "users can update their own participation settings"
  ON conversation_participants FOR UPDATE
  USING (user_id = auth.uid());

-- messages: visible only to conversation participants
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants can read messages in their conversations"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "participants can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = messages.conversation_id
        AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "senders can soft-delete their messages"
  ON messages FOR UPDATE
  USING (sender_id = auth.uid());

-- message_attachments: same as messages
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants can view attachments"
  ON message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "participants can insert attachments"
  ON message_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_id AND cp.user_id = auth.uid()
    )
  );

-- message_reactions: participants can react
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "participants can view reactions"
  ON message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE m.id = message_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "participants can add reactions"
  ON message_reactions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users can remove their own reactions"
  ON message_reactions FOR DELETE
  USING (user_id = auth.uid());

-- message_delivery: own receipts
ALTER TABLE message_delivery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recipients can view their delivery status"
  ON message_delivery FOR SELECT
  USING (recipient_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = message_id AND m.sender_id = auth.uid()
    )
  );

CREATE POLICY "system can insert delivery records"
  ON message_delivery FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "recipients can update their own delivery status"
  ON message_delivery FOR UPDATE
  USING (recipient_id = auth.uid());

-- blocked_users: own records
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage their own blocks"
  ON blocked_users FOR ALL
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- fcm_device_tokens: own tokens
ALTER TABLE fcm_device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage their own FCM tokens"
  ON fcm_device_tokens FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 10. Supabase Realtime — enable broadcast on conversations channel ─────────
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE message_delivery;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;
