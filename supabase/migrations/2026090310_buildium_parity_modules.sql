-- Buildium parity modules: HOA, CAM, 1099, trust accounting, commercial escalations,
-- extended screening, owner portal access, integration catalog, eSignature public signing.

-- ── HOA / Association ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.hoa_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estate_id UUID REFERENCES public.managed_estates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  legal_name TEXT,
  address TEXT,
  board_contact_email TEXT,
  monthly_dues_minor BIGINT NOT NULL DEFAULT 0 CHECK (monthly_dues_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency) = 3),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'dissolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hoa_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID NOT NULL REFERENCES public.hoa_associations(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES public.estate_units(id) ON DELETE SET NULL,
  member_name TEXT NOT NULL,
  member_email TEXT,
  member_phone TEXT,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'board_member', 'president', 'treasurer', 'resident')),
  voting_weight INTEGER NOT NULL DEFAULT 1 CHECK (voting_weight >= 0),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'delinquent')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hoa_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID NOT NULL REFERENCES public.hoa_associations(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.hoa_members(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.estate_units(id) ON DELETE SET NULL,
  violation_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'notice_sent', 'cured', 'fined', 'closed', 'appealed')),
  fine_minor BIGINT NOT NULL DEFAULT 0 CHECK (fine_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency) = 3),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date DATE,
  resolved_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hoa_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  association_id UUID NOT NULL REFERENCES public.hoa_associations(id) ON DELETE CASCADE,
  period_label TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_amount_minor BIGINT NOT NULL CHECK (total_amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency) = 3),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'partially_collected', 'collected', 'void')),
  due_date DATE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.hoa_assessment_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.hoa_assessments(id) ON DELETE CASCADE,
  member_id UUID REFERENCES public.hoa_members(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.estate_units(id) ON DELETE SET NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor >= 0),
  paid_minor BIGINT NOT NULL DEFAULT 0 CHECK (paid_minor >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'waived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── CAM (Common Area Maintenance) billing ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cam_allocation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_expense_minor BIGINT NOT NULL CHECK (total_expense_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS' CHECK (char_length(currency) = 3),
  allocation_method TEXT NOT NULL DEFAULT 'pro_rata_sqft' CHECK (
    allocation_method IN ('pro_rata_sqft', 'equal_share', 'fixed_amount', 'custom')
  ),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'allocated', 'invoiced', 'closed')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cam_allocation_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.cam_allocation_plans(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.estate_units(id) ON DELETE CASCADE,
  square_feet NUMERIC(12, 2) NOT NULL DEFAULT 0,
  share_basis_points INTEGER NOT NULL DEFAULT 0 CHECK (share_basis_points BETWEEN 0 AND 10000),
  allocated_minor BIGINT NOT NULL CHECK (allocated_minor >= 0),
  invoiced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (plan_id, unit_id)
);

-- ── 1099 contractor reporting ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contractor_1099_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
  legal_name TEXT NOT NULL,
  business_name TEXT,
  tax_id TEXT NOT NULL,
  tax_id_type TEXT NOT NULL DEFAULT 'ein' CHECK (tax_id_type IN ('ein', 'ssn', 'tin', 'other')),
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state_region TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'US',
  receives_1099 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, tax_id)
);

CREATE TABLE IF NOT EXISTS public.contractor_1099_filings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.contractor_1099_profiles(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL CHECK (tax_year BETWEEN 2000 AND 2100),
  total_paid_minor BIGINT NOT NULL DEFAULT 0 CHECK (total_paid_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'filed', 'accepted', 'rejected', 'corrected')),
  filed_at TIMESTAMPTZ,
  irs_reference TEXT,
  export_format TEXT CHECK (export_format IN ('irs_fire', 'csv', 'pdf')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (profile_id, tax_year)
);

-- ── US-style trust accounting ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trust_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estate_id UUID REFERENCES public.managed_estates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'tenant_security' CHECK (
    account_type IN ('tenant_security', 'owner_reserve', 'operating_segregated', 'escrow', 'other')
  ),
  bank_name TEXT,
  masked_account_number TEXT,
  balance_minor BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK (char_length(currency) = 3),
  gl_account_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.trust_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trust_account_id UUID NOT NULL REFERENCES public.trust_accounts(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('deposit', 'disbursement', 'transfer_in', 'transfer_out', 'adjustment')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor <> 0),
  balance_after_minor BIGINT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  memo TEXT,
  posted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Commercial lease escalations ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.commercial_lease_escalations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID NOT NULL REFERENCES public.leases(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  escalation_type TEXT NOT NULL CHECK (
    escalation_type IN ('fixed_amount', 'percentage', 'cpi', 'market_review', 'step_rent')
  ),
  value_basis_points INTEGER CHECK (value_basis_points IS NULL OR value_basis_points BETWEEN 0 AND 10000),
  amount_minor BIGINT CHECK (amount_minor IS NULL OR amount_minor >= 0),
  new_rent_minor BIGINT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'applied', 'skipped', 'cancelled')),
  applied_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Extended tenant screening checks ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_screening_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  screening_id UUID REFERENCES public.estate_lease_screenings(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.estate_lease_applications(id) ON DELETE SET NULL,
  check_type TEXT NOT NULL CHECK (check_type IN ('credit', 'criminal', 'eviction', 'income', 'identity')),
  provider TEXT NOT NULL,
  provider_reference TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'submitted', 'completed', 'manual_review', 'failed', 'cancelled')
  ),
  recommendation TEXT CHECK (recommendation IN ('clear', 'review', 'decline')),
  result_summary TEXT,
  result_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Stakeholder portal access (owner / board branded URLs) ───────────────────
CREATE TABLE IF NOT EXISTS public.stakeholder_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estate_id UUID REFERENCES public.managed_estates(id) ON DELETE SET NULL,
  portal_type TEXT NOT NULL CHECK (portal_type IN ('owner', 'board', 'vendor', 'resident')),
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Integration marketplace catalog ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integration_catalog (
  slug TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  provider_website TEXT,
  requires_credentials BOOLEAN NOT NULL DEFAULT TRUE,
  supported_regions TEXT[] NOT NULL DEFAULT ARRAY['global'],
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  catalog_slug TEXT NOT NULL REFERENCES public.integration_catalog(slug) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'available' CHECK (
    status IN ('available', 'connected', 'paused', 'error', 'disconnected')
  ),
  config JSONB NOT NULL DEFAULT '{}'::JSONB,
  connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, catalog_slug)
);

-- Seed integration catalog
INSERT INTO public.integration_catalog (slug, name, category, description, requires_credentials, supported_regions, sort_order) VALUES
  ('transunion-smartmove', 'TransUnion SmartMove', 'screening', 'Credit, criminal, and eviction screening for US applicants.', TRUE, ARRAY['US'], 10),
  ('plaid-bank-feed', 'Plaid Bank Feed', 'accounting', 'Automated bank transaction import and reconciliation.', TRUE, ARRAY['US', 'CA', 'GB'], 20),
  ('mono-bank-feed', 'Mono (Africa)', 'accounting', 'Bank feed connectivity for Ghana and Nigeria accounts.', TRUE, ARRAY['GH', 'NG'], 21),
  ('docusign', 'DocuSign', 'documents', 'Legally binding eSignatures with audit trail.', TRUE, ARRAY['global'], 30),
  ('zillow-syndication', 'Zillow Rental Manager', 'syndication', 'Syndicate rental listings to Zillow and Trulia.', TRUE, ARRAY['US'], 40),
  ('mls-rets', 'MLS / RETS Feed', 'syndication', 'Two-way MLS listing sync via RETS or RESO Web API.', TRUE, ARRAY['US'], 41),
  ('stripe-ach', 'Stripe ACH', 'payments', 'US ACH rent collection and payouts.', TRUE, ARRAY['US'], 50),
  ('twilio-sms', 'Twilio SMS', 'communications', 'Transactional SMS for rent reminders and maintenance.', TRUE, ARRAY['global'], 60),
  ('whatsapp-business', 'WhatsApp Business', 'communications', 'Two-way WhatsApp messaging for tenants and vendors.', TRUE, ARRAY['global'], 61),
  ('quickbooks', 'QuickBooks Online', 'accounting', 'Sync chart of accounts, bills, and payments.', TRUE, ARRAY['US'], 70),
  ('xero', 'Xero', 'accounting', 'Accounting export and reconciliation sync.', TRUE, ARRAY['global'], 71),
  ('payangels', 'PayAngels', 'payments', 'Ghana payment collection and disbursements.', TRUE, ARRAY['GH'], 80),
  ('momo-mtn', 'MTN MoMo', 'payments', 'Mobile Money collections and contractor payouts.', TRUE, ARRAY['GH'], 81),
  ('openai', 'OpenAI / AI Copilot', 'ai', 'Lease analysis, yield prediction, and workflow agents.', TRUE, ARRAY['global'], 90),
  ('ghana-trust', 'Ghana Trust Center', 'compliance', 'Local KYC and property verification workflows.', FALSE, ARRAY['GH'], 100)
ON CONFLICT (slug) DO NOTHING;

-- ── eSignature public signing support ────────────────────────────────────────
ALTER TABLE public.esignature_requests
  ADD COLUMN IF NOT EXISTS document_name TEXT,
  ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS public_sign_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS void_reason TEXT;

CREATE INDEX IF NOT EXISTS esignature_public_token_idx ON public.esignature_requests(public_sign_token);
CREATE INDEX IF NOT EXISTS hoa_associations_org_idx ON public.hoa_associations(organization_id);
CREATE INDEX IF NOT EXISTS cam_plans_org_estate_idx ON public.cam_allocation_plans(organization_id, estate_id);
CREATE INDEX IF NOT EXISTS trust_accounts_org_idx ON public.trust_accounts(organization_id);
CREATE INDEX IF NOT EXISTS screening_checks_org_idx ON public.tenant_screening_checks(organization_id, check_type);
CREATE INDEX IF NOT EXISTS portal_access_token_idx ON public.stakeholder_portal_access(access_token);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.hoa_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoa_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoa_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoa_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoa_assessment_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cam_allocation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cam_allocation_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_1099_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_1099_filings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trust_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commercial_lease_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_screening_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stakeholder_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members manage HOA associations" ON public.hoa_associations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = hoa_associations.organization_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = hoa_associations.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Org members manage HOA members" ON public.hoa_members FOR ALL
  USING (EXISTS (SELECT 1 FROM public.hoa_associations a JOIN public.organization_members m ON m.organization_id = a.organization_id WHERE a.id = hoa_members.association_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hoa_associations a JOIN public.organization_members m ON m.organization_id = a.organization_id WHERE a.id = hoa_members.association_id AND m.user_id = auth.uid()));

CREATE POLICY "Org members manage HOA violations" ON public.hoa_violations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.hoa_associations a JOIN public.organization_members m ON m.organization_id = a.organization_id WHERE a.id = hoa_violations.association_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hoa_associations a JOIN public.organization_members m ON m.organization_id = a.organization_id WHERE a.id = hoa_violations.association_id AND m.user_id = auth.uid()));

CREATE POLICY "Org members manage HOA assessments" ON public.hoa_assessments FOR ALL
  USING (EXISTS (SELECT 1 FROM public.hoa_associations a JOIN public.organization_members m ON m.organization_id = a.organization_id WHERE a.id = hoa_assessments.association_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.hoa_associations a JOIN public.organization_members m ON m.organization_id = a.organization_id WHERE a.id = hoa_assessments.association_id AND m.user_id = auth.uid()));

CREATE POLICY "Org members manage HOA assessment lines" ON public.hoa_assessment_lines FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.hoa_assessments s
    JOIN public.hoa_associations a ON a.id = s.association_id
    JOIN public.organization_members m ON m.organization_id = a.organization_id
    WHERE s.id = hoa_assessment_lines.assessment_id AND m.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.hoa_assessments s
    JOIN public.hoa_associations a ON a.id = s.association_id
    JOIN public.organization_members m ON m.organization_id = a.organization_id
    WHERE s.id = hoa_assessment_lines.assessment_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Org members manage CAM plans" ON public.cam_allocation_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = cam_allocation_plans.organization_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = cam_allocation_plans.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Org members manage CAM lines" ON public.cam_allocation_lines FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.cam_allocation_plans p
    JOIN public.organization_members m ON m.organization_id = p.organization_id
    WHERE p.id = cam_allocation_lines.plan_id AND m.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cam_allocation_plans p
    JOIN public.organization_members m ON m.organization_id = p.organization_id
    WHERE p.id = cam_allocation_lines.plan_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Org members manage 1099 profiles" ON public.contractor_1099_profiles FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = contractor_1099_profiles.organization_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = contractor_1099_profiles.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Org members manage 1099 filings" ON public.contractor_1099_filings FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = contractor_1099_filings.organization_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = contractor_1099_filings.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Org members manage trust accounts" ON public.trust_accounts FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = trust_accounts.organization_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = trust_accounts.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Org members manage trust ledger" ON public.trust_ledger_entries FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.trust_accounts t
    JOIN public.organization_members m ON m.organization_id = t.organization_id
    WHERE t.id = trust_ledger_entries.trust_account_id AND m.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.trust_accounts t
    JOIN public.organization_members m ON m.organization_id = t.organization_id
    WHERE t.id = trust_ledger_entries.trust_account_id AND m.user_id = auth.uid()
  ));

CREATE POLICY "Org members manage commercial escalations" ON public.commercial_lease_escalations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = commercial_lease_escalations.organization_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = commercial_lease_escalations.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Org members manage screening checks" ON public.tenant_screening_checks FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = tenant_screening_checks.organization_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = tenant_screening_checks.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Org members manage portal access" ON public.stakeholder_portal_access FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = stakeholder_portal_access.organization_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = stakeholder_portal_access.organization_id AND m.user_id = auth.uid()));

CREATE POLICY "Anyone can read integration catalog" ON public.integration_catalog FOR SELECT USING (is_active = TRUE);
CREATE POLICY "Org members manage integrations" ON public.organization_integrations FOR ALL
  USING (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = organization_integrations.organization_id AND m.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.organization_members m WHERE m.organization_id = organization_integrations.organization_id AND m.user_id = auth.uid()));

GRANT SELECT ON public.integration_catalog TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.hoa_associations, public.hoa_members, public.hoa_violations, public.hoa_assessments, public.hoa_assessment_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cam_allocation_plans, public.cam_allocation_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.contractor_1099_profiles, public.contractor_1099_filings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.trust_accounts, public.trust_ledger_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.commercial_lease_escalations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tenant_screening_checks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.stakeholder_portal_access TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.organization_integrations TO authenticated;

-- ── Public RPCs (token-based, no auth required) ──────────────────────────────
CREATE OR REPLACE FUNCTION public.get_esignature_for_signing(p_token TEXT)
RETURNS TABLE (
  id UUID, document_name TEXT, document_type TEXT, document_url TEXT,
  status TEXT, signers JSONB, expires_at TIMESTAMPTZ, organization_id UUID
)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT e.id, e.document_name, e.document_type, e.document_url, e.status, e.signers, e.expires_at, e.organization_id
  FROM public.esignature_requests e
  WHERE e.public_sign_token = p_token
    AND e.status IN ('sent', 'viewed', 'partially_signed')
    AND (e.expires_at IS NULL OR e.expires_at > NOW());
$$;

CREATE OR REPLACE FUNCTION public.sign_esignature_document(
  p_token TEXT,
  p_signer_email TEXT,
  p_signature_name TEXT
)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_row public.esignature_requests%ROWTYPE;
  v_signers JSONB;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  SELECT * INTO v_row FROM public.esignature_requests
  WHERE public_sign_token = p_token
    AND status IN ('sent', 'viewed', 'partially_signed')
    AND (expires_at IS NULL OR expires_at > v_now)
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signing request not found or expired';
  END IF;

  v_signers := COALESCE(v_row.signers, '[]'::JSONB);
  v_signers := (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN lower(s->>'email') = lower(p_signer_email) THEN
          s || jsonb_build_object('signed_at', v_now, 'signature_name', p_signature_name, 'status', 'signed')
        ELSE s
      END
    ), '[]'::JSONB)
    FROM jsonb_array_elements(v_signers) s
  );

  UPDATE public.esignature_requests
  SET signers = v_signers,
      status = CASE WHEN NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_signers) s WHERE COALESCE(s->>'status', 'pending') <> 'signed'
      ) THEN 'completed' ELSE 'partially_signed' END,
      signed_at = CASE WHEN status <> 'completed' THEN v_now ELSE signed_at END,
      completed_at = CASE WHEN NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(v_signers) s WHERE COALESCE(s->>'status', 'pending') <> 'signed'
      ) THEN v_now ELSE completed_at END,
      updated_at = v_now
  WHERE id = v_row.id;

  RETURN jsonb_build_object('success', TRUE, 'status', (SELECT status FROM public.esignature_requests WHERE id = v_row.id));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_owner_portal_snapshot(p_token TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_access public.stakeholder_portal_access%ROWTYPE;
  v_estate JSONB;
  v_units JSONB;
BEGIN
  SELECT * INTO v_access FROM public.stakeholder_portal_access
  WHERE access_token = p_token AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW());

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Portal access not found or expired';
  END IF;

  UPDATE public.stakeholder_portal_access SET last_accessed_at = NOW() WHERE id = v_access.id;

  IF v_access.estate_id IS NOT NULL THEN
    SELECT to_jsonb(e.*) INTO v_estate FROM public.managed_estates e WHERE e.id = v_access.estate_id;
    SELECT COALESCE(jsonb_agg(to_jsonb(u.*)), '[]'::JSONB) INTO v_units
    FROM public.estate_units u WHERE u.estate_id = v_access.estate_id;
  END IF;

  RETURN jsonb_build_object(
    'portal_type', v_access.portal_type,
    'contact_name', v_access.contact_name,
    'contact_email', v_access.contact_email,
    'estate', v_estate,
    'units', COALESCE(v_units, '[]'::JSONB)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_esignature_for_signing(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sign_esignature_document(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_owner_portal_snapshot(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_esignature_for_signing(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sign_esignature_document(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_owner_portal_snapshot(TEXT) TO anon, authenticated;
