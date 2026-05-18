-- BaytMiftah Phase 1 admin baseline: user account visibility and suspension controls.
-- Admin authorization remains controlled by public.platform_admins.

DROP POLICY IF EXISTS "Platform admins can view all users" ON public.users;
CREATE POLICY "Platform admins can view all users"
ON public.users FOR SELECT
USING (private.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can update user access state" ON public.users;
CREATE POLICY "Platform admins can update user access state"
ON public.users FOR UPDATE
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

COMMENT ON COLUMN public.users.banned IS
  'Phase 1 admin account suspension flag. True blocks/marks the profile as banned in platform operations.';

NOTIFY pgrst, 'reload schema';
