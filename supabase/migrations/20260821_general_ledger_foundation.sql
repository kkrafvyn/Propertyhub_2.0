-- BaytMiftah P0 Phase 1: General Ledger Foundation
-- Implements: Chart of Accounts, Journal Entries, Trial Balance
-- This migration adds financial accounting capability for property management companies

-- Chart of Accounts
CREATE TABLE IF NOT EXISTS public.coa_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
  parent_account_id UUID REFERENCES public.coa_accounts(id) ON DELETE SET NULL,
  balance_type TEXT NOT NULL CHECK (balance_type IN ('DEBIT', 'CREDIT')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, account_code)
);

-- Journal Entries
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  description TEXT NOT NULL,
  reference_number VARCHAR(100),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'POSTED', 'REVERSED', 'VOIDED')),
  posted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,
  reversed_entry_id UUID REFERENCES public.journal_entries(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((status = 'REVERSED') = (reversed_entry_id IS NOT NULL))
);

-- Journal Entry Lines (Debit/Credit)
CREATE TABLE IF NOT EXISTS public.je_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.coa_accounts(id) ON DELETE RESTRICT,
  debit_amount_minor BIGINT CHECK (debit_amount_minor IS NULL OR debit_amount_minor >= 0),
  credit_amount_minor BIGINT CHECK (credit_amount_minor IS NULL OR credit_amount_minor >= 0),
  line_description TEXT,
  allocation_id UUID REFERENCES public.payment_allocations(id) ON DELETE SET NULL,
  charge_id UUID REFERENCES public.unit_charges(id) ON DELETE SET NULL,
  line_number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT (debit_amount_minor IS NULL AND credit_amount_minor IS NULL)),
  CHECK (NOT (debit_amount_minor IS NOT NULL AND credit_amount_minor IS NOT NULL))
);

-- Automatic GL posting configuration (when events occur, create JE automatically)
CREATE TABLE IF NOT EXISTS public.gl_posting_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('charge_created', 'payment_allocated', 'payment_failed', 'invoice_received', 'payable_created')),
  debit_account_id UUID NOT NULL REFERENCES public.coa_accounts(id) ON DELETE RESTRICT,
  credit_account_id UUID NOT NULL REFERENCES public.coa_accounts(id) ON DELETE RESTRICT,
  description_template TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, event_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_coa_org ON public.coa_accounts(organization_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_je_org_date ON public.journal_entries(organization_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_je_status ON public.journal_entries(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_je_lines_account ON public.je_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_gl_rules_org ON public.gl_posting_rules(organization_id) WHERE is_active = TRUE;

-- RLS Policies
ALTER TABLE public.coa_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.je_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gl_posting_rules ENABLE ROW LEVEL SECURITY;

-- Organizations can see their own COA
CREATE POLICY "org_can_read_coa" ON public.coa_accounts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Organizations can manage their own COA (with permission check)
CREATE POLICY "org_can_manage_coa" ON public.coa_accounts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Organizations can read their journal entries
CREATE POLICY "org_can_read_je" ON public.journal_entries
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Finance role can post journal entries
CREATE POLICY "finance_can_post_je" ON public.journal_entries
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'finance')
    )
  );

-- Organizations can read JE lines
CREATE POLICY "org_can_read_je_lines" ON public.je_lines
  FOR SELECT USING (
    journal_entry_id IN (
      SELECT id FROM public.journal_entries 
      WHERE organization_id IN (
        SELECT organization_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Organizations can read GL rules
CREATE POLICY "org_can_read_gl_rules" ON public.gl_posting_rules
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Finance can manage GL rules
CREATE POLICY "finance_can_manage_gl_rules" ON public.gl_posting_rules
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'finance')
    )
  );

-- Add default COA accounts for new organizations via trigger
CREATE OR REPLACE FUNCTION public.create_default_coa_accounts()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.coa_accounts (organization_id, account_code, account_name, account_type, balance_type, description)
  VALUES
    -- Assets
    (NEW.id, '1000', 'Cash', 'ASSET', 'DEBIT', 'Cash on hand and in bank'),
    (NEW.id, '1100', 'Bank Account', 'ASSET', 'DEBIT', 'Organization bank account'),
    (NEW.id, '1200', 'Accounts Receivable', 'ASSET', 'DEBIT', 'Amounts due from tenants/customers'),
    (NEW.id, '1300', 'Security Deposits', 'ASSET', 'DEBIT', 'Tenant security deposits held'),
    (NEW.id, '1500', 'Equipment', 'ASSET', 'DEBIT', 'Property equipment and fixtures'),
    -- Liabilities
    (NEW.id, '2000', 'Accounts Payable', 'LIABILITY', 'CREDIT', 'Amounts owed to vendors'),
    (NEW.id, '2100', 'Accrued Expenses', 'LIABILITY', 'CREDIT', 'Expenses incurred but not paid'),
    (NEW.id, '2200', 'Tenant Deposits Liability', 'LIABILITY', 'CREDIT', 'Liability for tenant deposits'),
    -- Equity
    (NEW.id, '3000', 'Owner Capital', 'EQUITY', 'CREDIT', 'Owner investment'),
    (NEW.id, '3100', 'Retained Earnings', 'EQUITY', 'CREDIT', 'Accumulated profits'),
    -- Revenue
    (NEW.id, '4000', 'Rental Income', 'REVENUE', 'CREDIT', 'Income from rent'),
    (NEW.id, '4100', 'Service Charge Income', 'REVENUE', 'CREDIT', 'Income from service charges'),
    (NEW.id, '4200', 'Water Revenue', 'REVENUE', 'CREDIT', 'Income from water utility'),
    (NEW.id, '4300', 'Penalty Income', 'REVENUE', 'CREDIT', 'Income from late payment penalties'),
    (NEW.id, '4400', 'Other Income', 'REVENUE', 'CREDIT', 'Miscellaneous income'),
    -- Expenses
    (NEW.id, '5000', 'Maintenance Expense', 'EXPENSE', 'DEBIT', 'Cost of repairs and maintenance'),
    (NEW.id, '5100', 'Utilities Expense', 'EXPENSE', 'DEBIT', 'Cost of utilities (non-billing)'),
    (NEW.id, '5200', 'Staff Salaries', 'EXPENSE', 'DEBIT', 'Employee salaries and wages'),
    (NEW.id, '5300', 'Vendor Costs', 'EXPENSE', 'DEBIT', 'Payments to contractors/vendors'),
    (NEW.id, '5400', 'Administrative Expense', 'EXPENSE', 'DEBIT', 'General administrative costs');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default accounts
DROP TRIGGER IF EXISTS create_default_coa_on_org_create ON public.organizations;
CREATE TRIGGER create_default_coa_on_org_create
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_coa_accounts();
