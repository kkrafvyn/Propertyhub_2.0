-- Supabase default privileges grant anon EXECUTE explicitly, independently of PUBLIC.
REVOKE ALL ON FUNCTION public.admin_assign_platform_role(UUID, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.admin_save_platform_role(UUID,TEXT,TEXT,TEXT[],INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.admin_delete_platform_role(UUID,INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.admin_save_marketing_draft(JSONB,INTEGER) FROM anon;
REVOKE ALL ON FUNCTION public.admin_publish_marketing_page(INTEGER) FROM anon;
REVOKE ALL ON FUNCTION private.protect_platform_role_link() FROM anon, authenticated;
REVOKE ALL ON FUNCTION private.validate_platform_role_grants(TEXT[]) FROM anon, authenticated;
REVOKE ALL ON FUNCTION private.validate_marketing_document(JSONB) FROM anon, authenticated;
