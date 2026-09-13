-- Owner Oversight: management agreements, owner expense approvals, activity RPC.

CREATE TABLE IF NOT EXISTS public.property_management_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  estate_id UUID REFERENCES public.managed_estates(id) ON DELETE SET NULL,
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  managing_organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended')),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  permissions JSONB NOT NULL DEFAULT jsonb_build_object(
    'view_financials', true,
    'view_maintenance', true,
    'view_leases', true,
    'view_tenant_comms', false,
    'approve_expenses', true
  ),
  auto_approve_below_minor BIGINT NOT NULL DEFAULT 100000,
  owner_approve_below_minor BIGINT NOT NULL DEFAULT 500000,
  dual_approve_above_minor BIGINT NOT NULL DEFAULT 500000,
  reporting_cadence TEXT NOT NULL DEFAULT 'daily_digest'
    CHECK (reporting_cadence IN ('daily_digest', 'weekly', 'none')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_property_management_agreements_active
  ON public.property_management_agreements(property_id, owner_user_id, managing_organization_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_pma_owner ON public.property_management_agreements(owner_user_id, status);
CREATE INDEX IF NOT EXISTS idx_pma_org ON public.property_management_agreements(managing_organization_id, status);

ALTER TABLE public.property_management_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners view own management agreements" ON public.property_management_agreements;
CREATE POLICY "Owners view own management agreements"
  ON public.property_management_agreements FOR SELECT
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Org executives manage management agreements" ON public.property_management_agreements;
CREATE POLICY "Org executives manage management agreements"
  ON public.property_management_agreements FOR ALL
  USING (private.org_member_has_permission(managing_organization_id, 'team:manage'))
  WITH CHECK (private.org_member_has_permission(managing_organization_id, 'team:manage'));

GRANT SELECT, INSERT, UPDATE ON public.property_management_agreements TO authenticated;

-- Owner expense / spend approvals (WO quotes, procurement above threshold)
CREATE TABLE IF NOT EXISTS public.owner_expense_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_id UUID NOT NULL REFERENCES public.property_management_agreements(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.estate_work_orders(id) ON DELETE SET NULL,
  issue_id UUID REFERENCES public.estate_issues(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  requested_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_owner_expense_approvals_owner_status
  ON public.owner_expense_approvals(owner_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_owner_expense_approvals_org_status
  ON public.owner_expense_approvals(organization_id, status, created_at DESC);

ALTER TABLE public.owner_expense_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage own expense approvals" ON public.owner_expense_approvals;
CREATE POLICY "Owners manage own expense approvals"
  ON public.owner_expense_approvals FOR SELECT
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Owners review own expense approvals" ON public.owner_expense_approvals;
CREATE POLICY "Owners review own expense approvals"
  ON public.owner_expense_approvals FOR UPDATE
  USING (owner_user_id = auth.uid())
  WITH CHECK (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Org staff manage owner expense approvals" ON public.owner_expense_approvals;
CREATE POLICY "Org staff manage owner expense approvals"
  ON public.owner_expense_approvals FOR ALL
  USING (
    private.org_member_has_permission(organization_id, 'finance:write')
    OR private.org_member_has_permission(organization_id, 'team:manage')
  )
  WITH CHECK (
    private.org_member_has_permission(organization_id, 'finance:write')
    OR private.org_member_has_permission(organization_id, 'team:manage')
  );

GRANT SELECT, INSERT, UPDATE ON public.owner_expense_approvals TO authenticated;

-- Owner notification preferences
CREATE TABLE IF NOT EXISTS public.owner_oversight_notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  immediate_critical_maintenance BOOLEAN NOT NULL DEFAULT TRUE,
  immediate_large_expense BOOLEAN NOT NULL DEFAULT TRUE,
  immediate_payment_failure BOOLEAN NOT NULL DEFAULT TRUE,
  immediate_lease_termination BOOLEAN NOT NULL DEFAULT TRUE,
  daily_digest BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_digest BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.owner_oversight_notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own owner oversight prefs" ON public.owner_oversight_notification_prefs;
CREATE POLICY "Users manage own owner oversight prefs"
  ON public.owner_oversight_notification_prefs FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON public.owner_oversight_notification_prefs TO authenticated;

-- Allow owners to SELECT work orders / issues for properties under active agreements
DROP POLICY IF EXISTS "Owners view agreement work orders" ON public.estate_work_orders;
CREATE POLICY "Owners view agreement work orders"
  ON public.estate_work_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_management_agreements a
      JOIN public.managed_estates e ON e.id = estate_work_orders.estate_id
      WHERE a.owner_user_id = auth.uid()
        AND a.status = 'active'
        AND COALESCE((a.permissions->>'view_maintenance')::boolean, true)
        AND (
          a.estate_id = estate_work_orders.estate_id
          OR (e.property_id IS NOT NULL AND e.property_id = a.property_id)
        )
    )
  );

DROP POLICY IF EXISTS "Owners view agreement estate issues" ON public.estate_issues;
CREATE POLICY "Owners view agreement estate issues"
  ON public.estate_issues FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_management_agreements a
      JOIN public.managed_estates e ON e.id = estate_issues.estate_id
      WHERE a.owner_user_id = auth.uid()
        AND a.status = 'active'
        AND COALESCE((a.permissions->>'view_maintenance')::boolean, true)
        AND (
          a.estate_id = estate_issues.estate_id
          OR (e.property_id IS NOT NULL AND e.property_id = a.property_id)
        )
    )
  );

-- Upsert agreement helper + management mode
CREATE OR REPLACE FUNCTION public.upsert_property_management_agreement(
  p_property_id UUID,
  p_owner_user_id UUID,
  p_managing_organization_id UUID,
  p_estate_id UUID DEFAULT NULL,
  p_management_mode TEXT DEFAULT 'company_managed'
)
RETURNS public.property_management_agreements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.property_management_agreements;
  v_estate_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT (
    auth.uid() = p_owner_user_id
    OR private.org_member_has_permission(p_managing_organization_id, 'team:manage')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  v_estate_id := p_estate_id;
  IF v_estate_id IS NULL THEN
    SELECT id INTO v_estate_id
    FROM public.managed_estates
    WHERE property_id = p_property_id
       OR (organization_id = p_managing_organization_id AND id IN (
         SELECT estate_id FROM public.estate_property_management_modes WHERE owner_user_id = p_owner_user_id
       ))
    LIMIT 1;
  END IF;

  INSERT INTO public.property_management_agreements (
    property_id, estate_id, owner_user_id, managing_organization_id, status
  ) VALUES (
    p_property_id, v_estate_id, p_owner_user_id, p_managing_organization_id, 'active'
  )
  ON CONFLICT DO NOTHING;

  SELECT * INTO v_row
  FROM public.property_management_agreements
  WHERE property_id = p_property_id
    AND owner_user_id = p_owner_user_id
    AND managing_organization_id = p_managing_organization_id
    AND status = 'active'
  LIMIT 1;

  IF v_row.id IS NULL THEN
    -- Unique partial index may not fire ON CONFLICT; fall back to update/insert
    UPDATE public.property_management_agreements
    SET estate_id = COALESCE(v_estate_id, estate_id),
        updated_at = now(),
        status = 'active'
    WHERE property_id = p_property_id
      AND owner_user_id = p_owner_user_id
      AND managing_organization_id = p_managing_organization_id
    RETURNING * INTO v_row;

    IF v_row.id IS NULL THEN
      INSERT INTO public.property_management_agreements (
        property_id, estate_id, owner_user_id, managing_organization_id, status
      ) VALUES (
        p_property_id, v_estate_id, p_owner_user_id, p_managing_organization_id, 'active'
      )
      RETURNING * INTO v_row;
    END IF;
  END IF;

  IF v_estate_id IS NOT NULL AND p_management_mode IN ('self_managed', 'company_managed', 'hybrid') THEN
    INSERT INTO public.estate_property_management_modes (
      estate_id, owner_user_id, management_mode, managing_organization_id, updated_at
    ) VALUES (
      v_estate_id, p_owner_user_id, p_management_mode, p_managing_organization_id, now()
    )
    ON CONFLICT (estate_id) DO UPDATE
      SET management_mode = EXCLUDED.management_mode,
          managing_organization_id = EXCLUDED.managing_organization_id,
          owner_user_id = EXCLUDED.owner_user_id,
          updated_at = now();
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_property_management_agreement(UUID, UUID, UUID, UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_owner_expense_approval(
  p_approval_id UUID,
  p_status TEXT,
  p_review_note TEXT DEFAULT NULL
)
RETURNS public.owner_expense_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.owner_expense_approvals;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;

  SELECT * INTO v_row FROM public.owner_expense_approvals WHERE id = p_approval_id FOR UPDATE;
  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Approval not found';
  END IF;

  IF NOT (
    v_row.owner_user_id = auth.uid()
    OR private.org_member_has_permission(v_row.organization_id, 'team:manage')
    OR private.org_member_has_permission(v_row.organization_id, 'finance:write')
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE public.owner_expense_approvals
  SET status = p_status,
      review_note = NULLIF(trim(COALESCE(p_review_note, '')), ''),
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      updated_at = now()
  WHERE id = p_approval_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_owner_expense_approval(UUID, TEXT, TEXT) TO authenticated;

-- Owner activity feed (no private tenant chats)
CREATE OR REPLACE FUNCTION public.get_owner_property_activity(
  p_owner_user_id UUID DEFAULT NULL,
  p_property_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 40
)
RETURNS TABLE (
  id TEXT,
  event_type TEXT,
  title TEXT,
  detail TEXT,
  amount_minor BIGINT,
  currency TEXT,
  property_id UUID,
  created_at TIMESTAMPTZ,
  href_hint TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID := COALESCE(p_owner_user_id, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF v_owner <> auth.uid() AND NOT public.is_platform_staff() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH owned AS (
    SELECT a.id AS agreement_id, a.property_id, a.estate_id, a.managing_organization_id, a.permissions
    FROM public.property_management_agreements a
    WHERE a.owner_user_id = v_owner
      AND a.status = 'active'
      AND (p_property_id IS NULL OR a.property_id = p_property_id)
  ),
  events AS (
    SELECT
      'statement:' || s.id::text AS id,
      'payment'::text AS event_type,
      'Owner statement ready'::text AS title,
      ('Period ' || s.period_start::text || ' – ' || s.period_end::text)::text AS detail,
      s.net_distributable_minor AS amount_minor,
      s.currency,
      o.property_id,
      s.created_at,
      'financials'::text AS href_hint
    FROM public.estate_owner_statement_runs s
    JOIN owned o ON (o.estate_id = s.estate_id OR TRUE)
    WHERE s.owner_user_id = v_owner
      AND COALESCE((o.permissions->>'view_financials')::boolean, true)

    UNION ALL

    SELECT
      'issue:' || i.id::text,
      'maintenance'::text,
      COALESCE(i.title, 'Maintenance issue'),
      ('Status: ' || COALESCE(i.status, 'open') || ' · Priority: ' || COALESCE(i.priority, 'normal')),
      NULL::BIGINT,
      'GHS'::text,
      o.property_id,
      i.created_at,
      'maintenance'::text
    FROM public.estate_issues i
    JOIN owned o ON (
      o.estate_id = i.estate_id
      OR EXISTS (
        SELECT 1 FROM public.managed_estates e
        WHERE e.id = i.estate_id AND e.property_id = o.property_id
      )
    )
    WHERE COALESCE((o.permissions->>'view_maintenance')::boolean, true)

    UNION ALL

    SELECT
      'wo:' || w.id::text,
      'contractor'::text,
      'Work order update',
      ('Status: ' || w.status || COALESCE(' · ' || left(w.notes, 120), '')),
      COALESCE(w.estimated_cost_minor, w.actual_cost_minor),
      'GHS'::text,
      o.property_id,
      COALESCE(w.updated_at, w.created_at),
      'maintenance'::text
    FROM public.estate_work_orders w
    JOIN owned o ON (
      o.estate_id = w.estate_id
      OR EXISTS (
        SELECT 1 FROM public.managed_estates e
        WHERE e.id = w.estate_id AND e.property_id = o.property_id
      )
    )
    WHERE COALESCE((o.permissions->>'view_maintenance')::boolean, true)

    UNION ALL

    SELECT
      'approval:' || x.id::text,
      'expense'::text,
      x.title,
      COALESCE(x.description, x.status),
      x.amount_minor,
      x.currency,
      x.property_id,
      x.created_at,
      'approvals'::text
    FROM public.owner_expense_approvals x
    WHERE x.owner_user_id = v_owner
      AND (p_property_id IS NULL OR x.property_id = p_property_id)
  )
  SELECT *
  FROM events
  ORDER BY created_at DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 40), 100));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_owner_property_activity(UUID, UUID, INTEGER) TO authenticated;

-- Extend membership approve to scope + agreement when claim attached
CREATE OR REPLACE FUNCTION public.review_organization_membership_request(
  p_request_id UUID,
  p_status TEXT,
  p_review_notes TEXT DEFAULT NULL,
  p_role TEXT DEFAULT NULL
)
RETURNS public.organization_membership_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.organization_membership_requests;
  v_role TEXT;
  v_claim public.property_listing_claims;
  v_property_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid review status';
  END IF;

  SELECT * INTO v_row
  FROM public.organization_membership_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Membership request not found';
  END IF;

  IF NOT private.org_member_has_permission(v_row.organization_id, 'team:manage') THEN
    RAISE EXCEPTION 'Not authorized to review this request';
  END IF;

  v_role := COALESCE(NULLIF(trim(COALESCE(p_role, '')), ''), v_row.requested_role, 'property_owner');

  UPDATE public.organization_membership_requests
  SET
    status = p_status,
    review_notes = NULLIF(trim(COALESCE(p_review_notes, '')), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now(),
    requested_role = v_role
  WHERE id = p_request_id
  RETURNING * INTO v_row;

  IF p_status = 'approved' THEN
    INSERT INTO public.organization_members (organization_id, user_id, role, scope_mode)
    VALUES (
      v_row.organization_id,
      v_row.user_id,
      v_role,
      CASE WHEN v_role = 'property_owner' THEN 'properties' ELSE 'organization' END
    )
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = EXCLUDED.role,
          scope_mode = CASE
            WHEN EXCLUDED.role = 'property_owner' THEN 'properties'
            ELSE organization_members.scope_mode
          END;

    IF v_row.property_listing_claim_id IS NOT NULL THEN
      SELECT * INTO v_claim FROM public.property_listing_claims WHERE id = v_row.property_listing_claim_id;
      IF v_claim.id IS NOT NULL AND v_claim.status = 'approved' THEN
        v_property_id := v_claim.property_id;
        IF v_property_id IS NULL THEN
          SELECT property_id INTO v_property_id FROM public.listings WHERE id = v_claim.listing_id;
        END IF;
        IF v_property_id IS NOT NULL THEN
          INSERT INTO public.organization_member_property_scopes (organization_id, user_id, property_id)
          VALUES (v_row.organization_id, v_row.user_id, v_property_id)
          ON CONFLICT DO NOTHING;

          PERFORM public.upsert_property_management_agreement(
            v_property_id,
            v_row.user_id,
            v_row.organization_id,
            NULL,
            'company_managed'
          );
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN v_row;
END;
$$;
