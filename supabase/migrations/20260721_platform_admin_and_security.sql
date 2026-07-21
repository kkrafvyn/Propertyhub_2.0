-- Platform admin role, admin RLS, fraud table tightening, automation run type extension

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.users WHERE id = auth.uid()),
    FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

DROP POLICY IF EXISTS "Platform admins can view all users" ON public.users;
CREATE POLICY "Platform admins can view all users"
ON public.users FOR SELECT
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can update users" ON public.users;
CREATE POLICY "Platform admins can update users"
ON public.users FOR UPDATE
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all organizations" ON public.organizations;
CREATE POLICY "Platform admins can view all organizations"
ON public.organizations FOR SELECT
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can update organizations" ON public.organizations;
CREATE POLICY "Platform admins can update organizations"
ON public.organizations FOR UPDATE
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all listings" ON public.listings;
CREATE POLICY "Platform admins can view all listings"
ON public.listings FOR SELECT
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can update listings" ON public.listings;
CREATE POLICY "Platform admins can update listings"
ON public.listings FOR UPDATE
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all properties" ON public.properties;
CREATE POLICY "Platform admins can view all properties"
ON public.properties FOR SELECT
USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Authenticated users can manage fraud review cases" ON public.fraud_review_cases;
DROP POLICY IF EXISTS "Platform admins can manage fraud review cases" ON public.fraud_review_cases;
CREATE POLICY "Platform admins can manage fraud review cases"
ON public.fraud_review_cases FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Authenticated users can manage fraud case events" ON public.fraud_case_events;
DROP POLICY IF EXISTS "Platform admins can manage fraud case events" ON public.fraud_case_events;
CREATE POLICY "Platform admins can manage fraud case events"
ON public.fraud_case_events FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Platform admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (public.is_platform_admin());

ALTER TABLE public.automation_runs
DROP CONSTRAINT IF EXISTS automation_runs_run_type_check;

ALTER TABLE public.automation_runs
ADD CONSTRAINT automation_runs_run_type_check
CHECK (
  run_type IN (
    'saved_search_alerts',
    'follow_up_reminders',
    'stale_pipeline',
    'viewing_reminders',
    'market_analytics_snapshot'
  )
);

COMMENT ON COLUMN public.users.is_platform_admin IS 'Grants access to the platform admin console and moderation tools.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_location_trends_city_region
ON public.location_trends(city, region);
