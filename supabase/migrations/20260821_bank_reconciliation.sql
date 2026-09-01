-- BaytMiftah P0: Bank Reconciliation Foundation
-- Implements bank statement upload, transaction matching, and reconciliation workflows

-- Bank Accounts
-- Compatibility projection for the older accounting migrations. The application
-- authority remains organization_members; this avoids silently granting access.
CREATE OR REPLACE VIEW public.workspace_members AS
  SELECT organization_id, user_id, role FROM public.organization_members;

CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_name VARCHAR(255) NOT NULL,
  account_number VARCHAR(50) NOT NULL,
  account_holder_name VARCHAR(255),
  currency VARCHAR(3) NOT NULL DEFAULT 'GHS' CHECK (char_length(currency) = 3),
  opening_balance_minor BIGINT NOT NULL DEFAULT 0,
  -- The ledger migration is applied immediately after this legacy file. The FK is
  -- attached in the follow-up hardening migration once coa_accounts exists.
  gl_account_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, bank_name, account_number)
);

-- Bank Statements (from bank file uploads)
CREATE TABLE IF NOT EXISTS public.bank_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bank_account_id UUID NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  statement_date DATE NOT NULL,
  opening_balance_minor BIGINT NOT NULL,
  closing_balance_minor BIGINT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
  total_debits_minor BIGINT NOT NULL DEFAULT 0,
  total_credits_minor BIGINT NOT NULL DEFAULT 0,
  transaction_count INT NOT NULL DEFAULT 0,
  upload_file_path TEXT,
  upload_file_format VARCHAR(10) CHECK (upload_file_format IN ('CSV', 'PDF', 'XLSX')),
  uploaded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reconciliation_completed BOOLEAN NOT NULL DEFAULT FALSE,
  reconciled_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reconciled_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bank Transactions (individual lines from statement)
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  posting_date DATE,
  description TEXT NOT NULL,
  amount_minor BIGINT NOT NULL CHECK (amount_minor <> 0),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('DEBIT', 'CREDIT')),
  balance_at_line_minor BIGINT,
  bank_reference VARCHAR(255),
  is_matched BOOLEAN NOT NULL DEFAULT FALSE,
  matched_to_payment_id UUID REFERENCES public.unit_payments(id) ON DELETE SET NULL,
  matched_to_je_line_id UUID,
  matched_at TIMESTAMPTZ,
  matched_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  unmatch_reason TEXT,
  line_sequence INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reconciliation Variance Log (mismatches, adjustments)
CREATE TABLE IF NOT EXISTS public.reconciliation_variances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  variance_type TEXT NOT NULL CHECK (variance_type IN ('UNMATCHED_DEBIT', 'UNMATCHED_CREDIT', 'DUPLICATE_MATCH', 'TIMING_DIFF', 'AMOUNT_DIFF', 'DESCRIPTION_VARIANCE')),
  bank_transaction_id UUID REFERENCES public.bank_transactions(id) ON DELETE SET NULL,
  related_payment_id UUID REFERENCES public.unit_payments(id) ON DELETE SET NULL,
  variance_amount_minor BIGINT,
  description TEXT,
  resolution_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (resolution_status IN ('PENDING', 'RESOLVED', 'WRITTEN_OFF', 'ESCALATED')),
  resolved_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reconciliation Adjustments (manual GL entries for timing differences)
CREATE TABLE IF NOT EXISTS public.reconciliation_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES public.bank_statements(id) ON DELETE CASCADE,
  journal_entry_id UUID,
  adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('BANK_ERROR', 'TIMING_ADJUSTMENT', 'DISPUTED_CHARGE', 'REVERSAL')),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  description TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_org ON public.bank_accounts(organization_id) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bank_statements_org_date ON public.bank_statements(organization_id, statement_date DESC);
CREATE INDEX IF NOT EXISTS idx_bank_txns_statement ON public.bank_transactions(statement_id);
CREATE INDEX IF NOT EXISTS idx_bank_txns_matched ON public.bank_transactions(is_matched, matched_to_payment_id);
CREATE INDEX IF NOT EXISTS idx_reconciliation_var_status ON public.reconciliation_variances(resolution_status);

-- RLS Policies
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_variances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reconciliation_adjustments ENABLE ROW LEVEL SECURITY;

-- Organizations can read their bank accounts
CREATE POLICY "org_can_read_bank_accounts" ON public.bank_accounts
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Finance role can manage bank accounts
CREATE POLICY "finance_can_manage_bank_accounts" ON public.bank_accounts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'finance')
    )
  );

-- Organizations can read bank statements
CREATE POLICY "org_can_read_bank_statements" ON public.bank_statements
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Finance role can upload and reconcile
CREATE POLICY "finance_can_manage_statements" ON public.bank_statements
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'finance')
    )
  );

-- Organizations can read bank transactions
CREATE POLICY "org_can_read_bank_txns" ON public.bank_transactions
  FOR SELECT USING (
    statement_id IN (
      SELECT id FROM public.bank_statements 
      WHERE organization_id IN (
        SELECT organization_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Finance can match transactions
CREATE POLICY "finance_can_match_txns" ON public.bank_transactions
  FOR UPDATE USING (
    statement_id IN (
      SELECT id FROM public.bank_statements 
      WHERE organization_id IN (
        SELECT organization_id FROM public.workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'finance')
      )
    )
  );

-- Organizations can read variances
CREATE POLICY "org_can_read_variances" ON public.reconciliation_variances
  FOR SELECT USING (
    statement_id IN (
      SELECT id FROM public.bank_statements 
      WHERE organization_id IN (
        SELECT organization_id FROM public.workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Finance can manage variances
CREATE POLICY "finance_can_manage_variances" ON public.reconciliation_variances
  FOR ALL USING (
    statement_id IN (
      SELECT id FROM public.bank_statements 
      WHERE organization_id IN (
        SELECT organization_id FROM public.workspace_members 
        WHERE user_id = auth.uid() AND role IN ('owner', 'manager', 'finance')
      )
    )
  );
