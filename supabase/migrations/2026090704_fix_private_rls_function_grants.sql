-- Fix RLS helpers invoked during anonymous listing browse (42501 on member_can_access_property).

GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.member_can_access_property(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.member_can_access_estate(UUID, UUID) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.member_can_access_maintenance(UUID, UUID) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.member_can_access_property(
  p_organization_id UUID,
  p_property_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    public.is_platform_admin()
    OR public.is_platform_staff()
    OR public.has_platform_console_grant('organizations')
    OR public.has_platform_console_grant('listings')
    OR (
      p_organization_id IS NOT NULL
      AND p_property_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members m
        WHERE m.organization_id = p_organization_id
          AND m.user_id = auth.uid()
          AND COALESCE(m.scope_mode, 'organization') = 'organization'
      )
    )
    OR (
      p_organization_id IS NOT NULL
      AND p_property_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members m
        WHERE m.organization_id = p_organization_id
          AND m.user_id = auth.uid()
          AND m.scope_mode = 'properties'
          AND EXISTS (
            SELECT 1
            FROM public.organization_member_property_scopes s
            WHERE s.organization_id = p_organization_id
              AND s.user_id = auth.uid()
              AND s.property_id = p_property_id
          )
      )
    )
    OR (
      p_organization_id IS NOT NULL
      AND p_property_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members m
        JOIN public.organization_member_unit_scopes us
          ON us.organization_id = m.organization_id
         AND us.user_id = m.user_id
        JOIN public.organization_unit_properties up
          ON up.organization_unit_id = us.unit_id
         AND up.property_id = p_property_id
        WHERE m.organization_id = p_organization_id
          AND m.user_id = auth.uid()
          AND m.scope_mode = 'properties'
      )
    )
    OR (
      p_organization_id IS NOT NULL
      AND p_property_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members m
        WHERE m.organization_id = p_organization_id
          AND m.user_id = auth.uid()
          AND m.scope_mode = 'assigned_work'
          AND (
            EXISTS (
              SELECT 1
              FROM public.maintenance_requests mr
              WHERE mr.organization_id = p_organization_id
                AND mr.assigned_to_user_id = auth.uid()
                AND mr.property_id = p_property_id
            )
            OR EXISTS (
              SELECT 1
              FROM public.estate_work_orders wo
              JOIN public.managed_estates e ON e.id = wo.estate_id
              WHERE wo.assigned_to_user_id = auth.uid()
                AND e.organization_id = p_organization_id
                AND e.property_id = p_property_id
            )
          )
      )
    );
$$;

NOTIFY pgrst, 'reload schema';
