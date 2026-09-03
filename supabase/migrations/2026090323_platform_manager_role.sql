-- Platform manager: operational admin delegate (users, moderation, trust) without super-admin powers.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_platform_manager BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.users.is_platform_manager IS
  'Grants platform console access for day-to-day ops. Cannot grant admin/manager or edit revenue rules.';

CREATE OR REPLACE FUNCTION public.is_platform_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_platform_manager FROM public.users WHERE id = auth.uid()),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_platform_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_platform_admin() OR public.is_platform_manager();
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_manager() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_staff() TO authenticated;

-- Harden privileged column updates
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
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Console operations: staff can run day-to-day moderation; revenue stays admin-only (existing policies).

DROP POLICY IF EXISTS "Platform admins can view all users" ON public.users;
CREATE POLICY "Platform staff can view all users"
ON public.users FOR SELECT
USING (public.is_platform_staff());

DROP POLICY IF EXISTS "Platform admins can update users" ON public.users;
CREATE POLICY "Platform staff can update users"
ON public.users FOR UPDATE
USING (public.is_platform_staff());

DROP POLICY IF EXISTS "Platform admins can view all organizations" ON public.organizations;
CREATE POLICY "Platform staff can view all organizations"
ON public.organizations FOR SELECT
USING (public.is_platform_staff());

DROP POLICY IF EXISTS "Platform admins can update organizations" ON public.organizations;
CREATE POLICY "Platform staff can update organizations"
ON public.organizations FOR UPDATE
USING (public.is_platform_staff());

DROP POLICY IF EXISTS "Platform admins can view all listings" ON public.listings;
CREATE POLICY "Platform staff can view all listings"
ON public.listings FOR SELECT
USING (public.is_platform_staff());

DROP POLICY IF EXISTS "Platform admins can update listings" ON public.listings;
CREATE POLICY "Platform staff can update listings"
ON public.listings FOR UPDATE
USING (public.is_platform_staff());

DROP POLICY IF EXISTS "Platform admins can view all properties" ON public.properties;
CREATE POLICY "Platform staff can view all properties"
ON public.properties FOR SELECT
USING (public.is_platform_staff());

DROP POLICY IF EXISTS "Platform admins can manage fraud review cases" ON public.fraud_review_cases;
CREATE POLICY "Platform staff can manage fraud review cases"
ON public.fraud_review_cases FOR ALL
USING (public.is_platform_staff())
WITH CHECK (public.is_platform_staff());

DROP POLICY IF EXISTS "Platform admins can manage fraud case events" ON public.fraud_case_events;
CREATE POLICY "Platform staff can manage fraud case events"
ON public.fraud_case_events FOR ALL
USING (public.is_platform_staff())
WITH CHECK (public.is_platform_staff());

DROP POLICY IF EXISTS "Platform admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Platform staff can view audit logs"
ON public.audit_logs FOR SELECT
USING (public.is_platform_staff());

DROP POLICY IF EXISTS "Platform admins review kyc" ON public.kyc_submissions;
CREATE POLICY "Platform staff review kyc" ON public.kyc_submissions FOR SELECT
USING (public.is_platform_staff());

DROP POLICY IF EXISTS "Platform admins update kyc" ON public.kyc_submissions;
CREATE POLICY "Platform staff update kyc" ON public.kyc_submissions FOR UPDATE
USING (public.is_platform_staff())
WITH CHECK (public.is_platform_staff());

DROP POLICY IF EXISTS "Platform admins review trust requests" ON public.trust_verification_requests;
CREATE POLICY "Platform staff review trust requests" ON public.trust_verification_requests FOR SELECT
USING (public.is_platform_staff());

DROP POLICY IF EXISTS "Platform admins update trust requests" ON public.trust_verification_requests;
CREATE POLICY "Platform staff update trust requests" ON public.trust_verification_requests FOR UPDATE
USING (public.is_platform_staff())
WITH CHECK (public.is_platform_staff());
