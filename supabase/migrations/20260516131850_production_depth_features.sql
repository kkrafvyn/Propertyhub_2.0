-- Production-depth feature bundle:
-- 1. Persisted AI concierge conversations
-- 2. Shared buying groups and comments
-- 3. Escrow/payment milestone tracking
-- 4. Product analytics events
-- 5. CRM automation tasks
-- 6. Richer listing media metadata
-- 7. Trust verification review audit trail

ALTER TABLE public.property_media
  ADD COLUMN IF NOT EXISTS media_type TEXT NOT NULL DEFAULT 'photo',
  ADD COLUMN IF NOT EXISTS room_label TEXT,
  ADD COLUMN IF NOT EXISTS caption TEXT,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS external_embed_url TEXT,
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'ready',
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.property_media
  DROP CONSTRAINT IF EXISTS property_media_media_type_check;

ALTER TABLE public.property_media
  ADD CONSTRAINT property_media_media_type_check
  CHECK (media_type IN ('photo', 'video', 'floor_plan', 'virtual_tour', 'document', 'other'));

ALTER TABLE public.property_media
  DROP CONSTRAINT IF EXISTS property_media_processing_status_check;

ALTER TABLE public.property_media
  ADD CONSTRAINT property_media_processing_status_check
  CHECK (processing_status IN ('pending', 'processing', 'ready', 'failed'));

CREATE INDEX IF NOT EXISTS idx_property_media_type
ON public.property_media(property_id, media_type, sort_order);

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'property-media',
  'property-media',
  TRUE,
  104857600,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.ai_concierge_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_concierge_user_created
ON public.ai_concierge_conversations(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_concierge_listing
ON public.ai_concierge_conversations(listing_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.buyer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  share_code TEXT NOT NULL UNIQUE DEFAULT left(replace(gen_random_uuid()::text, '-', ''), 16),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_groups_owner
ON public.buyer_groups(owner_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_buyer_groups_deal_case
ON public.buyer_groups(deal_case_id);

CREATE TABLE IF NOT EXISTS public.buyer_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.buyer_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'family_reviewer' CHECK (
    role IN ('buyer', 'family_reviewer', 'legal_reviewer', 'local_representative', 'advisor')
  ),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (
    status IN ('invited', 'accepted', 'declined', 'removed')
  ),
  invited_by_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  note TEXT,
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, email)
);

CREATE INDEX IF NOT EXISTS idx_buyer_group_members_group
ON public.buyer_group_members(group_id, status);

CREATE INDEX IF NOT EXISTS idx_buyer_group_members_user
ON public.buyer_group_members(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS public.buyer_group_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.buyer_groups(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  author_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'group' CHECK (visibility IN ('group', 'buyer_only', 'legal_only')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_buyer_group_comments_group_created
ON public.buyer_group_comments(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.escrow_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_case_id UUID NOT NULL REFERENCES public.deal_cases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (
    milestone_type IN (
      'identity_agency_check',
      'viewing_walkthrough',
      'offer_terms',
      'document_review',
      'protected_payment',
      'handoff',
      'custom'
    )
  ),
  label TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'in_progress', 'completed', 'blocked', 'waived')
  ),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  amount_minor INTEGER CHECK (amount_minor IS NULL OR amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  release_conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (deal_case_id, milestone_type)
);

CREATE INDEX IF NOT EXISTS idx_escrow_milestones_deal_case
ON public.escrow_milestones(deal_case_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_escrow_milestones_org
ON public.escrow_milestones(organization_id, status, due_at);

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'web',
  session_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_org_created
ON public.analytics_events(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_listing_type
ON public.analytics_events(listing_id, event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_created
ON public.analytics_events(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES public.aggregated_leads(id) ON DELETE SET NULL,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  task_type TEXT NOT NULL CHECK (
    task_type IN (
      'hot_lead_follow_up',
      'stale_deal_nudge',
      'viewing_confirmation',
      'payment_follow_up',
      'document_follow_up',
      'custom'
    )
  ),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'snoozed', 'cancelled')),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_org_status_due
ON public.crm_tasks(organization_id, status, due_at);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_assignee
ON public.crm_tasks(assigned_to, status, due_at);

CREATE TABLE IF NOT EXISTS public.trust_review_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.trust_verification_requests(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN ('submitted', 'assigned', 'in_review', 'needs_changes', 'verified', 'rejected', 'comment')
  ),
  note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trust_review_events_request_created
ON public.trust_review_events(request_id, created_at DESC);

ALTER TABLE public.ai_concierge_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buyer_group_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_review_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_concierge_conversations FROM anon, authenticated;
REVOKE ALL ON public.buyer_groups FROM anon, authenticated;
REVOKE ALL ON public.buyer_group_members FROM anon, authenticated;
REVOKE ALL ON public.buyer_group_comments FROM anon, authenticated;
REVOKE ALL ON public.escrow_milestones FROM anon, authenticated;
REVOKE ALL ON public.analytics_events FROM anon, authenticated;
REVOKE ALL ON public.crm_tasks FROM anon, authenticated;
REVOKE ALL ON public.trust_review_events FROM anon, authenticated;

GRANT SELECT, INSERT ON public.ai_concierge_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.buyer_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.buyer_group_members TO authenticated;
GRANT SELECT, INSERT ON public.buyer_group_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.escrow_milestones TO authenticated;
GRANT SELECT, INSERT ON public.analytics_events TO authenticated;
GRANT INSERT ON public.analytics_events TO anon;
GRANT SELECT, INSERT, UPDATE ON public.crm_tasks TO authenticated;
GRANT SELECT, INSERT ON public.trust_review_events TO authenticated;

DROP POLICY IF EXISTS "Users can manage their AI concierge conversations" ON public.ai_concierge_conversations;
CREATE POLICY "Users can manage their AI concierge conversations"
ON public.ai_concierge_conversations FOR ALL
TO authenticated
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Buying group participants can view groups" ON public.buyer_groups;
CREATE POLICY "Buying group participants can view groups"
ON public.buyer_groups FOR SELECT
TO authenticated
USING (
  owner_user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.buyer_group_members member
    WHERE member.group_id = buyer_groups.id
      AND (
        member.user_id = (SELECT auth.uid())
        OR lower(member.email) = lower(COALESCE((SELECT auth.jwt()->>'email'), ''))
      )
      AND member.status <> 'removed'
  )
);

DROP POLICY IF EXISTS "Users can create buying groups" ON public.buyer_groups;
CREATE POLICY "Users can create buying groups"
ON public.buyer_groups FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Buying group owners can update groups" ON public.buyer_groups;
CREATE POLICY "Buying group owners can update groups"
ON public.buyer_groups FOR UPDATE
TO authenticated
USING (owner_user_id = (SELECT auth.uid()))
WITH CHECK (owner_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Buying group participants can view members" ON public.buyer_group_members;
CREATE POLICY "Buying group participants can view members"
ON public.buyer_group_members FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR lower(email) = lower(COALESCE((SELECT auth.jwt()->>'email'), ''))
  OR
  EXISTS (
    SELECT 1
    FROM public.buyer_groups grp
    WHERE grp.id = buyer_group_members.group_id
      AND grp.owner_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Buying group owners can invite members" ON public.buyer_group_members;
CREATE POLICY "Buying group owners can invite members"
ON public.buyer_group_members FOR INSERT
TO authenticated
WITH CHECK (
  invited_by_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.buyer_groups grp
    WHERE grp.id = buyer_group_members.group_id
      AND grp.owner_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Buying group members can update own membership" ON public.buyer_group_members;
CREATE POLICY "Buying group members can update own membership"
ON public.buyer_group_members FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR lower(email) = lower(COALESCE((SELECT auth.jwt()->>'email'), ''))
  OR EXISTS (
    SELECT 1
    FROM public.buyer_groups grp
    WHERE grp.id = buyer_group_members.group_id
      AND grp.owner_user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR lower(email) = lower(COALESCE((SELECT auth.jwt()->>'email'), ''))
  OR EXISTS (
    SELECT 1
    FROM public.buyer_groups grp
    WHERE grp.id = buyer_group_members.group_id
      AND grp.owner_user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Buying group participants can view comments" ON public.buyer_group_comments;
CREATE POLICY "Buying group participants can view comments"
ON public.buyer_group_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.buyer_groups grp
    WHERE grp.id = buyer_group_comments.group_id
      AND (
        grp.owner_user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.buyer_group_members member
          WHERE member.group_id = grp.id
            AND (
              member.user_id = (SELECT auth.uid())
              OR lower(member.email) = lower(COALESCE((SELECT auth.jwt()->>'email'), ''))
            )
            AND member.status <> 'removed'
        )
      )
  )
);

DROP POLICY IF EXISTS "Buying group participants can create comments" ON public.buyer_group_comments;
CREATE POLICY "Buying group participants can create comments"
ON public.buyer_group_comments FOR INSERT
TO authenticated
WITH CHECK (
  author_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.buyer_groups grp
    WHERE grp.id = buyer_group_comments.group_id
      AND (
        grp.owner_user_id = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.buyer_group_members member
          WHERE member.group_id = grp.id
            AND (
              member.user_id = (SELECT auth.uid())
              OR lower(member.email) = lower(COALESCE((SELECT auth.jwt()->>'email'), ''))
            )
            AND member.status IN ('invited', 'accepted')
        )
      )
  )
);

DROP POLICY IF EXISTS "Escrow milestones are visible to buyers and organization members" ON public.escrow_milestones;
CREATE POLICY "Escrow milestones are visible to buyers and organization members"
ON public.escrow_milestones FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = escrow_milestones.organization_id
      AND membership.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Escrow milestones can be created by buyers or organization members" ON public.escrow_milestones;
CREATE POLICY "Escrow milestones can be created by buyers or organization members"
ON public.escrow_milestones FOR INSERT
TO authenticated
WITH CHECK (
  created_by = (SELECT auth.uid())
  AND (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.organization_members membership
      WHERE membership.organization_id = escrow_milestones.organization_id
        AND membership.user_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Escrow milestones can be updated by buyers or organization members" ON public.escrow_milestones;
CREATE POLICY "Escrow milestones can be updated by buyers or organization members"
ON public.escrow_milestones FOR UPDATE
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = escrow_milestones.organization_id
      AND membership.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = escrow_milestones.organization_id
      AND membership.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert own analytics events" ON public.analytics_events;
CREATE POLICY "Users can insert own analytics events"
ON public.analytics_events FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Anonymous visitors can insert public analytics events" ON public.analytics_events;
CREATE POLICY "Anonymous visitors can insert public analytics events"
ON public.analytics_events FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "Users and org members can view relevant analytics events" ON public.analytics_events;
CREATE POLICY "Users and org members can view relevant analytics events"
ON public.analytics_events FOR SELECT
TO authenticated
USING (
  user_id = (SELECT auth.uid())
  OR (
    organization_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.organization_members membership
      WHERE membership.organization_id = analytics_events.organization_id
        AND membership.user_id = (SELECT auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "Organization members can manage CRM tasks" ON public.crm_tasks;
CREATE POLICY "Organization members can manage CRM tasks"
ON public.crm_tasks FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = crm_tasks.organization_id
      AND membership.user_id = (SELECT auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = crm_tasks.organization_id
      AND membership.user_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Trust review events are visible to request participants" ON public.trust_review_events;
CREATE POLICY "Trust review events are visible to request participants"
ON public.trust_review_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trust_verification_requests request
    WHERE request.id = trust_review_events.request_id
      AND (
        request.submitted_by = (SELECT auth.uid())
        OR EXISTS (
          SELECT 1
          FROM public.organization_members membership
          WHERE membership.organization_id = trust_review_events.organization_id
            AND membership.user_id = (SELECT auth.uid())
        )
      )
  )
);

DROP POLICY IF EXISTS "Organization members can create trust review events" ON public.trust_review_events;
CREATE POLICY "Organization members can create trust review events"
ON public.trust_review_events FOR INSERT
TO authenticated
WITH CHECK (
  actor_user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = trust_review_events.organization_id
      AND membership.user_id = (SELECT auth.uid())
  )
);

DROP TRIGGER IF EXISTS set_buyer_groups_updated_at ON public.buyer_groups;
CREATE TRIGGER set_buyer_groups_updated_at
BEFORE UPDATE ON public.buyer_groups
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_buyer_group_members_updated_at ON public.buyer_group_members;
CREATE TRIGGER set_buyer_group_members_updated_at
BEFORE UPDATE ON public.buyer_group_members
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_escrow_milestones_updated_at ON public.escrow_milestones;
CREATE TRIGGER set_escrow_milestones_updated_at
BEFORE UPDATE ON public.escrow_milestones
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_crm_tasks_updated_at ON public.crm_tasks;
CREATE TRIGGER set_crm_tasks_updated_at
BEFORE UPDATE ON public.crm_tasks
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

COMMENT ON TABLE public.ai_concierge_conversations IS 'Persisted AI concierge prompts and responses scoped to buyer context.';
COMMENT ON TABLE public.buyer_groups IS 'Shared buyer shortlist/deal-room collaboration spaces.';
COMMENT ON TABLE public.buyer_group_members IS 'Invited family, legal, local representative, and advisor participants for buyer groups.';
COMMENT ON TABLE public.buyer_group_comments IS 'Collaborative notes and decision trail for buyer groups.';
COMMENT ON TABLE public.escrow_milestones IS 'Buyer-safe transaction milestone tracking before payment release or handoff.';
COMMENT ON TABLE public.analytics_events IS 'First-party funnel, listing, mobile, and workspace product analytics events.';
COMMENT ON TABLE public.crm_tasks IS 'Agent CRM task queue generated from hot leads, stale deal rooms, viewing, payment, and document gaps.';
COMMENT ON TABLE public.trust_review_events IS 'Audit trail for KYC, title, address, and verification review decisions.';

NOTIFY pgrst, 'reload schema';
