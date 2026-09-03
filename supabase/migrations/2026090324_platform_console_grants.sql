-- Granular platform console roles: admins assign specific responsibilities per user.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS platform_console_grants TEXT[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.users.platform_console_grants IS
  'Assigned admin-console areas (users, moderation, trust, revenue, etc.). Platform admins bypass and have all grants.';

UPDATE public.users
SET platform_console_grants = ARRAY[
  'users', 'organizations', 'listings', 'moderation', 'trust', 'support'
]::TEXT[]
WHERE is_platform_manager = TRUE
  AND NOT is_platform_admin
  AND platform_console_grants = '{}'::TEXT[];

CREATE OR REPLACE FUNCTION public.has_platform_console_grant(p_grant TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin()
    OR p_grant = ANY(
      COALESCE(
        (SELECT platform_console_grants FROM public.users WHERE id = auth.uid()),
        '{}'::TEXT[]
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin()
    OR COALESCE(
      cardinality(
        (SELECT platform_console_grants FROM public.users WHERE id = auth.uid())
      ),
      0
    ) > 0
    OR public.is_platform_manager();
$$;

GRANT EXECUTE ON FUNCTION public.has_platform_console_grant(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.sync_platform_manager_from_grants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.is_platform_manager := CARDINALITY(COALESCE(NEW.platform_console_grants, '{}'::TEXT[])) > 0;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_platform_manager_from_grants ON public.users;
CREATE TRIGGER sync_platform_manager_from_grants
  BEFORE INSERT OR UPDATE OF platform_console_grants ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_platform_manager_from_grants();

CREATE OR REPLACE FUNCTION public.protect_users_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF auth.uid() IS DISTINCT FROM OLD.id AND NOT public.is_platform_staff() THEN
      RAISE EXCEPTION 'Not authorized to update this user';
    END IF;

    IF auth.uid() = OLD.id AND NOT public.is_platform_admin() THEN
      IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
        RAISE EXCEPTION 'Cannot modify platform admin flag';
      END IF;
      IF NEW.is_platform_manager IS DISTINCT FROM OLD.is_platform_manager THEN
        RAISE EXCEPTION 'Cannot modify platform manager flag';
      END IF;
      IF NEW.platform_console_grants IS DISTINCT FROM OLD.platform_console_grants THEN
        RAISE EXCEPTION 'Cannot modify platform console grants';
      END IF;
      IF NEW.banned IS DISTINCT FROM OLD.banned THEN
        RAISE EXCEPTION 'Cannot modify banned status';
      END IF;
      IF NEW.verified IS DISTINCT FROM OLD.verified THEN
        RAISE EXCEPTION 'Cannot modify verified status';
      END IF;
    END IF;

    IF public.is_platform_manager() AND NOT public.is_platform_admin() THEN
      IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
        RAISE EXCEPTION 'Only platform admins can change admin access';
      END IF;
      IF NEW.is_platform_manager IS DISTINCT FROM OLD.is_platform_manager THEN
        RAISE EXCEPTION 'Only platform admins can change manager access';
      END IF;
      IF NEW.platform_console_grants IS DISTINCT FROM OLD.platform_console_grants THEN
        RAISE EXCEPTION 'Only platform admins can change platform roles';
      END IF;
    END IF;

    IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin
      OR NEW.platform_console_grants IS DISTINCT FROM OLD.platform_console_grants THEN
      IF NOT public.is_platform_admin() THEN
        RAISE EXCEPTION 'Only platform admins can assign platform roles';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Grant-scoped console policies (revenue tables remain admin-only from prior migrations).

DROP POLICY IF EXISTS "Platform staff can view all users" ON public.users;
CREATE POLICY "Platform staff can view all users"
ON public.users FOR SELECT
USING (public.has_platform_console_grant('users') OR public.has_platform_console_grant('support'));

DROP POLICY IF EXISTS "Platform staff can update users" ON public.users;
CREATE POLICY "Platform staff can update users"
ON public.users FOR UPDATE
USING (public.has_platform_console_grant('users'));

DROP POLICY IF EXISTS "Platform staff can view all organizations" ON public.organizations;
CREATE POLICY "Platform staff can view all organizations"
ON public.organizations FOR SELECT
USING (public.has_platform_console_grant('organizations'));

DROP POLICY IF EXISTS "Platform staff can update organizations" ON public.organizations;
CREATE POLICY "Platform staff can update organizations"
ON public.organizations FOR UPDATE
USING (public.has_platform_console_grant('organizations'));

DROP POLICY IF EXISTS "Platform staff can view all listings" ON public.listings;
CREATE POLICY "Platform staff can view all listings"
ON public.listings FOR SELECT
USING (public.has_platform_console_grant('listings') OR public.has_platform_console_grant('moderation'));

DROP POLICY IF EXISTS "Platform staff can update listings" ON public.listings;
CREATE POLICY "Platform staff can update listings"
ON public.listings FOR UPDATE
USING (public.has_platform_console_grant('listings'));

DROP POLICY IF EXISTS "Platform staff can view all properties" ON public.properties;
CREATE POLICY "Platform staff can view all properties"
ON public.properties FOR SELECT
USING (public.has_platform_console_grant('listings') OR public.has_platform_console_grant('moderation'));

DROP POLICY IF EXISTS "Platform staff can manage fraud review cases" ON public.fraud_review_cases;
CREATE POLICY "Platform staff can manage fraud review cases"
ON public.fraud_review_cases FOR ALL
USING (public.has_platform_console_grant('moderation'))
WITH CHECK (public.has_platform_console_grant('moderation'));

DROP POLICY IF EXISTS "Platform staff can manage fraud case events" ON public.fraud_case_events;
CREATE POLICY "Platform staff can manage fraud case events"
ON public.fraud_case_events FOR ALL
USING (public.has_platform_console_grant('moderation'))
WITH CHECK (public.has_platform_console_grant('moderation'));

DROP POLICY IF EXISTS "Platform staff can view audit logs" ON public.audit_logs;
CREATE POLICY "Platform staff can view audit logs"
ON public.audit_logs FOR SELECT
USING (
  public.has_platform_console_grant('users')
  OR public.has_platform_console_grant('moderation')
  OR public.has_platform_console_grant('trust')
);

DROP POLICY IF EXISTS "Platform staff review kyc" ON public.kyc_submissions;
CREATE POLICY "Platform staff review kyc" ON public.kyc_submissions FOR SELECT
USING (public.has_platform_console_grant('trust'));

DROP POLICY IF EXISTS "Platform staff update kyc" ON public.kyc_submissions;
CREATE POLICY "Platform staff update kyc" ON public.kyc_submissions FOR UPDATE
USING (public.has_platform_console_grant('trust'))
WITH CHECK (public.has_platform_console_grant('trust'));

DROP POLICY IF EXISTS "Platform staff review trust requests" ON public.trust_verification_requests;
CREATE POLICY "Platform staff review trust requests" ON public.trust_verification_requests FOR SELECT
USING (public.has_platform_console_grant('trust'));

DROP POLICY IF EXISTS "Platform staff update trust requests" ON public.trust_verification_requests;
CREATE POLICY "Platform staff update trust requests" ON public.trust_verification_requests FOR UPDATE
USING (public.has_platform_console_grant('trust'))
WITH CHECK (public.has_platform_console_grant('trust'));
