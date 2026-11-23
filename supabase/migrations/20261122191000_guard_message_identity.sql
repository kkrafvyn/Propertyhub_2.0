-- Do not allow a signed-in client to move a message into another DM,
-- change its sender identity, or forge server/AI-origin message badges.
-- Postgres service-role writes for trusted integrations remain possible.
CREATE OR REPLACE FUNCTION private.guard_authenticated_message_identity()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF auth.role() <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.sender_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Message sender must match the authenticated user' USING ERRCODE = '42501';
    END IF;
    IF NEW.sender_type IN ('system', 'ai_bot') OR NEW.message_type = 'system_event' THEN
      RAISE EXCEPTION 'System messages must be created by a trusted backend' USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF (NEW.id, NEW.conversation_id, NEW.sender_id, NEW.sender_type, NEW.message_type, NEW.created_at)
       IS DISTINCT FROM
       (OLD.id, OLD.conversation_id, OLD.sender_id, OLD.sender_type, OLD.message_type, OLD.created_at) THEN
      RAISE EXCEPTION 'Message identity and destination cannot be changed' USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_authenticated_message_identity ON public.messages;
CREATE TRIGGER trg_guard_authenticated_message_identity
BEFORE INSERT OR UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION private.guard_authenticated_message_identity();

REVOKE ALL ON FUNCTION private.guard_authenticated_message_identity() FROM PUBLIC;
