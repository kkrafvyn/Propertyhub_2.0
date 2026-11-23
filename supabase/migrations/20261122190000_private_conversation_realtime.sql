-- Protect BaytMiftah contextual DM Broadcast / Presence events.
-- A private channel is necessary but NOT sufficient without these topic RLS policies.
-- Keep the public.messages RLS policies in force for Postgres Changes.
--
-- Deployment order: apply migration BEFORE deploying the private-channel client.
-- After auditing unrelated realtime consumers, disable "Allow public access"
-- in Supabase Realtime Settings to prevent any legacy public-topic traffic.

CREATE OR REPLACE FUNCTION private.can_access_conversation_realtime_topic(p_topic TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  IF auth.uid() IS NULL
     OR p_topic IS NULL
     OR left(p_topic, length('conversation:')) <> 'conversation:'
     OR NOT private.account_access_allowed() THEN
    RETURN FALSE;
  END IF;

  -- Reject untrusted/malformed topics without throwing during authorization.
  BEGIN
    v_conversation_id := substring(p_topic FROM length('conversation:') + 1)::UUID;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN FALSE;
  END;

  RETURN EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = v_conversation_id
      AND private.workspace_conversation_access(c.id)
      AND (
        c.participant_1_id = auth.uid()
        OR c.participant_2_id = auth.uid()
        OR public.user_participates_in_conversation(c.id)
      )
  );
END;
$$;

REVOKE ALL ON FUNCTION private.can_access_conversation_realtime_topic(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_access_conversation_realtime_topic(TEXT) TO authenticated;

DROP POLICY IF EXISTS baytmiftah_private_conversation_read ON realtime.messages;
CREATE POLICY baytmiftah_private_conversation_read ON realtime.messages
FOR SELECT TO authenticated
USING (
  extension IN ('broadcast', 'presence')
  AND private.can_access_conversation_realtime_topic((SELECT realtime.topic()))
);

DROP POLICY IF EXISTS baytmiftah_private_conversation_send ON realtime.messages;
CREATE POLICY baytmiftah_private_conversation_send ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  extension IN ('broadcast', 'presence')
  AND private.can_access_conversation_realtime_topic((SELECT realtime.topic()))
);

-- Note: any pre-existing BROAD SELECT/INSERT policies on realtime.messages
-- also grant access because permissive RLS policies are OR-combined.
-- Audit remote policies before launch; do not drop unrelated application policies.
