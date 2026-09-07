-- Platform staff (admin, manager, or organizations grant) must read pending workspace enrollments.

DROP POLICY IF EXISTS "Platform staff read enrollment requests" ON public.organization_enrollment_requests;
CREATE POLICY "Platform staff read enrollment requests"
  ON public.organization_enrollment_requests FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.is_platform_staff()
    OR public.has_platform_console_grant('organizations')
  );

DROP POLICY IF EXISTS "Platform staff review enrollment requests" ON public.organization_enrollment_requests;
CREATE POLICY "Platform staff review enrollment requests"
  ON public.organization_enrollment_requests FOR UPDATE
  USING (
    public.is_platform_admin()
    OR public.is_platform_staff()
    OR public.has_platform_console_grant('organizations')
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.is_platform_staff()
    OR public.has_platform_console_grant('organizations')
  );

-- Applicant profiles on enrollment review joins.
DROP POLICY IF EXISTS "Platform staff can view all users" ON public.users;
CREATE POLICY "Platform staff can view all users"
ON public.users FOR SELECT
USING (
  public.is_platform_admin()
  OR public.is_platform_staff()
  OR public.has_platform_console_grant('users')
  OR public.has_platform_console_grant('support')
  OR public.has_platform_console_grant('organizations')
);

NOTIFY pgrst, 'reload schema';
