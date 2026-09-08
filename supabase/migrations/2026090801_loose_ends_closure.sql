-- Close security and permission loose ends (workspace tasks, storage, function grants).

GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.org_member_has_permission(UUID, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.workspace_role_has_permission(TEXT, TEXT) TO anon, authenticated, service_role;

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

  RETURN FALSE;
END;
$$;

DROP POLICY IF EXISTS "Org members manage tasks" ON public.workspace_tasks;
CREATE POLICY "Members with tasks write can manage tasks"
  ON public.workspace_tasks
  FOR ALL
  USING (private.org_member_has_permission(organization_id, 'tasks:write'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'tasks:write'));

CREATE OR REPLACE FUNCTION private.property_media_is_publicly_listed(p_storage_path TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.property_media pm
    JOIN public.listings l ON l.property_id = pm.property_id
    JOIN public.organizations o ON o.id = l.organization_id
    WHERE pm.storage_path = p_storage_path
      AND l.status = 'listed'
      AND l.visibility = 'public'
      AND o.verified = TRUE
      AND COALESCE(o.suspended, FALSE) = FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION private.property_media_is_publicly_listed(TEXT) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public can view property media bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public read listed property media" ON storage.objects;
DROP POLICY IF EXISTS "Org members read property media" ON storage.objects;

CREATE POLICY "Public read listed property media"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'property-media'
  AND private.property_media_is_publicly_listed(name)
);

CREATE POLICY "Org members read property media"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'property-media'
  AND (
    private.property_media_is_publicly_listed(name)
    OR EXISTS (
      SELECT 1
      FROM public.organization_members membership
      WHERE membership.organization_id::text = (storage.foldername(name))[1]
        AND membership.user_id = auth.uid()
    )
  )
);

NOTIFY pgrst, 'reload schema';
