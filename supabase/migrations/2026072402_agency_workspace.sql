-- Agency workspace: contacts CRM, tasks inbox, member permissions

ALTER TABLE public.organization_members
ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.organization_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  source TEXT DEFAULT 'manual',
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'prospect', 'client', 'archived')
  ),
  notes TEXT,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  last_contacted_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organization_contacts_org
  ON public.organization_contacts(organization_id, status);

CREATE TABLE IF NOT EXISTS public.workspace_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  contact_id UUID REFERENCES public.organization_contacts(id) ON DELETE SET NULL,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL DEFAULT 'follow_up' CHECK (
    task_type IN ('follow_up', 'call', 'viewing', 'document', 'payment', 'other')
  ),
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_progress', 'completed', 'cancelled')
  ),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (
    priority IN ('low', 'medium', 'high', 'urgent')
  ),
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workspace_tasks_org_due
  ON public.workspace_tasks(organization_id, status, due_at);

ALTER TABLE public.organization_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members manage contacts" ON public.organization_contacts;
CREATE POLICY "Org members manage contacts" ON public.organization_contacts FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_contacts.organization_id
      AND om.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_contacts.organization_id
      AND om.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Org members manage tasks" ON public.workspace_tasks;
CREATE POLICY "Org members manage tasks" ON public.workspace_tasks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = workspace_tasks.organization_id
      AND om.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = workspace_tasks.organization_id
      AND om.user_id = auth.uid()
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workspace_tasks TO authenticated;
