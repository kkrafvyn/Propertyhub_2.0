-- Shared workspace inbox and invitation-based team onboarding

CREATE TABLE IF NOT EXISTS public.organization_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL UNIQUE REFERENCES public.conversations(id) ON DELETE CASCADE,
  lead_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, lead_user_id)
);

CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'agent', 'analyst')),
  invited_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  accepted_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_organization_conversations_org
ON public.organization_conversations(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_conversations_lead
ON public.organization_conversations(lead_user_id);

CREATE INDEX IF NOT EXISTS idx_organization_conversations_assigned_to
ON public.organization_conversations(assigned_to);

CREATE INDEX IF NOT EXISTS idx_organization_invitations_org
ON public.organization_invitations(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_invitations_email
ON public.organization_invitations(email);

ALTER TABLE public.organization_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_organization_conversations_updated_at
ON public.organization_conversations;

CREATE TRIGGER set_organization_conversations_updated_at
BEFORE UPDATE ON public.organization_conversations
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_organization_invitations_updated_at
ON public.organization_invitations;

CREATE TRIGGER set_organization_invitations_updated_at
BEFORE UPDATE ON public.organization_invitations
FOR EACH ROW
EXECUTE FUNCTION public.set_row_updated_at();

CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.accept_pending_organization_invitation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  UPDATE public.organization_invitations invitation
  SET
    status = 'accepted',
    accepted_user_id = NEW.user_id,
    accepted_at = NOW(),
    updated_at = NOW()
  FROM public.users invited_user
  WHERE invited_user.id = NEW.user_id
    AND invitation.organization_id = NEW.organization_id
    AND LOWER(invitation.email) = LOWER(invited_user.email)
    AND invitation.status = 'pending';

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.accept_pending_organization_invitation() FROM PUBLIC;

DROP TRIGGER IF EXISTS accept_pending_organization_invitation
ON public.organization_members;

CREATE TRIGGER accept_pending_organization_invitation
AFTER INSERT ON public.organization_members
FOR EACH ROW
EXECUTE FUNCTION private.accept_pending_organization_invitation();

CREATE OR REPLACE FUNCTION public.accept_organization_invitation(invitation_id UUID)
RETURNS TABLE (
  organization_id UUID,
  organization_slug TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  matched_invitation public.organization_invitations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT *
  INTO matched_invitation
  FROM public.organization_invitations invitation
  WHERE invitation.id = invitation_id
    AND LOWER(invitation.email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
    AND invitation.status = 'pending'
    AND invitation.expires_at > NOW();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or no longer valid';
  END IF;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (matched_invitation.organization_id, auth.uid(), matched_invitation.role)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  RETURN QUERY
  SELECT organization.id, organization.slug
  FROM public.organizations organization
  WHERE organization.id = matched_invitation.organization_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_organization_invitation(UUID) TO authenticated;

DROP POLICY IF EXISTS "Owners can manage members" ON public.organization_members;

CREATE POLICY "Owners and managers can manage members"
ON public.organization_members FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_members.organization_id
      AND membership.user_id = auth.uid()
      AND membership.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_members.organization_id
      AND membership.user_id = auth.uid()
      AND membership.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Invited users can join organizations"
ON public.organization_members FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1
    FROM public.organization_invitations invitation
    WHERE invitation.organization_id = organization_members.organization_id
      AND LOWER(invitation.email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
      AND invitation.status = 'pending'
      AND invitation.expires_at > NOW()
  )
);

CREATE POLICY "Org members can view shared inbox links"
ON public.organization_conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_conversations.organization_id
      AND membership.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can create shared inbox links"
ON public.organization_conversations FOR INSERT
WITH CHECK (
  auth.uid() = created_by
  AND EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_conversations.organization_id
      AND membership.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can update shared inbox links"
ON public.organization_conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_conversations.organization_id
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_conversations.organization_id
      AND membership.user_id = auth.uid()
  )
);

CREATE POLICY "Owners and managers can view invitations"
ON public.organization_invitations FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_invitations.organization_id
      AND membership.user_id = auth.uid()
      AND membership.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Invitees can view their own invitations"
ON public.organization_invitations FOR SELECT
USING (
  LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);

CREATE POLICY "Owners and managers can create invitations"
ON public.organization_invitations FOR INSERT
WITH CHECK (
  auth.uid() = invited_by
  AND EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_invitations.organization_id
      AND membership.user_id = auth.uid()
      AND membership.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Owners and managers can update invitations"
ON public.organization_invitations FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_invitations.organization_id
      AND membership.user_id = auth.uid()
      AND membership.role IN ('owner', 'manager')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = organization_invitations.organization_id
      AND membership.user_id = auth.uid()
      AND membership.role IN ('owner', 'manager')
  )
);

CREATE POLICY "Org members can view shared inbox conversations"
ON public.conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_conversations shared_conversation
    JOIN public.organization_members membership
      ON membership.organization_id = shared_conversation.organization_id
    WHERE shared_conversation.conversation_id = conversations.id
      AND membership.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can update shared inbox conversations"
ON public.conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_conversations shared_conversation
    JOIN public.organization_members membership
      ON membership.organization_id = shared_conversation.organization_id
    WHERE shared_conversation.conversation_id = conversations.id
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_conversations shared_conversation
    JOIN public.organization_members membership
      ON membership.organization_id = shared_conversation.organization_id
    WHERE shared_conversation.conversation_id = conversations.id
      AND membership.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can view shared inbox messages"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_conversations shared_conversation
    JOIN public.organization_members membership
      ON membership.organization_id = shared_conversation.organization_id
    WHERE shared_conversation.conversation_id = messages.conversation_id
      AND membership.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can send shared inbox messages"
ON public.messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1
    FROM public.organization_conversations shared_conversation
    JOIN public.organization_members membership
      ON membership.organization_id = shared_conversation.organization_id
    WHERE shared_conversation.conversation_id = messages.conversation_id
      AND membership.user_id = auth.uid()
  )
);

CREATE POLICY "Authorized users can update shared inbox messages"
ON public.messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.organization_conversations shared_conversation
    JOIN public.organization_members membership
      ON membership.organization_id = shared_conversation.organization_id
    WHERE shared_conversation.conversation_id = messages.conversation_id
      AND membership.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.organization_conversations shared_conversation
    JOIN public.organization_members membership
      ON membership.organization_id = shared_conversation.organization_id
    WHERE shared_conversation.conversation_id = messages.conversation_id
      AND membership.user_id = auth.uid()
  )
);
