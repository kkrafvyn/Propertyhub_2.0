DROP POLICY IF EXISTS "Organization members can manage trust verification requests"
ON public.trust_verification_requests;

CREATE POLICY "Organization members can manage trust verification requests"
ON public.trust_verification_requests
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = trust_verification_requests.organization_id
      AND membership.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = trust_verification_requests.organization_id
      AND membership.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Organization members can manage listing verification checks"
ON public.listing_verification_checks;

DROP POLICY IF EXISTS "Public can view passed public listing checks"
ON public.listing_verification_checks;

DROP POLICY IF EXISTS "Listing checks are visible to public or org members"
ON public.listing_verification_checks;

CREATE POLICY "Listing checks are visible to public or org members"
ON public.listing_verification_checks
FOR SELECT
TO anon, authenticated
USING (
  (
    status = 'passed'
    AND EXISTS (
      SELECT 1
      FROM public.listings listing
      WHERE listing.id = listing_verification_checks.listing_id
        AND listing.status = 'listed'
        AND listing.visibility = 'public'
    )
  )
  OR (
    (SELECT auth.uid()) IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.organization_members membership
      WHERE membership.organization_id = listing_verification_checks.organization_id
        AND membership.user_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Organization members can insert listing verification checks"
ON public.listing_verification_checks;

CREATE POLICY "Organization members can insert listing verification checks"
ON public.listing_verification_checks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = listing_verification_checks.organization_id
      AND membership.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Organization members can update listing verification checks"
ON public.listing_verification_checks;

CREATE POLICY "Organization members can update listing verification checks"
ON public.listing_verification_checks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = listing_verification_checks.organization_id
      AND membership.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = listing_verification_checks.organization_id
      AND membership.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Organization members can delete listing verification checks"
ON public.listing_verification_checks;

CREATE POLICY "Organization members can delete listing verification checks"
ON public.listing_verification_checks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = listing_verification_checks.organization_id
      AND membership.user_id = (SELECT auth.uid())
  )
);

NOTIFY pgrst, 'reload schema';
