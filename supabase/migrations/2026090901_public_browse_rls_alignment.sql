-- Align public browse RLS with SECURITY DEFINER helpers (avoids subquery RLS inheritance).

CREATE OR REPLACE FUNCTION private.property_has_public_listing(p_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.listings l
    JOIN public.organizations o ON o.id = l.organization_id
    WHERE l.property_id = p_property_id
      AND l.status = 'listed'
      AND l.visibility = 'public'
      AND o.verified = TRUE
      AND COALESCE(o.suspended, FALSE) = FALSE
  );
$$;

GRANT EXECUTE ON FUNCTION private.property_has_public_listing(UUID) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Anyone can view properties with public listings" ON public.properties;
CREATE POLICY "Anyone can view properties with public listings"
  ON public.properties FOR SELECT
  USING (
    private.property_has_public_listing(properties.id)
    OR (
      properties.organization_id IS NOT NULL
      AND private.member_can_access_property(properties.organization_id, properties.id)
    )
  );

DROP POLICY IF EXISTS "Anyone can view property media for public listings" ON public.property_media;
CREATE POLICY "Anyone can view property media for public listings"
  ON public.property_media FOR SELECT
  USING (
    private.property_has_public_listing(property_media.property_id)
    OR EXISTS (
      SELECT 1
      FROM public.organization_members membership
      WHERE membership.organization_id = property_media.organization_id
        AND membership.user_id = auth.uid()
    )
  );

NOTIFY pgrst, 'reload schema';
