-- Security: signing tokens must not be retrievable by arbitrary authenticated users.
-- WhatsApp / server flows use service_role (see supabase/functions/_shared/whatsapp-lease-sign.ts).

REVOKE ALL ON FUNCTION public.get_pending_lease_sign_for_phone(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_pending_lease_sign_for_phone(UUID, TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.get_pending_lease_sign_for_phone(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_pending_lease_sign_for_phone(UUID, TEXT) TO service_role;
