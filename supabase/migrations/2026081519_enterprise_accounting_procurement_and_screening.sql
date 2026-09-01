-- Phase 2 commercial ERP controls. These tables deliberately store provider references,
-- never provider credentials, so banking, screening and delivery vendors remain replaceable.
CREATE TABLE public.estate_chart_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  account_code TEXT NOT NULL, name TEXT NOT NULL, account_type TEXT NOT NULL CHECK (account_type IN ('asset','liability','equity','income','expense')),
  active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(estate_id, account_code)
);
CREATE TABLE public.estate_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE, reference TEXT, memo TEXT, status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','posted','void')),
  posted_by UUID REFERENCES public.users(id) ON DELETE SET NULL, created_by UUID REFERENCES public.users(id) ON DELETE SET NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.estate_journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), journal_entry_id UUID NOT NULL REFERENCES public.estate_journal_entries(id) ON DELETE RESTRICT,
  account_id UUID NOT NULL REFERENCES public.estate_chart_accounts(id) ON DELETE RESTRICT, description TEXT,
  debit_minor BIGINT NOT NULL DEFAULT 0 CHECK(debit_minor >= 0), credit_minor BIGINT NOT NULL DEFAULT 0 CHECK(credit_minor >= 0),
  CHECK ((debit_minor = 0) <> (credit_minor = 0))
);
CREATE TABLE public.estate_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  name TEXT NOT NULL, masked_account_number TEXT, currency TEXT NOT NULL DEFAULT 'GHS' CHECK(char_length(currency)=3),
  connection_status TEXT NOT NULL DEFAULT 'manual' CHECK(connection_status IN ('manual','pending','connected','error','disconnected')),
  provider TEXT, provider_connection_reference TEXT, last_synced_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.estate_bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), bank_account_id UUID NOT NULL REFERENCES public.estate_bank_accounts(id) ON DELETE CASCADE,
  provider_transaction_reference TEXT, transaction_date DATE NOT NULL, description TEXT, amount_minor BIGINT NOT NULL CHECK(amount_minor <> 0),
  reconciliation_status TEXT NOT NULL DEFAULT 'unmatched' CHECK(reconciliation_status IN ('unmatched','matched','excluded')), matched_journal_line_id UUID REFERENCES public.estate_journal_lines(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(bank_account_id, provider_transaction_reference)
);
CREATE TABLE public.estate_tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  code TEXT NOT NULL, name TEXT NOT NULL, rate_basis_points INTEGER NOT NULL CHECK(rate_basis_points BETWEEN 0 AND 10000),
  tax_type TEXT NOT NULL DEFAULT 'other' CHECK(tax_type IN ('vat','withholding','income','property','other')), active BOOLEAN NOT NULL DEFAULT TRUE, UNIQUE(estate_id, code)
);
CREATE TABLE public.estate_procurement_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), procurement_request_id UUID NOT NULL REFERENCES public.estate_procurement_requests(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL, vendor_name TEXT NOT NULL, quote_reference TEXT, amount_minor BIGINT NOT NULL CHECK(amount_minor > 0), currency TEXT NOT NULL DEFAULT 'GHS' CHECK(char_length(currency)=3),
  received_on DATE NOT NULL DEFAULT CURRENT_DATE, notes TEXT, status TEXT NOT NULL DEFAULT 'received' CHECK(status IN ('received','selected','rejected')), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE public.estate_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), estate_id UUID NOT NULL REFERENCES public.managed_estates(id) ON DELETE CASCADE,
  procurement_request_id UUID REFERENCES public.estate_procurement_requests(id) ON DELETE SET NULL, selected_quote_id UUID REFERENCES public.estate_procurement_quotes(id) ON DELETE SET NULL,
  po_number TEXT NOT NULL, vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL, vendor_name TEXT NOT NULL, amount_minor BIGINT NOT NULL CHECK(amount_minor > 0), currency TEXT NOT NULL DEFAULT 'GHS' CHECK(char_length(currency)=3),
  status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','issued','part_received','received','invoiced','closed','cancelled')), issued_by UUID REFERENCES public.users(id) ON DELETE SET NULL, issued_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(estate_id, po_number)
);
CREATE TABLE public.estate_goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), purchase_order_id UUID NOT NULL REFERENCES public.estate_purchase_orders(id) ON DELETE CASCADE,
  receipt_reference TEXT, received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), received_by UUID REFERENCES public.users(id) ON DELETE SET NULL, notes TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.estate_vendor_bills ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES public.estate_purchase_orders(id) ON DELETE SET NULL;
CREATE TABLE public.estate_lease_screenings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), deal_case_id UUID NOT NULL REFERENCES public.deal_cases(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, provider_case_reference TEXT, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','submitted','completed','manual_review','failed','cancelled')),
  recommendation TEXT CHECK(recommendation IN ('clear','review','decline')), result_summary TEXT, reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL, reviewed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE(deal_case_id, provider)
);
CREATE INDEX estate_journals_estate_date_idx ON public.estate_journal_entries(estate_id, entry_date DESC);
CREATE INDEX estate_bank_transactions_reconciliation_idx ON public.estate_bank_transactions(bank_account_id, reconciliation_status);
CREATE INDEX estate_procurement_quotes_request_idx ON public.estate_procurement_quotes(procurement_request_id);
CREATE INDEX estate_purchase_orders_estate_status_idx ON public.estate_purchase_orders(estate_id, status);
ALTER TABLE public.estate_chart_accounts ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_journal_entries ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_journal_lines ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_bank_accounts ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_bank_transactions ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_tax_codes ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_procurement_quotes ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_purchase_orders ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_goods_receipts ENABLE ROW LEVEL SECURITY; ALTER TABLE public.estate_lease_screenings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Estate finance manages chart accounts" ON public.estate_chart_accounts FOR ALL USING(private.can_manage_estate_finance(estate_id)) WITH CHECK(private.can_manage_estate_finance(estate_id));
CREATE POLICY "Estate finance manages journals" ON public.estate_journal_entries FOR ALL USING(private.can_manage_estate_finance(estate_id)) WITH CHECK(private.can_manage_estate_finance(estate_id));
CREATE POLICY "Estate finance manages journal lines" ON public.estate_journal_lines FOR ALL USING(EXISTS(SELECT 1 FROM public.estate_journal_entries j WHERE j.id=journal_entry_id AND private.can_manage_estate_finance(j.estate_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.estate_journal_entries j WHERE j.id=journal_entry_id AND private.can_manage_estate_finance(j.estate_id)));
CREATE POLICY "Estate finance manages bank accounts" ON public.estate_bank_accounts FOR ALL USING(private.can_manage_estate_finance(estate_id)) WITH CHECK(private.can_manage_estate_finance(estate_id));
CREATE POLICY "Estate finance manages bank transactions" ON public.estate_bank_transactions FOR ALL USING(EXISTS(SELECT 1 FROM public.estate_bank_accounts b WHERE b.id=bank_account_id AND private.can_manage_estate_finance(b.estate_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.estate_bank_accounts b WHERE b.id=bank_account_id AND private.can_manage_estate_finance(b.estate_id)));
CREATE POLICY "Estate finance manages tax codes" ON public.estate_tax_codes FOR ALL USING(private.can_manage_estate_finance(estate_id)) WITH CHECK(private.can_manage_estate_finance(estate_id));
CREATE POLICY "Estate staff manage procurement quotes" ON public.estate_procurement_quotes FOR ALL USING(EXISTS(SELECT 1 FROM public.estate_procurement_requests r WHERE r.id=procurement_request_id AND private.is_estate_staff(r.estate_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.estate_procurement_requests r WHERE r.id=procurement_request_id AND private.is_estate_staff(r.estate_id)));
CREATE POLICY "Estate staff manage purchase orders" ON public.estate_purchase_orders FOR ALL USING(private.is_estate_staff(estate_id)) WITH CHECK(private.is_estate_staff(estate_id));
CREATE POLICY "Estate staff manage goods receipts" ON public.estate_goods_receipts FOR ALL USING(EXISTS(SELECT 1 FROM public.estate_purchase_orders p WHERE p.id=purchase_order_id AND private.is_estate_staff(p.estate_id))) WITH CHECK(EXISTS(SELECT 1 FROM public.estate_purchase_orders p WHERE p.id=purchase_order_id AND private.is_estate_staff(p.estate_id)));
CREATE POLICY "Screening staff access" ON public.estate_lease_screenings FOR ALL USING(EXISTS(SELECT 1 FROM public.deal_cases d JOIN public.organization_members m ON m.organization_id=d.organization_id WHERE d.id=deal_case_id AND m.user_id=auth.uid())) WITH CHECK(EXISTS(SELECT 1 FROM public.deal_cases d JOIN public.organization_members m ON m.organization_id=d.organization_id WHERE d.id=deal_case_id AND m.user_id=auth.uid()));
GRANT SELECT, INSERT, UPDATE ON public.estate_chart_accounts, public.estate_journal_entries, public.estate_journal_lines, public.estate_bank_accounts, public.estate_bank_transactions, public.estate_tax_codes, public.estate_procurement_quotes, public.estate_purchase_orders, public.estate_goods_receipts, public.estate_lease_screenings TO authenticated;
