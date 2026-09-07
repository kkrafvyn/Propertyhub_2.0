-- Platform console staff must read organization_members for admin org profiles,
-- member counts, and user directory context. Prior migrations only allowed
-- self-view and owner/manager management rows.

CREATE POLICY "Platform staff can view organization members"
ON public.organization_members FOR SELECT
USING (
  public.has_platform_console_grant('organizations')
  OR public.has_platform_console_grant('users')
);

-- Org admins need teammate email/name on roster joins without a separate Users grant.
DROP POLICY IF EXISTS "Platform staff can view all users" ON public.users;
CREATE POLICY "Platform staff can view all users"
ON public.users FOR SELECT
USING (
  public.has_platform_console_grant('users')
  OR public.has_platform_console_grant('support')
  OR public.has_platform_console_grant('organizations')
);

-- Open-task counts on org profile pages.
DROP POLICY IF EXISTS "Platform staff can view workspace tasks" ON public.workspace_tasks;
CREATE POLICY "Platform staff can view workspace tasks"
ON public.workspace_tasks FOR SELECT
USING (
  public.has_platform_console_grant('organizations')
  OR public.has_platform_console_grant('moderation')
);

NOTIFY pgrst, 'reload schema';
