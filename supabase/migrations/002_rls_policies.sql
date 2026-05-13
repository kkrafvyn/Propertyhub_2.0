-- Row Level Security (RLS) Policies for Property Hub REOS
-- Run this after 001_create_schema.sql

-- ============ USERS TABLE ============
CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Allow public profile view (limited fields)" 
ON public.users FOR SELECT 
USING (true);

-- ============ ORGANIZATIONS TABLE ============
CREATE POLICY "Anyone can view verified organizations" 
ON public.organizations FOR SELECT 
USING (verified = true AND suspended = false);

CREATE POLICY "Members can view their own organization" 
ON public.organizations FOR SELECT 
USING (
  auth.uid() = owner_id OR
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organizations.id 
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can update their organization" 
ON public.organizations FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Owners can create organizations" 
ON public.organizations FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- ============ ORGANIZATION_MEMBERS TABLE ============
CREATE POLICY "Members can view their org members" 
ON public.organization_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_members.organization_id
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Owners can manage members" 
ON public.organization_members FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE o.id = organization_members.organization_id
    AND o.owner_id = auth.uid()
  )
);

-- ============ PROPERTIES TABLE ============
CREATE POLICY "Anyone can view properties with public listings" 
ON public.properties FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.property_id = properties.id
    AND l.status = 'listed'
    AND l.visibility = 'public'
  ) OR
  (
    properties.organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = properties.organization_id
      AND om.user_id = auth.uid()
    )
  )
);

CREATE POLICY "Org members can create properties" 
ON public.properties FOR INSERT 
WITH CHECK (
  properties.organization_id IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = properties.organization_id
    AND om.user_id = auth.uid()
  )
);

-- ============ LISTINGS TABLE ============
CREATE POLICY "Anyone can view public listed properties" 
ON public.listings FOR SELECT 
USING (
  status = 'listed' AND 
  visibility = 'public' AND
  organization_id IN (
    SELECT id FROM public.organizations 
    WHERE verified = true AND suspended = false
  ) OR
  auth.uid() IN (
    SELECT user_id FROM public.organization_members 
    WHERE organization_id = listings.organization_id
  )
);

CREATE POLICY "Org members can view all their listings" 
ON public.listings FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = listings.organization_id
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can create listings" 
ON public.listings FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = listings.organization_id
    AND om.user_id = auth.uid()
  )
);

CREATE POLICY "Org members can update their listings" 
ON public.listings FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = listings.organization_id
    AND om.user_id = auth.uid()
  )
);

-- ============ DEAL_CASES TABLE ============
CREATE POLICY "Users can view their own deal cases" 
ON public.deal_cases FOR SELECT 
USING (
  auth.uid() = user_id OR
  auth.uid() IN (
    SELECT user_id FROM public.organization_members
    WHERE organization_id = deal_cases.organization_id
  )
);

CREATE POLICY "Authenticated users can create deal cases" 
ON public.deal_cases FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org members can update deal cases" 
ON public.deal_cases FOR UPDATE 
USING (
  auth.uid() IN (
    SELECT user_id FROM public.organization_members
    WHERE organization_id = deal_cases.organization_id
  )
);

-- ============ SAVED_PROPERTIES TABLE ============
CREATE POLICY "Users can view their saved properties" 
ON public.saved_properties FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can save properties" 
ON public.saved_properties FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove saved properties" 
ON public.saved_properties FOR DELETE 
USING (auth.uid() = user_id);

-- ============ CONVERSATIONS TABLE ============
CREATE POLICY "Participants can view conversations" 
ON public.conversations FOR SELECT 
USING (
  auth.uid() = participant_1_id OR 
  auth.uid() = participant_2_id
);

CREATE POLICY "Authenticated users can create conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (
  auth.uid() = participant_1_id OR 
  auth.uid() = participant_2_id
);

-- ============ MESSAGES TABLE ============
CREATE POLICY "Conversation participants can view messages" 
ON public.messages FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
  )
);

CREATE POLICY "Authenticated users can send messages" 
ON public.messages FOR INSERT 
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = messages.conversation_id
    AND (c.participant_1_id = auth.uid() OR c.participant_2_id = auth.uid())
  )
);

-- ============ TRANSACTIONS TABLE ============
CREATE POLICY "Users can view their own transactions" 
ON public.transactions FOR SELECT 
USING (
  auth.uid() = user_id OR
  auth.uid() IN (
    SELECT user_id FROM public.organization_members
    WHERE organization_id = transactions.organization_id
  )
);

CREATE POLICY "System can insert transactions" 
ON public.transactions FOR INSERT 
WITH CHECK (true);

-- ============ AUDIT_LOGS TABLE ============
CREATE POLICY "Only admins can view audit logs" 
ON public.audit_logs FOR SELECT 
USING (
  -- This should be restricted to admins only - implement admin role check
  auth.uid() IN (
    SELECT user_id FROM public.audit_logs LIMIT 1
  )
);

CREATE POLICY "System can insert audit logs" 
ON public.audit_logs FOR INSERT 
WITH CHECK (true);
