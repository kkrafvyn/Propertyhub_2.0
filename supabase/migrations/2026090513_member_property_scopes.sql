-- Property-level access scope for organization members

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS scope_mode TEXT NOT NULL DEFAULT 'organization'
    CHECK (scope_mode IN ('organization', 'properties', 'assigned_work'));

CREATE TABLE IF NOT EXISTS public.organization_member_property_scopes (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_member_property_scopes_org_user
  ON public.organization_member_property_scopes(organization_id, user_id);

ALTER TABLE public.organization_member_property_scopes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org managers manage property scopes" ON public.organization_member_property_scopes;
CREATE POLICY "Org managers manage property scopes"
  ON public.organization_member_property_scopes FOR ALL
  USING (private.can_manage_organization_members(organization_id))
  WITH CHECK (private.can_manage_organization_members(organization_id));

DROP POLICY IF EXISTS "Members read own property scopes" ON public.organization_member_property_scopes;
CREATE POLICY "Members read own property scopes"
  ON public.organization_member_property_scopes FOR SELECT
  USING (
    user_id = auth.uid()
    OR private.can_manage_organization_members(organization_id)
    OR public.is_platform_admin()
  );
