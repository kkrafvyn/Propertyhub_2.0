-- Closes documented product gaps: SOP knowledge base, estate asset registry,
-- data retention + legal holds, owner payout schedules, staff time tracking,
-- and a pseudonymous public transaction verification endpoint.

-- 1) Company SOP knowledge base (tenant-scoped, searched in-app).
CREATE TABLE IF NOT EXISTS public.org_sop_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Operations',
  content TEXT NOT NULL DEFAULT '',
  storage_path TEXT,
  size_kb INTEGER NOT NULL DEFAULT 0 CHECK (size_kb >= 0),
  status TEXT NOT NULL DEFAULT 'indexed' CHECK (status IN ('indexed', 'processing', 'archived')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS org_sop_documents_org_idx ON public.org_sop_documents(organization_id, status, created_at DESC);
ALTER TABLE public.org_sop_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Organization members read SOPs" ON public.org_sop_documents FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = org_sop_documents.organization_id AND m.user_id = auth.uid()));
CREATE POLICY "Organization managers manage SOPs" ON public.org_sop_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = org_sop_documents.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = org_sop_documents.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','manager')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.org_sop_documents TO authenticated;

-- 2) Estate asset registry already exists (2026081511). Add service-due fields
-- used by the Asset Agent without replacing the original schema.
ALTER TABLE public.estate_assets ADD COLUMN IF NOT EXISTS next_service_due DATE;
ALTER TABLE public.estate_assets ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.estate_assets ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- 3) Data retention policies + legal holds (enforced by the retention worker).
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  retention_days INTEGER NOT NULL CHECK (retention_days >= 30),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, entity)
);
CREATE TABLE IF NOT EXISTS public.legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entity TEXT NOT NULL,
  entity_id UUID,
  reason TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS legal_holds_org_active_idx ON public.legal_holds(organization_id, entity) WHERE released_at IS NULL;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.legal_holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers manage retention policies" ON public.data_retention_policies FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = data_retention_policies.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = data_retention_policies.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','manager')));
CREATE POLICY "Managers manage legal holds" ON public.legal_holds FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = legal_holds.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = legal_holds.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','manager')));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_retention_policies, public.legal_holds TO authenticated;

-- 4) Recurring owner payout schedules (worker notifies finance when due).
CREATE TABLE IF NOT EXISTS public.owner_payout_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL DEFAULT 'monthly' CHECK (frequency IN ('monthly','quarterly')),
  day_of_month INTEGER NOT NULL DEFAULT 1 CHECK (day_of_month BETWEEN 1 AND 28),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_on DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (estate_id, owner_user_id)
);
ALTER TABLE public.owner_payout_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages payout schedules" ON public.owner_payout_schedules FOR ALL
  USING (private.can_manage_estate_finance(estate_id)) WITH CHECK (private.can_manage_estate_finance(estate_id));
CREATE POLICY "Owners view their payout schedules" ON public.owner_payout_schedules FOR SELECT
  USING (owner_user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.owner_payout_schedules TO authenticated;

-- 5) Staff time tracking against work (issues / work orders).
CREATE TABLE IF NOT EXISTS public.staff_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES public.estate_issues(id) ON DELETE SET NULL,
  work_date DATE NOT NULL DEFAULT CURRENT_DATE,
  minutes INTEGER NOT NULL CHECK (minutes > 0 AND minutes <= 1440),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS staff_time_entries_org_idx ON public.staff_time_entries(organization_id, work_date DESC);
ALTER TABLE public.staff_time_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff log their own time" ON public.staff_time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = staff_time_entries.organization_id AND m.user_id = auth.uid()));
CREATE POLICY "Staff view own time, managers view all" ON public.staff_time_entries FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = staff_time_entries.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','manager')));
GRANT SELECT, INSERT ON public.staff_time_entries TO authenticated;

-- 6) Public transaction verification: given an exact provider reference,
--    return a pseudonymous receipt (no names, no unit interiors). Powers the
--    public Event Ledger transaction explorer.
CREATE OR REPLACE FUNCTION public.verify_public_transaction(p_reference TEXT)
RETURNS TABLE (
  found BOOLEAN,
  amount_minor BIGINT,
  currency TEXT,
  method TEXT,
  received_at TIMESTAMPTZ,
  unit_pseudonym TEXT
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    TRUE AS found,
    p.amount_minor,
    p.currency,
    p.method,
    p.received_at,
    'BM-UNIT-' || UPPER(RIGHT(p.unit_id::TEXT, 6)) AS unit_pseudonym
  FROM public.unit_payments p
  WHERE p.provider_reference = p_reference
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.verify_public_transaction(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_public_transaction(TEXT) TO anon, authenticated;

-- 7) Org-level AI kill switch + allowlisted tools.
CREATE TABLE IF NOT EXISTS public.ai_org_controls (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  globally_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS public.ai_tool_allowlist (
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tool_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  required_permission TEXT,
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, tool_name)
);
ALTER TABLE public.ai_org_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tool_allowlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view AI org controls" ON public.ai_org_controls FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = ai_org_controls.organization_id AND m.user_id = auth.uid()));
CREATE POLICY "Managers update AI org controls" ON public.ai_org_controls FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = ai_org_controls.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = ai_org_controls.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','manager')));
CREATE POLICY "Members view AI tool allowlist" ON public.ai_tool_allowlist FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = ai_tool_allowlist.organization_id AND m.user_id = auth.uid()));
CREATE POLICY "Managers manage AI tool allowlist" ON public.ai_tool_allowlist FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = ai_tool_allowlist.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = ai_tool_allowlist.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','manager')));
GRANT SELECT, INSERT, UPDATE ON public.ai_org_controls, public.ai_tool_allowlist TO authenticated;

-- 8) Privileged step-up / break-glass sessions (short-lived, audited).
CREATE TABLE IF NOT EXISTS public.privileged_step_up (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL,
  reason TEXT,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS privileged_step_up_user_idx ON public.privileged_step_up(user_id, expires_at DESC);
ALTER TABLE public.privileged_step_up ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own step-up sessions" ON public.privileged_step_up FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE ON public.privileged_step_up TO authenticated;

-- 9) Maintenance calendar events.
CREATE TABLE IF NOT EXISTS public.maintenance_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estate_id UUID REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  event_type TEXT NOT NULL DEFAULT 'planned' CHECK (event_type IN ('planned','preventive','emergency','inspection')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS maintenance_calendar_org_idx ON public.maintenance_calendar_events(organization_id, starts_at);
ALTER TABLE public.maintenance_calendar_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members manage maintenance calendar" ON public.maintenance_calendar_events FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = maintenance_calendar_events.organization_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = maintenance_calendar_events.organization_id AND m.user_id = auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_calendar_events TO authenticated;

-- 10) Owner tax statements (period summaries generated from disbursement runs).
CREATE TABLE IF NOT EXISTS public.owner_tax_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  gross_rent_minor BIGINT NOT NULL DEFAULT 0,
  withholding_tax_minor BIGINT NOT NULL DEFAULT 0,
  net_paid_minor BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GHS',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, owner_user_id, period_start, period_end)
);
ALTER TABLE public.owner_tax_statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Finance manages owner tax statements" ON public.owner_tax_statements FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = owner_tax_statements.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','manager')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = owner_tax_statements.organization_id AND m.user_id = auth.uid() AND m.role IN ('owner','manager')));
CREATE POLICY "Owners view own tax statements" ON public.owner_tax_statements FOR SELECT
  USING (owner_user_id = auth.uid());
GRANT SELECT, INSERT, UPDATE ON public.owner_tax_statements TO authenticated;
