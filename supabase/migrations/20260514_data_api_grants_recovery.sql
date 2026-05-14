DROP POLICY IF EXISTS "Members can view their org members" ON public.organization_members;
DROP POLICY IF EXISTS "Users can view their own membership rows" ON public.organization_members;
DROP POLICY IF EXISTS "Owners and managers can manage members" ON public.organization_members;
DROP POLICY IF EXISTS "Owners can manage members" ON public.organization_members;

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.can_manage_organization_members(target_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = target_organization_id
      AND membership.user_id = auth.uid()
      AND membership.role IN ('owner', 'manager')
  );
$$;

REVOKE ALL ON FUNCTION private.can_manage_organization_members(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.can_manage_organization_members(UUID) TO anon, authenticated;

CREATE POLICY "Users can view their own membership rows"
ON public.organization_members FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Owners and managers can manage members"
ON public.organization_members FOR ALL
USING (private.can_manage_organization_members(organization_members.organization_id))
WITH CHECK (private.can_manage_organization_members(organization_members.organization_id));

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT ON public.organizations TO anon;
GRANT SELECT ON public.properties TO anon;
GRANT SELECT ON public.listings TO anon;
GRANT SELECT ON public.property_media TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deal_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_properties TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_media TO authenticated;

GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
