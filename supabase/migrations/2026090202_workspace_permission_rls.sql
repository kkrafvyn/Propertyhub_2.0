-- Align listings and organization_contacts RLS with src/lib/workspace-permissions.ts

CREATE OR REPLACE FUNCTION private.workspace_role_has_permission(p_role TEXT, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, private
AS $$
BEGIN
  IF p_permission = 'listings:write' THEN
    RETURN p_role IN (
      'owner',
      'managing_director',
      'platform_admin',
      'enterprise_operator',
      'head_property_management',
      'manager',
      'property_manager',
      'facilities_manager',
      'sales_manager',
      'agent',
      'sales_agent',
      'marketing_manager',
      'marketing_officer',
      'developer'
    );
  END IF;

  IF p_permission = 'contacts:write' THEN
    RETURN p_role IN (
      'owner',
      'managing_director',
      'platform_admin',
      'enterprise_operator',
      'head_property_management',
      'manager',
      'property_manager',
      'sales_manager',
      'agent',
      'sales_agent',
      'customer_service_manager',
      'customer_service_agent'
    );
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION private.org_member_has_permission(p_org_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = p_org_id
        AND om.user_id = auth.uid()
        AND (
          private.workspace_role_has_permission(om.role, p_permission)
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(COALESCE(om.permissions, '[]'::jsonb)) elem(value)
            WHERE elem.value = p_permission
          )
        )
    );
$$;

DROP POLICY IF EXISTS "Org members can create listings" ON public.listings;
CREATE POLICY "Members with listings write can create listings"
  ON public.listings
  FOR INSERT
  WITH CHECK (private.org_member_has_permission(organization_id, 'listings:write'));

DROP POLICY IF EXISTS "Org members can update their listings" ON public.listings;
CREATE POLICY "Members with listings write can update listings"
  ON public.listings
  FOR UPDATE
  USING (private.org_member_has_permission(organization_id, 'listings:write'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'listings:write'));

DROP POLICY IF EXISTS "Org members manage contacts" ON public.organization_contacts;
CREATE POLICY "Members with contacts write can manage contacts"
  ON public.organization_contacts
  FOR ALL
  USING (private.org_member_has_permission(organization_id, 'contacts:write'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'contacts:write'));
