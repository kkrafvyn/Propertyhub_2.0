-- Client-origin DMs: enforce recipient block rules, immutable clock, and
-- serialized per-user burst limits even when a caller bypasses the UI.
-- The send control is a trigger, not an anonymous/public RPC.
CREATE INDEX IF NOT EXISTS idx_messages_sender_clock
ON public.messages(sender_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.guard_authenticated_message_abuse()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_is_direct BOOLEAN;
BEGIN
  IF auth.role() IS DISTINCT FROM 'authenticated' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NULL OR NEW.sender_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Authenticated sender is required' USING ERRCODE='42501';
  END IF;
  IF NEW.content IS NULL OR btrim(NEW.content) = '' OR char_length(NEW.content) > 4000 THEN
    RAISE EXCEPTION 'Message must contain 1 to 4000 characters' USING ERRCODE='22023';
  END IF;

  -- An authenticated client must not choose a backdated timestamp to evade
  -- recent-message counting. Only trusted backend/service-role senders bypass.
  NEW.created_at := clock_timestamp();
  NEW.updated_at := NEW.created_at;

  SELECT c.conversation_type = 'direct' INTO v_is_direct
  FROM public.conversations c WHERE c.id=NEW.conversation_id;
  IF v_is_direct IS TRUE AND EXISTS (
    SELECT 1
    FROM public.blocked_users b
    WHERE (
      b.blocker_id = auth.uid()
      AND (
        EXISTS(SELECT 1 FROM public.conversation_participants cp
               WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id=b.blocked_id)
        OR EXISTS(SELECT 1 FROM public.conversations c
                  WHERE c.id=NEW.conversation_id AND b.blocked_id IN(c.participant_1_id,c.participant_2_id))
      )
    ) OR (
      b.blocked_id = auth.uid()
      AND (
        EXISTS(SELECT 1 FROM public.conversation_participants cp
               WHERE cp.conversation_id = NEW.conversation_id AND cp.user_id=b.blocker_id)
        OR EXISTS(SELECT 1 FROM public.conversations c
                  WHERE c.id=NEW.conversation_id AND b.blocker_id IN(c.participant_1_id,c.participant_2_id))
      )
    )
  ) THEN
    RAISE EXCEPTION 'This conversation cannot receive messages' USING ERRCODE='42501';
  END IF;

  -- Serialize simultaneous sends by the same user. A client cannot evade
  -- the 20-messages/minute ceiling by issuing concurrent requests.
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('baytmiftah-message-rate:' || auth.uid()::TEXT, 0)
  );
  IF (SELECT count(*) FROM public.messages m
      WHERE m.sender_id = auth.uid()
        AND m.created_at > clock_timestamp() - INTERVAL '60 seconds') >= 20 THEN
    RAISE EXCEPTION 'Too many messages. Try again in a minute.' USING ERRCODE='P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_authenticated_message_abuse ON public.messages;
CREATE TRIGGER trg_guard_authenticated_message_abuse
BEFORE INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION private.guard_authenticated_message_abuse();

REVOKE ALL ON FUNCTION private.guard_authenticated_message_abuse() FROM PUBLIC;
COMMENT ON FUNCTION private.guard_authenticated_message_abuse() IS
  'Server enforced authenticated message size, blocked-recipient, burst rate and timestamp validation.';
