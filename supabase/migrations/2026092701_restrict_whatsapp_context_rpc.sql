-- Tenant WhatsApp context is resolved by the signed webhook using service_role.
-- Authenticated callers must not choose an organization and phone to read tenant data.
REVOKE ALL ON FUNCTION public.get_whatsapp_bot_context(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_whatsapp_bot_context(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';