-- Organization hierarchy, external contractor access, approval limits, scope RLS expansion

-- ---------------------------------------------------------------------------
-- 1. Organization units (business units / regions / portfolios)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  parent_unit_id UUID REFERENCES public.organization_units(id) ON DELETE SET NULL,
  unit_type TEXT NOT NULL DEFAULT 'region'
    CHECK (unit_type IN ('business_unit', 'region', 'portfolio', 'custom')),
  name TEXT NOT NULL,
  code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_organization_units_org
  ON public.organization_units(organization_id);

CREATE TABLE IF NOT EXISTS public.organization_unit_properties (
  organization_unit_id UUID NOT NULL REFERENCES public.organization_units(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_unit_id, property_id)
);

CREATE INDEX IF NOT EXISTS idx_org_unit_properties_property
  ON public.organization_unit_properties(property_id);

CREATE TABLE IF NOT EXISTS public.organization_member_unit_scopes (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.organization_units(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, user_id, unit_id)
);

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS organization_unit_id UUID REFERENCES public.organization_units(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_properties_org_unit
  ON public.properties(organization_unit_id);

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS setup_metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 2. Member approval limits + maintenance assignment
-- ---------------------------------------------------------------------------

ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS finance_approval_limit_minor BIGINT
    CHECK (finance_approval_limit_minor IS NULL OR finance_approval_limit_minor >= 0),
  ADD COLUMN IF NOT EXISTS maintenance_approval_limit_minor BIGINT
    CHECK (maintenance_approval_limit_minor IS NULL OR maintenance_approval_limit_minor >= 0);

ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS assigned_to_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_maintenance_assigned
  ON public.maintenance_requests(organization_id, assigned_to_user_id);

CREATE INDEX IF NOT EXISTS idx_maintenance_property
  ON public.maintenance_requests(property_id);

-- Backfill property_id from listings where possible
UPDATE public.maintenance_requests mr
SET property_id = l.property_id
FROM public.listings l
WHERE mr.listing_id = l.id
  AND mr.property_id IS NULL
  AND l.property_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. External contractor magic-link access (scoped resource, not full membership)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.external_access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL
    CHECK (resource_type IN ('maintenance_request', 'estate_work_order')),
  resource_id UUID NOT NULL,
  recipient_email TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT,
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_external_access_grants_resource
  ON public.external_access_grants(resource_type, resource_id);

ALTER TABLE public.organization_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_unit_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_member_unit_scopes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_access_grants ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. Expanded property access helper (units + assigned work)
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
    )
    OR (
      p_organization_id IS NOT NULL
      AND p_property_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_members m
        JOIN public.organization_member_unit_scopes us
          ON us.organization_id = m.organization_id
         AND us.user_id = m.user_id
        JOIN public.organization_unit_properties up
          ON up.organization_unit_id = us.unit_id
         AND up.property_id = p_property_id
        WHERE m.organization_id = p_organization_id
          AND m.user_id = auth.uid()
          AND m.scope_mode = 'properties'
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
          AND m.scope_mode = 'assigned_work'
          AND (
            EXISTS (
              SELECT 1
              FROM public.maintenance_requests mr
              WHERE mr.organization_id = p_organization_id
                AND mr.assigned_to_user_id = auth.uid()
                AND mr.property_id = p_property_id
            )
            OR EXISTS (
              SELECT 1
              FROM public.estate_work_orders wo
              JOIN public.managed_estates e ON e.id = wo.estate_id
              WHERE wo.assigned_to_user_id = auth.uid()
                AND e.organization_id = p_organization_id
                AND e.property_id = p_property_id
            )
          )
      )
    );
$$;

CREATE OR REPLACE FUNCTION private.member_can_access_maintenance(
  p_organization_id UUID,
  p_request_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.maintenance_requests mr
      WHERE mr.id = p_request_id
        AND mr.organization_id = p_organization_id
        AND mr.tenant_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.maintenance_requests mr
      WHERE mr.id = p_request_id
        AND mr.organization_id = p_organization_id
        AND mr.assigned_to_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.maintenance_requests mr
      WHERE mr.id = p_request_id
        AND mr.organization_id = p_organization_id
        AND mr.property_id IS NOT NULL
        AND private.member_can_access_property(p_organization_id, mr.property_id)
        AND EXISTS (
          SELECT 1
          FROM public.organization_members m
          WHERE m.organization_id = p_organization_id
            AND m.user_id = auth.uid()
            AND COALESCE(m.scope_mode, 'organization') IN ('organization', 'properties')
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.maintenance_requests mr
      JOIN public.listings l ON l.id = mr.listing_id
      WHERE mr.id = p_request_id
        AND mr.organization_id = p_organization_id
        AND l.property_id IS NOT NULL
        AND private.member_can_access_property(p_organization_id, l.property_id)
        AND EXISTS (
          SELECT 1
          FROM public.organization_members m
          WHERE m.organization_id = p_organization_id
            AND m.user_id = auth.uid()
            AND COALESCE(m.scope_mode, 'organization') IN ('organization', 'properties')
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.member_can_access_lease(
  p_organization_id UUID,
  p_lease_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.leases l
      WHERE l.id = p_lease_id
        AND l.organization_id = p_organization_id
        AND l.tenant_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.leases l
      JOIN public.listings lst ON lst.id = l.listing_id
      WHERE l.id = p_lease_id
        AND l.organization_id = p_organization_id
        AND lst.property_id IS NOT NULL
        AND private.member_can_access_property(p_organization_id, lst.property_id)
        AND EXISTS (
          SELECT 1
          FROM public.organization_members m
          WHERE m.organization_id = p_organization_id
            AND m.user_id = auth.uid()
        )
    );
$$;

CREATE OR REPLACE FUNCTION private.member_can_access_deal_case(
  p_organization_id UUID,
  p_case_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    public.is_platform_admin()
    OR EXISTS (
      SELECT 1
      FROM public.deal_cases dc
      WHERE dc.id = p_case_id
        AND dc.organization_id = p_organization_id
        AND dc.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.deal_cases dc
      JOIN public.listings lst ON lst.id = dc.listing_id
      WHERE dc.id = p_case_id
        AND dc.organization_id = p_organization_id
        AND lst.property_id IS NOT NULL
        AND private.member_can_access_property(p_organization_id, lst.property_id)
        AND EXISTS (
          SELECT 1
          FROM public.organization_members m
          WHERE m.organization_id = p_organization_id
            AND m.user_id = auth.uid()
        )
    );
$$;

REVOKE ALL ON FUNCTION private.member_can_access_maintenance(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.member_can_access_maintenance(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION private.member_can_access_lease(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.member_can_access_lease(UUID, UUID) TO authenticated;

REVOKE ALL ON FUNCTION private.member_can_access_deal_case(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.member_can_access_deal_case(UUID, UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Org member management — include organization_admin + managing_director
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.can_manage_organization_members(target_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = target_organization_id
      AND m.user_id = auth.uid()
      AND m.role IN (
        'owner',
        'manager',
        'organization_admin',
        'managing_director',
        'head_property_management'
      )
  )
  OR public.is_platform_admin();
$$;

-- ---------------------------------------------------------------------------
-- 6. External access token RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.create_external_access_grant(
  p_organization_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_recipient_email TEXT DEFAULT NULL,
  p_label TEXT DEFAULT NULL,
  p_expires_in_hours INTEGER DEFAULT 168
)
RETURNS TABLE(grant_id UUID, access_token TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT;
  v_hash TEXT;
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members m
    WHERE m.organization_id = p_organization_id
      AND m.user_id = auth.uid()
  ) AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not a member of this organization';
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');
  v_hash := encode(digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.external_access_grants (
    organization_id,
    resource_type,
    resource_id,
    recipient_email,
    token_hash,
    label,
    expires_at,
    created_by
  )
  VALUES (
    p_organization_id,
    p_resource_type,
    p_resource_id,
    NULLIF(trim(p_recipient_email), ''),
    v_hash,
    NULLIF(trim(p_label), ''),
    NOW() + make_interval(hours => GREATEST(p_expires_in_hours, 1)),
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN QUERY SELECT v_id, v_token;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_external_access_token(p_token TEXT)
RETURNS TABLE(
  grant_id UUID,
  organization_id UUID,
  resource_type TEXT,
  resource_id UUID,
  label TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_token IS NULL OR length(trim(p_token)) < 16 THEN
    RETURN;
  END IF;

  v_hash := encode(digest(trim(p_token), 'sha256'), 'hex');

  RETURN QUERY
  UPDATE public.external_access_grants g
  SET last_accessed_at = NOW()
  WHERE g.token_hash = v_hash
    AND g.revoked_at IS NULL
    AND (g.expires_at IS NULL OR g.expires_at > NOW())
  RETURNING g.id, g.organization_id, g.resource_type, g.resource_id, g.label;
END;
$$;

REVOKE ALL ON FUNCTION public.create_external_access_grant(UUID, TEXT, UUID, TEXT, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_external_access_grant(UUID, TEXT, UUID, TEXT, TEXT, INTEGER) TO authenticated;

REVOKE ALL ON FUNCTION public.validate_external_access_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_external_access_token(TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_external_maintenance_by_token(p_token TEXT)
RETURNS TABLE(
  id UUID,
  title TEXT,
  description TEXT,
  status TEXT,
  priority TEXT,
  label TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_grant RECORD;
BEGIN
  SELECT * INTO v_grant
  FROM public.validate_external_access_token(p_token)
  LIMIT 1;

  IF v_grant IS NULL OR v_grant.resource_type <> 'maintenance_request' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT mr.id, mr.title, mr.description, mr.status, mr.priority, v_grant.label
  FROM public.maintenance_requests mr
  WHERE mr.id = v_grant.resource_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_external_maintenance_status(
  p_token TEXT,
  p_status TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_grant RECORD;
BEGIN
  SELECT * INTO v_grant
  FROM public.validate_external_access_token(p_token)
  LIMIT 1;

  IF v_grant IS NULL OR v_grant.resource_type <> 'maintenance_request' THEN
    RETURN FALSE;
  END IF;

  IF p_status NOT IN ('open', 'in_progress', 'resolved', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  UPDATE public.maintenance_requests
  SET
    status = p_status,
    description = CASE
      WHEN p_note IS NOT NULL AND length(trim(p_note)) > 0
        THEN description || E'\n\n[Contractor note] ' || trim(p_note)
      ELSE description
    END,
    resolved_at = CASE WHEN p_status = 'resolved' THEN NOW() ELSE resolved_at END,
    updated_at = NOW()
  WHERE id = v_grant.resource_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.get_external_maintenance_by_token(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_external_maintenance_by_token(TEXT) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.update_external_maintenance_status(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_external_maintenance_status(TEXT, TEXT, TEXT) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- 7. RLS policies
-- ---------------------------------------------------------------------------

CREATE POLICY "Org members view organization units"
  ON public.organization_units FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = organization_units.organization_id
        AND m.user_id = auth.uid()
    )
    OR public.is_platform_admin()
  );

CREATE POLICY "Org admins manage organization units"
  ON public.organization_units FOR ALL
  USING (private.can_manage_organization_members(organization_id))
  WITH CHECK (private.can_manage_organization_members(organization_id));

CREATE POLICY "Org members view unit properties"
  ON public.organization_unit_properties FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_units u
      JOIN public.organization_members m ON m.organization_id = u.organization_id
      WHERE u.id = organization_unit_properties.organization_unit_id
        AND m.user_id = auth.uid()
    )
    OR public.is_platform_admin()
  );

CREATE POLICY "Org admins manage unit properties"
  ON public.organization_unit_properties FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.organization_units u
      WHERE u.id = organization_unit_properties.organization_unit_id
        AND private.can_manage_organization_members(u.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.organization_units u
      WHERE u.id = organization_unit_properties.organization_unit_id
        AND private.can_manage_organization_members(u.organization_id)
    )
  );

CREATE POLICY "Members view own unit scopes"
  ON public.organization_member_unit_scopes FOR SELECT
  USING (
    user_id = auth.uid()
    OR private.can_manage_organization_members(organization_id)
    OR public.is_platform_admin()
  );

CREATE POLICY "Org admins manage unit scopes"
  ON public.organization_member_unit_scopes FOR ALL
  USING (private.can_manage_organization_members(organization_id))
  WITH CHECK (private.can_manage_organization_members(organization_id));

CREATE POLICY "Staff manage external access grants"
  ON public.external_access_grants FOR ALL
  USING (private.can_manage_organization_members(organization_id))
  WITH CHECK (private.can_manage_organization_members(organization_id));

CREATE POLICY "Staff view external access grants"
  ON public.external_access_grants FOR SELECT
  USING (
    private.can_manage_organization_members(organization_id)
    OR public.is_platform_admin()
  );

-- Maintenance scoped access for org members
DROP POLICY IF EXISTS "Org members manage maintenance" ON public.maintenance_requests;
CREATE POLICY "Org members view scoped maintenance"
  ON public.maintenance_requests FOR SELECT
  USING (
    tenant_user_id = auth.uid()
    OR private.member_can_access_maintenance(organization_id, id)
    OR public.is_platform_admin()
  );

CREATE POLICY "Org members insert maintenance"
  ON public.maintenance_requests FOR INSERT
  WITH CHECK (
    tenant_user_id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.organization_id = maintenance_requests.organization_id
          AND m.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Org members update scoped maintenance"
  ON public.maintenance_requests FOR UPDATE
  USING (
    private.member_can_access_maintenance(organization_id, id)
    OR public.is_platform_admin()
  )
  WITH CHECK (
    private.member_can_access_maintenance(organization_id, id)
    OR public.is_platform_admin()
  );

-- Leases scoped for org staff
DROP POLICY IF EXISTS "Org members can view organization leases" ON public.leases;
DROP POLICY IF EXISTS "Org members can manage organization leases" ON public.leases;

CREATE POLICY "Org members view scoped leases"
  ON public.leases FOR SELECT
  USING (
    tenant_user_id = auth.uid()
    OR private.member_can_access_lease(organization_id, id)
    OR public.is_platform_admin()
  );

CREATE POLICY "Org members manage scoped leases"
  ON public.leases FOR ALL
  USING (
    private.member_can_access_lease(organization_id, id)
    OR public.is_platform_admin()
  )
  WITH CHECK (
    private.member_can_access_lease(organization_id, id)
    OR public.is_platform_admin()
  );

-- Deal cases scoped
DROP POLICY IF EXISTS "Org members can view deal cases" ON public.deal_cases;
DROP POLICY IF EXISTS "Org members can insert deal cases" ON public.deal_cases;
DROP POLICY IF EXISTS "Org members can update deal cases" ON public.deal_cases;

CREATE POLICY "Org members view scoped deal cases"
  ON public.deal_cases FOR SELECT
  USING (
    user_id = auth.uid()
    OR assigned_to = auth.uid()
    OR private.member_can_access_deal_case(organization_id, id)
    OR public.is_platform_admin()
  );

CREATE POLICY "Org members insert deal cases"
  ON public.deal_cases FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR (
      organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.organization_members m
        WHERE m.organization_id = deal_cases.organization_id
          AND m.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Org members update scoped deal cases"
  ON public.deal_cases FOR UPDATE
  USING (
    private.member_can_access_deal_case(organization_id, id)
    OR public.is_platform_admin()
  )
  WITH CHECK (
    private.member_can_access_deal_case(organization_id, id)
    OR public.is_platform_admin()
  );

-- Estate work orders: assigned contractors
DROP POLICY IF EXISTS "Estate staff can manage work orders" ON public.estate_work_orders;
CREATE POLICY "Estate staff can manage work orders"
  ON public.estate_work_orders FOR ALL
  USING (
    private.is_estate_staff(estate_id)
    OR assigned_to_user_id = auth.uid()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    private.is_estate_staff(estate_id)
    OR assigned_to_user_id = auth.uid()
    OR public.is_platform_admin()
  );

COMMENT ON TABLE public.organization_units IS 'Business units, regions, and portfolios within an organization.';
COMMENT ON TABLE public.external_access_grants IS 'Magic-link scoped access for external contractors without full workspace membership.';
