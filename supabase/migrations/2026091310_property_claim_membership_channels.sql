-- Org executive notification visibility, property listing claims,
-- membership requests, and workspace chat channels.

-- ─── Notifications: optional org scope for executives ───────────────────────
ALTER TABLE public.notification_logs
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notification_logs_organization_created_at
  ON public.notification_logs(organization_id, created_at DESC)
  WHERE organization_id IS NOT NULL;

DROP POLICY IF EXISTS "Org executives can view org member notifications"
  ON public.notification_logs;
CREATE POLICY "Org executives can view org member notifications"
  ON public.notification_logs FOR SELECT
  USING (
    organization_id IS NOT NULL
    AND private.org_member_has_permission(organization_id, 'team:manage')
  );

-- ─── Property listing claims ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.property_listing_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  claimant_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'needs_info', 'approved', 'rejected', 'withdrawn')),
  evidence_storage_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  claimant_note TEXT,
  reviewer_note TEXT,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_property_listing_claims_open
  ON public.property_listing_claims(listing_id, claimant_user_id)
  WHERE status IN ('pending', 'needs_info');

CREATE INDEX IF NOT EXISTS idx_property_listing_claims_org_status
  ON public.property_listing_claims(organization_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_listing_claims_claimant
  ON public.property_listing_claims(claimant_user_id, created_at DESC);

ALTER TABLE public.property_listing_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Claimants manage own property listing claims"
  ON public.property_listing_claims;
CREATE POLICY "Claimants manage own property listing claims"
  ON public.property_listing_claims FOR ALL
  USING (claimant_user_id = auth.uid())
  WITH CHECK (
    claimant_user_id = auth.uid()
    AND status IN ('pending', 'needs_info', 'withdrawn')
  );

DROP POLICY IF EXISTS "Org executives view property listing claims"
  ON public.property_listing_claims;
CREATE POLICY "Org executives view property listing claims"
  ON public.property_listing_claims FOR SELECT
  USING (private.org_member_has_permission(organization_id, 'team:manage'));

DROP POLICY IF EXISTS "Platform staff manage property listing claims"
  ON public.property_listing_claims;
CREATE POLICY "Platform staff manage property listing claims"
  ON public.property_listing_claims FOR ALL
  USING (public.is_platform_staff())
  WITH CHECK (public.is_platform_staff());

GRANT SELECT, INSERT, UPDATE ON public.property_listing_claims TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_property_listing_claim(
  p_listing_id UUID,
  p_claimant_note TEXT DEFAULT NULL,
  p_evidence_storage_paths JSONB DEFAULT '[]'::jsonb
)
RETURNS public.property_listing_claims
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_listing RECORD;
  v_row public.property_listing_claims;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT l.id, l.property_id, l.organization_id
  INTO v_listing
  FROM public.listings l
  WHERE l.id = p_listing_id;

  IF v_listing.id IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  INSERT INTO public.property_listing_claims (
    listing_id,
    property_id,
    organization_id,
    claimant_user_id,
    status,
    evidence_storage_paths,
    claimant_note
  ) VALUES (
    v_listing.id,
    v_listing.property_id,
    v_listing.organization_id,
    auth.uid(),
    'pending',
    COALESCE(p_evidence_storage_paths, '[]'::jsonb),
    NULLIF(trim(COALESCE(p_claimant_note, '')), '')
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.review_property_listing_claim(
  p_claim_id UUID,
  p_status TEXT,
  p_reviewer_note TEXT DEFAULT NULL
)
RETURNS public.property_listing_claims
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.property_listing_claims;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_status NOT IN ('approved', 'rejected', 'needs_info') THEN
    RAISE EXCEPTION 'Invalid review status';
  END IF;

  SELECT * INTO v_row
  FROM public.property_listing_claims
  WHERE id = p_claim_id
  FOR UPDATE;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;

  IF NOT (
    public.is_platform_staff()
    OR private.org_member_has_permission(v_row.organization_id, 'team:manage')
  ) THEN
    RAISE EXCEPTION 'Not authorized to review this claim';
  END IF;

  UPDATE public.property_listing_claims
  SET
    status = p_status,
    reviewer_note = NULLIF(trim(COALESCE(p_reviewer_note, '')), ''),
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    updated_at = now()
  WHERE id = p_claim_id
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_property_listing_claim(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_property_listing_claim(UUID, TEXT, TEXT) TO authenticated;

-- ─── Organization membership requests ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organization_membership_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message TEXT,
  requested_role TEXT NOT NULL DEFAULT 'property_owner',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  property_listing_claim_id UUID REFERENCES public.property_listing_claims(id) ON DELETE SET NULL,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_organization_membership_requests_open
  ON public.organization_membership_requests(organization_id, user_id)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_organization_membership_requests_org_status
  ON public.organization_membership_requests(organization_id, status, created_at DESC);

ALTER TABLE public.organization_membership_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own membership requests"
  ON public.organization_membership_requests;
CREATE POLICY "Users manage own membership requests"
  ON public.organization_membership_requests FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Org executives manage membership requests"
  ON public.organization_membership_requests;
CREATE POLICY "Org executives manage membership requests"
  ON public.organization_membership_requests FOR ALL
  USING (private.org_member_has_permission(organization_id, 'team:manage'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'team:manage'));

GRANT SELECT, INSERT, UPDATE ON public.organization_membership_requests TO authenticated;

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
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (v_row.organization_id, v_row.user_id, v_role)
    ON CONFLICT (organization_id, user_id) DO UPDATE
      SET role = EXCLUDED.role;
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_organization_membership_request(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Attach optional claim id on enrollment requests
ALTER TABLE public.organization_enrollment_requests
  ADD COLUMN IF NOT EXISTS property_listing_claim_id UUID
    REFERENCES public.property_listing_claims(id) ON DELETE SET NULL;

-- ─── Workspace channels (Slack-style) ───────────────────────────────────────
ALTER TABLE public.conversations DROP CONSTRAINT IF EXISTS conversations_conversation_type_check;
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_conversation_type_check
  CHECK (conversation_type IN ('direct', 'group', 'support', 'organization_shared', 'channel'));

CREATE TABLE IF NOT EXISTS public.workspace_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  property_id UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_workspace_channels_org
  ON public.workspace_channels(organization_id, created_at DESC);

ALTER TABLE public.workspace_channels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members view public workspace channels"
  ON public.workspace_channels;
CREATE POLICY "Org members view public workspace channels"
  ON public.workspace_channels FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members m
      WHERE m.organization_id = workspace_channels.organization_id
        AND m.user_id = auth.uid()
    )
    AND (
      is_private = FALSE
      OR EXISTS (
        SELECT 1 FROM public.conversation_participants cp
        WHERE cp.conversation_id = workspace_channels.conversation_id
          AND cp.user_id = auth.uid()
      )
      OR private.org_member_has_permission(organization_id, 'team:manage')
    )
  );

DROP POLICY IF EXISTS "Org executives manage workspace channels"
  ON public.workspace_channels;
CREATE POLICY "Org executives manage workspace channels"
  ON public.workspace_channels FOR ALL
  USING (private.org_member_has_permission(organization_id, 'team:manage'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'team:manage'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_channels TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_default_workspace_channels(p_organization_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slug TEXT;
  v_name TEXT;
  v_desc TEXT;
  v_conversation_id UUID;
  v_defaults TEXT[][] := ARRAY[
    ARRAY['general', 'General', 'Company-wide updates and coordination'],
    ARRAY['maintenance', 'Maintenance', 'Work orders, inspections, and field updates'],
    ARRAY['listings', 'Listings', 'Inventory, marketing, and leasing discussion']
  ];
  v_row TEXT[];
BEGIN
  FOREACH v_row SLICE 1 IN ARRAY v_defaults LOOP
    v_slug := v_row[1];
    v_name := v_row[2];
    v_desc := v_row[3];

    IF EXISTS (
      SELECT 1 FROM public.workspace_channels
      WHERE organization_id = p_organization_id AND slug = v_slug
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.conversations (conversation_type, organization_id)
    VALUES ('channel', p_organization_id)
    RETURNING id INTO v_conversation_id;

    INSERT INTO public.workspace_channels (
      organization_id, conversation_id, slug, name, description, is_private, created_by
    ) VALUES (
      p_organization_id, v_conversation_id, v_slug, v_name, v_desc, FALSE, auth.uid()
    );

    INSERT INTO public.conversation_participants (conversation_id, user_id, participant_role)
    SELECT v_conversation_id, m.user_id, 'member'
    FROM public.organization_members m
    WHERE m.organization_id = p_organization_id
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_default_workspace_channels(UUID) TO authenticated;
