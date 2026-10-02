-- Security: audit_unknown_organization_roles must not leak cross-tenant membership to any signed-in user.
-- Ops: run via service role (db:query / workers) or platform admin session only.

CREATE OR REPLACE FUNCTION public.audit_unknown_organization_roles()
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  user_id UUID,
  member_role TEXT,
  mapped_department TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    om.organization_id,
    o.name,
    om.user_id,
    om.role,
    private.role_department(om.role)
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE private.role_department(om.role) IS NULL
    AND public.is_platform_admin()
  ORDER BY o.name, om.role;
$$;

REVOKE ALL ON FUNCTION public.audit_unknown_organization_roles() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.audit_unknown_organization_roles() FROM authenticated;
REVOKE ALL ON FUNCTION public.audit_unknown_organization_roles() FROM anon;
GRANT EXECUTE ON FUNCTION public.audit_unknown_organization_roles() TO service_role;
