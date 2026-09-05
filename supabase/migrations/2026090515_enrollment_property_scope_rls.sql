-- Organization enrollment gate, property/estate scope RLS, estate ↔ property link

-- ---------------------------------------------------------------------------
-- 1. Company enrollment requests (admin approval required before workspace)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_enrollment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  company_name TEXT NOT NULL,
  desired_slug TEXT NOT NULL,
  description TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  business_types TEXT[] NOT NULL DEFAULT '{}',
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment_one_pending_per_user
  ON public.organization_enrollment_requests(requester_user_id)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollment_pending_slug
  ON public.organization_enrollment_requests(lower(desired_slug))
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_enrollment_status_created
  ON public.organization_enrollment_requests(status, created_at DESC);

ALTER TABLE public.organization_enrollment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Requesters manage own enrollment requests" ON public.organization_enrollment_requests;
CREATE POLICY "Requesters manage own enrollment requests"
  ON public.organization_enrollment_requests FOR ALL
  USING (requester_user_id = auth.uid())
  WITH CHECK (requester_user_id = auth.uid() AND status IN ('pending', 'withdrawn'));

DROP POLICY IF EXISTS "Platform staff read enrollment requests" ON public.organization_enrollment_requests;
CREATE POLICY "Platform staff read enrollment requests"
  ON public.organization_enrollment_requests FOR SELECT
  USING (
    public.is_platform_admin()
    OR public.has_platform_console_grant('organizations')
  );

DROP POLICY IF EXISTS "Platform staff review enrollment requests" ON public.organization_enrollment_requests;
CREATE POLICY "Platform staff review enrollment requests"
  ON public.organization_enrollment_requests FOR UPDATE
  USING (
    public.is_platform_admin()
    OR public.has_platform_console_grant('organizations')
  )
  WITH CHECK (
    public.is_platform_admin()
    OR public.has_platform_console_grant('organizations')
  );

-- Stop self-service org creation; only platform admin or approval RPC may create orgs.
DROP POLICY IF EXISTS "Owners can create organizations" ON public.organizations;
CREATE POLICY "Platform admins create organizations directly"
  ON public.organizations FOR INSERT
  WITH CHECK (public.is_platform_admin());

CREATE OR REPLACE FUNCTION public.approve_organization_enrollment_request(
  p_request_id UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_request public.organization_enrollment_requests%ROWTYPE;
  v_org_id UUID;
  v_slug TEXT;
BEGIN
  IF NOT (
    public.is_platform_admin()
    OR public.has_platform_console_grant('organizations')
  ) THEN
    RAISE EXCEPTION 'Access denied: platform enrollment approval required';
  END IF;

  SELECT * INTO v_request
  FROM public.organization_enrollment_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment request not found';
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'Enrollment request is not pending';
  END IF;

  v_slug := lower(trim(v_request.desired_slug));
  IF v_slug IS NULL OR length(v_slug) = 0 THEN
    RAISE EXCEPTION 'Invalid workspace slug';
  END IF;

  IF EXISTS (SELECT 1 FROM public.organizations o WHERE lower(o.slug) = v_slug) THEN
    RAISE EXCEPTION 'Workspace slug already taken';
  END IF;

  INSERT INTO public.organizations (
    name,
    slug,
    description,
    email,
    phone,
    website,
    owner_id,
    verified,
    suspended,
    business_types,
    company_setup_completed
  )
  VALUES (
    v_request.company_name,
    v_slug,
    v_request.description,
    v_request.contact_email,
    v_request.contact_phone,
    v_request.website,
    v_request.requester_user_id,
    TRUE,
    FALSE,
    COALESCE(v_request.business_types, '{}'),
    FALSE
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.organization_members (
    organization_id,
    user_id,
    role
  )
  VALUES (
    v_org_id,
    v_request.requester_user_id,
    'owner'
  );

  UPDATE public.organization_enrollment_requests
  SET
    status = 'approved',
    organization_id = v_org_id,
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    review_notes = p_review_notes,
    updated_at = NOW()
  WHERE id = p_request_id;

  RETURN v_org_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_organization_enrollment_request(
  p_request_id UUID,
  p_review_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF NOT (
    public.is_platform_admin()
    OR public.has_platform_console_grant('organizations')
  ) THEN
    RAISE EXCEPTION 'Access denied: platform enrollment review required';
  END IF;

  UPDATE public.organization_enrollment_requests
  SET
    status = 'rejected',
    reviewed_by = auth.uid(),
    reviewed_at = NOW(),
    review_notes = p_review_notes,
    updated_at = NOW()
  WHERE id = p_request_id
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending enrollment request not found';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_organization_enrollment_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_organization_enrollment_request(UUID, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.reject_organization_enrollment_request(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reject_organization_enrollment_request(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Property + estate scope helpers (server-side enforcement)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.member_can_access_property(
  p_organization_id UUID,
  p_property_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    public.is_platform_admin()
    OR (
      p_organization_id IS NOT NULL
      AND p_property_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members m
        WHERE m.organization_id = p_organization_id
          AND m.user_id = auth.uid()
          AND COALESCE(m.scope_mode, 'organization') = 'organization'
      )
    )
    OR (
      p_organization_id IS NOT NULL
      AND p_property_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members m
        WHERE m.organization_id = p_organization_id
          AND m.user_id = auth.uid()
          AND m.scope_mode = 'properties'
          AND EXISTS (
            SELECT 1
            FROM public.organization_member_property_scopes s
            WHERE s.organization_id = p_organization_id
              AND s.user_id = auth.uid()
              AND s.property_id = p_property_id
          )
      )
    );
$$;

-- Link estates to canonical properties for scoped access (must exist before estate helper)
ALTER TABLE public.managed_estates
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_managed_estates_property
  ON public.managed_estates(property_id);

CREATE OR REPLACE FUNCTION private.member_can_access_estate(
  p_organization_id UUID,
  p_estate_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    public.is_platform_admin()
    OR (
      p_organization_id IS NOT NULL
      AND p_estate_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.managed_estates e
        WHERE e.id = p_estate_id
          AND e.organization_id = p_organization_id
          AND (
            e.property_id IS NULL
            AND EXISTS (
              SELECT 1
              FROM public.organization_members m
              WHERE m.organization_id = p_organization_id
                AND m.user_id = auth.uid()
                AND COALESCE(m.scope_mode, 'organization') = 'organization'
            )
          )
      )
    )
    OR (
      EXISTS (
        SELECT 1
        FROM public.managed_estates e
        WHERE e.id = p_estate_id
          AND e.organization_id = p_organization_id
          AND e.property_id IS NOT NULL
          AND private.member_can_access_property(p_organization_id, e.property_id)
      )
    );
$$;

REVOKE ALL ON FUNCTION private.member_can_access_property(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.member_can_access_property(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION private.member_can_access_estate(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.member_can_access_estate(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Tighten org-member property/listing visibility by scope
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Org members can create properties" ON public.properties;
CREATE POLICY "Org members can create properties"
  ON public.properties FOR INSERT
  WITH CHECK (
    properties.organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.organization_members om
      WHERE om.organization_id = properties.organization_id
        AND om.user_id = auth.uid()
        AND COALESCE(om.scope_mode, 'organization') IN ('organization', 'properties')
    )
  );

DROP POLICY IF EXISTS "Anyone can view properties with public listings" ON public.properties;
CREATE POLICY "Anyone can view properties with public listings"
  ON public.properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.listings l
      WHERE l.property_id = properties.id
        AND l.status = 'listed'
        AND l.visibility = 'public'
    )
    OR (
      properties.organization_id IS NOT NULL
      AND private.member_can_access_property(properties.organization_id, properties.id)
    )
  );

DROP POLICY IF EXISTS "Org members can view all their listings" ON public.listings;
DROP POLICY IF EXISTS "Org members can create listings" ON public.listings;
DROP POLICY IF EXISTS "Org members can update their listings" ON public.listings;
DROP POLICY IF EXISTS "Org members can view organization listings" ON public.listings;
DROP POLICY IF EXISTS "Org members can insert organization listings" ON public.listings;
DROP POLICY IF EXISTS "Org members can update organization listings" ON public.listings;

CREATE POLICY "Org members can view organization listings"
  ON public.listings FOR SELECT
  USING (
    listings.organization_id IS NOT NULL
    AND private.member_can_access_property(listings.organization_id, listings.property_id)
  );

CREATE POLICY "Org members can insert organization listings"
  ON public.listings FOR INSERT
  WITH CHECK (
    listings.organization_id IS NOT NULL
    AND private.member_can_access_property(listings.organization_id, listings.property_id)
  );

CREATE POLICY "Org members can update organization listings"
  ON public.listings FOR UPDATE
  USING (
    listings.organization_id IS NOT NULL
    AND private.member_can_access_property(listings.organization_id, listings.property_id)
  )
  WITH CHECK (
    listings.organization_id IS NOT NULL
    AND private.member_can_access_property(listings.organization_id, listings.property_id)
  );

DROP POLICY IF EXISTS "Estate staff can manage estates" ON public.managed_estates;
CREATE POLICY "Estate staff can manage estates"
  ON public.managed_estates FOR ALL
  USING (
    private.member_can_access_estate(managed_estates.organization_id, managed_estates.id)
  )
  WITH CHECK (
    private.member_can_access_estate(managed_estates.organization_id, managed_estates.id)
  );
