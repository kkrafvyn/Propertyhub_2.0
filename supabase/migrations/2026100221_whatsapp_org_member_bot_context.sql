-- Org admins may preview tenant bot context in Workspace (simulator) without service_role.
-- Inbound group/DM automation still uses get_whatsapp_bot_context via service_role in whatsapp-webhook.

CREATE OR REPLACE FUNCTION public.get_whatsapp_bot_context_for_org_member(
  p_organization_id UUID,
  p_phone TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  RETURN public.get_whatsapp_bot_context(p_organization_id, p_phone);
END;
$$;

REVOKE ALL ON FUNCTION public.get_whatsapp_bot_context_for_org_member(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_whatsapp_bot_context_for_org_member(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_bot_context_for_org_member(UUID, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
