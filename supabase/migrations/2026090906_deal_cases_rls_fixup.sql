-- Remove org-hierarchy deal_cases policies that bypass leads:write (2026090516).

DROP POLICY IF EXISTS "Org members view scoped deal cases" ON public.deal_cases;
DROP POLICY IF EXISTS "Org members insert deal cases" ON public.deal_cases;
DROP POLICY IF EXISTS "Org members update scoped deal cases" ON public.deal_cases;

DROP POLICY IF EXISTS "Applicants and leads readers view deal cases" ON public.deal_cases;
DROP POLICY IF EXISTS "Authenticated users create own deal cases" ON public.deal_cases;
DROP POLICY IF EXISTS "Members with leads write can update deal cases" ON public.deal_cases;

CREATE POLICY "Applicants and leads readers view deal cases"
  ON public.deal_cases FOR SELECT
  USING (
    auth.uid() = user_id
    OR private.org_member_has_permission(organization_id, 'leads:read')
  );

CREATE POLICY "Authenticated users create own deal cases"
  ON public.deal_cases FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Members with leads write can update deal cases"
  ON public.deal_cases FOR UPDATE
  USING (private.org_member_has_permission(organization_id, 'leads:write'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'leads:write'));

NOTIFY pgrst, 'reload schema';
