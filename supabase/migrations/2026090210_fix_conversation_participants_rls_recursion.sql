-- Fix infinite recursion in conversation_participants RLS policies.
-- The prior policy queried conversation_participants from within its own USING clause.

CREATE OR REPLACE FUNCTION public.user_participates_in_conversation(p_conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants cp
    WHERE cp.conversation_id = p_conversation_id
      AND cp.user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.user_participates_in_conversation(UUID) TO authenticated;

DROP POLICY IF EXISTS "participants can view their conversations" ON public.conversations;
CREATE POLICY "participants can view their conversations"
ON public.conversations FOR SELECT
USING (
  auth.uid() = participant_1_id
  OR auth.uid() = participant_2_id
  OR public.user_participates_in_conversation(id)
);

DROP POLICY IF EXISTS "participants can update conversation metadata" ON public.conversations;
CREATE POLICY "participants can update conversation metadata"
ON public.conversations FOR UPDATE
USING (
  auth.uid() = participant_1_id
  OR auth.uid() = participant_2_id
  OR public.user_participates_in_conversation(id)
);

DROP POLICY IF EXISTS "users can view their own participation" ON public.conversation_participants;
CREATE POLICY "users can view conversation participants"
ON public.conversation_participants FOR SELECT
USING (public.user_participates_in_conversation(conversation_id));

DROP POLICY IF EXISTS "participants can read messages in their conversations" ON public.messages;
CREATE POLICY "participants can read messages in their conversations"
ON public.messages FOR SELECT
USING (public.user_participates_in_conversation(conversation_id));

DROP POLICY IF EXISTS "participants can insert messages" ON public.messages;
CREATE POLICY "participants can insert messages"
ON public.messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND public.user_participates_in_conversation(conversation_id)
);

DROP POLICY IF EXISTS "participants can view attachments" ON public.message_attachments;
CREATE POLICY "participants can view attachments"
ON public.message_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_attachments.message_id
      AND public.user_participates_in_conversation(m.conversation_id)
  )
);

DROP POLICY IF EXISTS "participants can insert attachments" ON public.message_attachments;
CREATE POLICY "participants can insert attachments"
ON public.message_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_attachments.message_id
      AND public.user_participates_in_conversation(m.conversation_id)
  )
);

DROP POLICY IF EXISTS "participants can view reactions" ON public.message_reactions;
CREATE POLICY "participants can view reactions"
ON public.message_reactions FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.messages m
    WHERE m.id = message_reactions.message_id
      AND public.user_participates_in_conversation(m.conversation_id)
  )
);

COMMENT ON FUNCTION public.user_participates_in_conversation(UUID)
IS 'Security definer membership check to avoid recursive conversation_participants RLS.';
