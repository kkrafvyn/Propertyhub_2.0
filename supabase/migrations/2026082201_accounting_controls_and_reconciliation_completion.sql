-- Make the ledger foundation enforceable: only balanced drafts may post, posted
-- records are immutable, reversals remain linked, and statements cannot close
-- while material exceptions remain.
DO $$ BEGIN
  ALTER TABLE public.bank_accounts ADD CONSTRAINT bank_accounts_gl_account_fk FOREIGN KEY (gl_account_id) REFERENCES public.coa_accounts(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.bank_transactions ADD CONSTRAINT bank_transactions_je_line_fk FOREIGN KEY (matched_to_je_line_id) REFERENCES public.je_lines(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE public.reconciliation_adjustments ADD CONSTRAINT reconciliation_adjustments_je_fk FOREIGN KEY (journal_entry_id) REFERENCES public.journal_entries(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.gl_posting_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN ('posted','reversed','voided')),
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);
ALTER TABLE public.gl_posting_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Ledger readers view posting events" ON public.gl_posting_events FOR SELECT USING (EXISTS (SELECT 1 FROM public.journal_entries j JOIN public.organization_members m ON m.organization_id=j.organization_id WHERE j.id=journal_entry_id AND m.user_id=auth.uid()));

CREATE OR REPLACE FUNCTION public.enforce_journal_immutability()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'journal_entries' AND TG_OP IN ('UPDATE','DELETE') AND OLD.status IN ('POSTED','REVERSED','VOIDED')
    AND NOT (TG_OP = 'UPDATE' AND OLD.status = 'POSTED' AND NEW.status = 'REVERSED' AND NEW.reversed_entry_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Posted, reversed, and voided journal entries are immutable; create a reversal instead.';
  END IF;
  IF TG_TABLE_NAME = 'je_lines' THEN
    IF EXISTS (SELECT 1 FROM public.journal_entries j WHERE j.id=COALESCE(NEW.journal_entry_id, OLD.journal_entry_id) AND j.status <> 'DRAFT') THEN
      RAISE EXCEPTION 'Journal lines can only be changed while their entry is a draft.';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS journal_entries_immutable ON public.journal_entries;
CREATE TRIGGER journal_entries_immutable BEFORE UPDATE OR DELETE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.enforce_journal_immutability();
DROP TRIGGER IF EXISTS journal_lines_immutable ON public.je_lines;
CREATE TRIGGER journal_lines_immutable BEFORE INSERT OR UPDATE OR DELETE ON public.je_lines FOR EACH ROW EXECUTE FUNCTION public.enforce_journal_immutability();

CREATE OR REPLACE FUNCTION public.post_journal_entry(p_journal_entry_id UUID)
RETURNS public.journal_entries LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_entry public.journal_entries%ROWTYPE; v_debits BIGINT; v_credits BIGINT;
BEGIN
  SELECT * INTO v_entry FROM public.journal_entries WHERE id=p_journal_entry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Journal entry not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=v_entry.organization_id AND user_id=auth.uid() AND role IN ('owner','manager')) THEN RAISE EXCEPTION 'Not permitted to post journal entries'; END IF;
  IF v_entry.status <> 'DRAFT' THEN RAISE EXCEPTION 'Only draft journal entries can be posted'; END IF;
  SELECT COALESCE(SUM(debit_amount_minor),0), COALESCE(SUM(credit_amount_minor),0) INTO v_debits, v_credits FROM public.je_lines WHERE journal_entry_id=v_entry.id;
  IF v_debits = 0 OR v_debits <> v_credits THEN RAISE EXCEPTION 'Journal entry must contain balanced, non-zero debits and credits'; END IF;
  UPDATE public.journal_entries SET status='POSTED', posted_by=auth.uid(), posted_at=NOW(), updated_at=NOW() WHERE id=v_entry.id RETURNING * INTO v_entry;
  INSERT INTO public.gl_posting_events(journal_entry_id,event_type,actor_user_id,metadata) VALUES(v_entry.id,'posted',auth.uid(),jsonb_build_object('debits_minor',v_debits,'credits_minor',v_credits));
  RETURN v_entry;
END; $$;

CREATE OR REPLACE FUNCTION public.reverse_journal_entry(p_journal_entry_id UUID)
RETURNS public.journal_entries LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_original public.journal_entries%ROWTYPE; v_reversal public.journal_entries%ROWTYPE;
BEGIN
  SELECT * INTO v_original FROM public.journal_entries WHERE id=p_journal_entry_id FOR UPDATE;
  IF NOT FOUND OR v_original.status <> 'POSTED' THEN RAISE EXCEPTION 'Only posted journal entries can be reversed'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=v_original.organization_id AND user_id=auth.uid() AND role IN ('owner','manager')) THEN RAISE EXCEPTION 'Not permitted to reverse journal entries'; END IF;
  INSERT INTO public.journal_entries(organization_id,entry_date,description,reference_number,status,created_by) VALUES(v_original.organization_id,CURRENT_DATE,'Reversal of: '||v_original.description,v_original.reference_number,'DRAFT',auth.uid()) RETURNING * INTO v_reversal;
  INSERT INTO public.je_lines(journal_entry_id,account_id,debit_amount_minor,credit_amount_minor,line_description,line_number)
    SELECT v_reversal.id,account_id,credit_amount_minor,debit_amount_minor,'Reversal: '||COALESCE(line_description,''),line_number FROM public.je_lines WHERE journal_entry_id=v_original.id;
  PERFORM public.post_journal_entry(v_reversal.id);
  UPDATE public.journal_entries SET status='REVERSED',reversed_entry_id=v_reversal.id,updated_at=NOW() WHERE id=v_original.id;
  INSERT INTO public.gl_posting_events(journal_entry_id,event_type,actor_user_id,metadata) VALUES(v_original.id,'reversed',auth.uid(),jsonb_build_object('reversal_entry_id',v_reversal.id));
  RETURN (SELECT * FROM public.journal_entries WHERE id=v_reversal.id);
END; $$;

CREATE OR REPLACE FUNCTION public.calculate_trial_balance(p_org_id UUID, p_as_of_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE(account_id UUID, account_code TEXT, account_name TEXT, account_type TEXT, debit_minor BIGINT, credit_minor BIGINT, net_balance_minor BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT a.id,a.account_code,a.account_name,a.account_type,
    COALESCE(SUM(l.debit_amount_minor) FILTER (WHERE j.id IS NOT NULL),0)::BIGINT,COALESCE(SUM(l.credit_amount_minor) FILTER (WHERE j.id IS NOT NULL),0)::BIGINT,
    (COALESCE(SUM(l.debit_amount_minor) FILTER (WHERE j.id IS NOT NULL),0)-COALESCE(SUM(l.credit_amount_minor) FILTER (WHERE j.id IS NOT NULL),0))::BIGINT
  FROM public.coa_accounts a LEFT JOIN public.je_lines l ON l.account_id=a.id LEFT JOIN public.journal_entries j ON j.id=l.journal_entry_id AND j.status='POSTED' AND j.entry_date<=p_as_of_date
  WHERE a.organization_id=p_org_id GROUP BY a.id,a.account_code,a.account_name,a.account_type ORDER BY a.account_code;
$$;

CREATE OR REPLACE FUNCTION public.complete_bank_reconciliation(p_statement_id UUID)
RETURNS public.bank_statements LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_statement public.bank_statements%ROWTYPE;
BEGIN
  SELECT * INTO v_statement FROM public.bank_statements WHERE id=p_statement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank statement not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id=v_statement.organization_id AND user_id=auth.uid() AND role IN ('owner','manager')) THEN RAISE EXCEPTION 'Not permitted to complete reconciliation'; END IF;
  IF v_statement.reconciliation_completed THEN RAISE EXCEPTION 'This reconciliation is already closed'; END IF;
  IF EXISTS (SELECT 1 FROM public.bank_transactions WHERE statement_id=p_statement_id AND NOT is_matched) THEN RAISE EXCEPTION 'Resolve or explicitly exclude all bank transactions before completing reconciliation'; END IF;
  IF EXISTS (SELECT 1 FROM public.reconciliation_variances WHERE statement_id=p_statement_id AND resolution_status='PENDING') THEN RAISE EXCEPTION 'Resolve or escalate all reconciliation variances before completing reconciliation'; END IF;
  UPDATE public.bank_statements SET reconciliation_completed=TRUE,reconciled_by=auth.uid(),reconciled_at=NOW() WHERE id=p_statement_id RETURNING * INTO v_statement;
  RETURN v_statement;
END; $$;
REVOKE ALL ON FUNCTION public.post_journal_entry(UUID), public.reverse_journal_entry(UUID), public.complete_bank_reconciliation(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_journal_entry(UUID), public.reverse_journal_entry(UUID), public.complete_bank_reconciliation(UUID), public.calculate_trial_balance(UUID,DATE) TO authenticated;
GRANT SELECT ON public.gl_posting_events TO authenticated;
