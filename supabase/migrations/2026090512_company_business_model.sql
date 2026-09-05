-- Company business model: types, capabilities, departments, extended job roles

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS business_types TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS enabled_capabilities TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS company_setup_completed BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.organization_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  department_key TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, department_key)
);

CREATE INDEX IF NOT EXISTS idx_organization_departments_org
  ON public.organization_departments(organization_id);

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.organization_departments(id) ON DELETE SET NULL;

-- Allow extended job roles beyond the original four-tier model
ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
ALTER TABLE public.organization_invitations DROP CONSTRAINT IF EXISTS organization_invitations_role_check;

ALTER TABLE public.organization_members
  ADD CONSTRAINT organization_members_role_not_empty
  CHECK (role IS NOT NULL AND length(trim(role)) > 0);

ALTER TABLE public.organization_invitations
  ADD CONSTRAINT organization_invitations_role_not_empty
  CHECK (role IS NOT NULL AND length(trim(role)) > 0);

ALTER TABLE public.organization_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read departments" ON public.organization_departments;
CREATE POLICY "Org members read departments"
  ON public.organization_departments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_departments.organization_id
        AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Org managers manage departments" ON public.organization_departments;
CREATE POLICY "Org managers manage departments"
  ON public.organization_departments FOR ALL
  USING (private.can_manage_organization_members(organization_id))
  WITH CHECK (private.can_manage_organization_members(organization_id));

-- Only owners may assign the owner role
CREATE OR REPLACE FUNCTION private.can_assign_member_role(
  p_organization_id UUID,
  p_target_role TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    public.is_platform_admin()
    OR (
      private.can_manage_organization_members(p_organization_id)
      AND (
        p_target_role <> 'owner'
        OR EXISTS (
          SELECT 1
          FROM public.organization_members m
          WHERE m.organization_id = p_organization_id
            AND m.user_id = auth.uid()
            AND m.role = 'owner'
        )
      )
    );
$$;

REVOKE ALL ON FUNCTION private.can_assign_member_role(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_assign_member_role(UUID, TEXT) TO authenticated;

DROP POLICY IF EXISTS "Owners can manage members" ON public.organization_members;
CREATE POLICY "Owners can manage members"
  ON public.organization_members FOR ALL
  USING (private.can_manage_organization_members(organization_members.organization_id))
  WITH CHECK (
    private.can_manage_organization_members(organization_members.organization_id)
    AND private.can_assign_member_role(organization_members.organization_id, organization_members.role)
  );
