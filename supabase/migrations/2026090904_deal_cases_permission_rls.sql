-- Align deal_cases and org-scoped conversations with workspace leads permissions.

CREATE OR REPLACE FUNCTION private.workspace_role_has_permission(p_role TEXT, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, private
AS $$
BEGIN
  IF p_permission = 'listings:write' THEN
    RETURN p_role IN (
      'owner', 'managing_director', 'platform_admin', 'enterprise_operator',
      'head_property_management', 'manager', 'property_manager', 'facilities_manager',
      'sales_manager', 'agent', 'sales_agent', 'marketing_manager', 'marketing_officer', 'developer'
    );
  END IF;

  IF p_permission = 'contacts:write' THEN
    RETURN p_role IN (
      'owner', 'managing_director', 'platform_admin', 'enterprise_operator',
      'head_property_management', 'manager', 'property_manager', 'sales_manager',
      'agent', 'sales_agent', 'customer_service_manager', 'customer_service_agent'
    );
  END IF;

  IF p_permission = 'tasks:write' THEN
    RETURN p_role IN (
      'owner', 'managing_director', 'platform_admin', 'enterprise_operator',
      'head_property_management', 'manager', 'property_manager', 'facilities_manager',
      'estate_officer', 'caretaker', 'technician', 'collections_officer',
      'sales_manager', 'agent', 'sales_agent', 'customer_service_manager',
      'customer_service_agent', 'contractor', 'vendor'
    );
  END IF;

  IF p_permission = 'leads:read' THEN
    RETURN p_role IN (
      'owner', 'managing_director', 'organization_admin', 'platform_admin', 'enterprise_operator',
      'head_property_management', 'manager', 'property_manager', 'sales_manager', 'agent',
      'sales_agent', 'marketing_manager', 'marketing_officer', 'collections_officer',
      'customer_service_manager', 'customer_service_agent', 'analyst', 'platform_analyst', 'developer'
    );
  END IF;

  IF p_permission = 'leads:write' THEN
    RETURN p_role IN (
      'owner', 'managing_director', 'organization_admin', 'platform_admin', 'enterprise_operator',
      'head_property_management', 'manager', 'property_manager', 'sales_manager', 'agent',
      'sales_agent', 'customer_service_manager', 'customer_service_agent'
    );
  END IF;

  RETURN FALSE;
END;
$$;

DROP POLICY IF EXISTS "Users can view their own deal cases" ON public.deal_cases;
DROP POLICY IF EXISTS "Authenticated users can create deal cases" ON public.deal_cases;
DROP POLICY IF EXISTS "Org members can update deal cases" ON public.deal_cases;

CREATE POLICY "Applicants and leads readers view deal cases"
  ON public.deal_cases FOR SELECT
  USING (
    auth.uid() = user_id
    OR private.org_member_has_permission(organization_id, 'leads:read')
  );

CREATE POLICY "Authenticated users create own deal cases"
  ON public.deal_cases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members with leads write can update deal cases"
  ON public.deal_cases FOR UPDATE
  USING (private.org_member_has_permission(organization_id, 'leads:write'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'leads:write'));

DROP POLICY IF EXISTS "Org leads staff view org conversations" ON public.conversations;
CREATE POLICY "Org leads staff view org conversations"
  ON public.conversations FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND private.org_member_has_permission(organization_id, 'leads:read')
  );

DROP POLICY IF EXISTS "Org leads staff update org conversations" ON public.conversations;
CREATE POLICY "Org leads staff update org conversations"
  ON public.conversations FOR UPDATE
  USING (
    organization_id IS NOT NULL
    AND private.org_member_has_permission(organization_id, 'leads:write')
  )
  WITH CHECK (
    organization_id IS NOT NULL
    AND private.org_member_has_permission(organization_id, 'leads:write')
  );

NOTIFY pgrst, 'reload schema';
