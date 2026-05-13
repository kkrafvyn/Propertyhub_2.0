-- Notification center hardening and inbox metadata
-- Note: Supabase CLI was not available in this environment, so this migration
-- file was added manually to continue the repo's numbered migration sequence.

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_created_at
ON public.notification_logs(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_notification_logs_conversation
ON public.notification_logs(conversation_id);

GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.notification_logs TO authenticated;

DROP POLICY IF EXISTS "Users can view their own notification preferences"
ON public.notification_preferences;

DROP POLICY IF EXISTS "Users can create their own notification preferences"
ON public.notification_preferences;

DROP POLICY IF EXISTS "Users can update their own notification preferences"
ON public.notification_preferences;

DROP POLICY IF EXISTS "Users can view their own notifications"
ON public.notification_logs;

DROP POLICY IF EXISTS "Users can create their own notifications"
ON public.notification_logs;

DROP POLICY IF EXISTS "Conversation participants can notify each other"
ON public.notification_logs;

DROP POLICY IF EXISTS "Users can update their own notifications"
ON public.notification_logs;

CREATE POLICY "Users can view their own notification preferences"
ON public.notification_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notification preferences"
ON public.notification_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
ON public.notification_preferences FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own notifications"
ON public.notification_logs FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notifications"
ON public.notification_logs FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND (actor_user_id IS NULL OR actor_user_id = auth.uid())
);

CREATE POLICY "Conversation participants can notify each other"
ON public.notification_logs FOR INSERT
WITH CHECK (
  channel = 'in_app'
  AND actor_user_id = auth.uid()
  AND conversation_id IS NOT NULL
  AND auth.uid() <> user_id
  AND EXISTS (
    SELECT 1
    FROM public.conversations conversation
    WHERE conversation.id = notification_logs.conversation_id
      AND (
        conversation.participant_1_id = auth.uid()
        OR conversation.participant_2_id = auth.uid()
      )
      AND (
        conversation.participant_1_id = notification_logs.user_id
        OR conversation.participant_2_id = notification_logs.user_id
      )
  )
);

CREATE POLICY "Users can update their own notifications"
ON public.notification_logs FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
