-- BaytMiftah RBAC audit: replace legacy organization_members.role IN ('owner','manager','finance')
-- checks on finance / bank reconciliation / journal paths with private.org_member_has_permission.
--
-- NOT changed here (documented):
-- - public.workspace_members is a view over organization_members; policies below use organization_id directly.
-- - org_can_read_* policies remain membership-wide SELECT; write paths require explicit permissions.
-- - Legacy RPCs outside finance scope (e.g. vendor SLA role IN 'operations') unchanged in this pass.

-- ── Bank reconciliation (20260821_bank_reconciliation + 2026090201 alignment) ──

DROP POLICY IF EXISTS "finance_can_manage_bank_accounts" ON public.bank_accounts;
CREATE POLICY "finance_can_manage_bank_accounts" ON public.bank_accounts
  FOR ALL
  USING (private.org_member_has_permission(organization_id, 'finance:write'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'finance:write'));

DROP POLICY IF EXISTS "finance_can_manage_statements" ON public.bank_statements;
CREATE POLICY "finance_can_manage_statements" ON public.bank_statements
  FOR ALL
  USING (private.org_member_has_permission(organization_id, 'finance:write'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'finance:write'));

DROP POLICY IF EXISTS "finance_can_match_txns" ON public.bank_transactions;
CREATE POLICY "finance_can_match_txns" ON public.bank_transactions
  FOR UPDATE
  USING (
    statement_id IN (
      SELECT bs.id
      FROM public.bank_statements bs
      WHERE private.org_member_has_permission(bs.organization_id, 'finance:write')
    )
  );

DROP POLICY IF EXISTS "finance_can_manage_variances" ON public.reconciliation_variances;
CREATE POLICY "finance_can_manage_variances" ON public.reconciliation_variances
  FOR ALL
  USING (
    statement_id IN (
      SELECT bs.id
      FROM public.bank_statements bs
      WHERE private.org_member_has_permission(bs.organization_id, 'finance:write')
    )
  )
  WITH CHECK (
    statement_id IN (
      SELECT bs.id
      FROM public.bank_statements bs
      WHERE private.org_member_has_permission(bs.organization_id, 'finance:write')
    )
  );

-- ── General ledger (20260821_general_ledger_foundation + 2026090201) ──

DROP POLICY IF EXISTS "org_can_manage_coa" ON public.coa_accounts;
CREATE POLICY "org_can_manage_coa" ON public.coa_accounts
  FOR ALL
  USING (private.org_member_has_permission(organization_id, 'finance:write'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'finance:write'));

DROP POLICY IF EXISTS "finance_can_post_je" ON public.journal_entries;
CREATE POLICY "finance_can_manage_journal_entries" ON public.journal_entries
  FOR ALL
  USING (private.org_member_has_permission(organization_id, 'finance:write'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'finance:write'));

DROP POLICY IF EXISTS "finance_can_manage_gl_rules" ON public.gl_posting_rules;
CREATE POLICY "finance_can_manage_gl_rules" ON public.gl_posting_rules
  FOR ALL
  USING (private.org_member_has_permission(organization_id, 'finance:write'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'finance:write'));

DROP POLICY IF EXISTS "Finance members manage PayAngels connections" ON public.payment_provider_connections;
CREATE POLICY "Finance members manage PayAngels connections" ON public.payment_provider_connections
  FOR ALL
  USING (private.org_member_has_permission(organization_id, 'finance:write'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'finance:write'));

DROP POLICY IF EXISTS "Finance leaders can manage accounting periods" ON public.accounting_periods;
CREATE POLICY "Finance leaders can manage accounting periods" ON public.accounting_periods
  FOR ALL
  USING (private.org_member_has_permission(organization_id, 'finance:write'))
  WITH CHECK (private.org_member_has_permission(organization_id, 'finance:write'));

-- ── Accounting control RPCs (2026082201_accounting_controls) ──

CREATE OR REPLACE FUNCTION public.post_journal_entry(p_journal_entry_id UUID)
RETURNS public.journal_entries LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_entry public.journal_entries%ROWTYPE; v_debits BIGINT; v_credits BIGINT;
BEGIN
  SELECT * INTO v_entry FROM public.journal_entries WHERE id=p_journal_entry_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Journal entry not found'; END IF;
  IF NOT private.org_member_has_permission(v_entry.organization_id, 'finance:write') THEN
    RAISE EXCEPTION 'Not permitted to post journal entries';
  END IF;
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
  IF NOT private.org_member_has_permission(v_original.organization_id, 'finance:write') THEN
    RAISE EXCEPTION 'Not permitted to reverse journal entries';
  END IF;
  INSERT INTO public.journal_entries(organization_id,entry_date,description,reference_number,status,created_by) VALUES(v_original.organization_id,CURRENT_DATE,'Reversal of: '||v_original.description,v_original.reference_number,'DRAFT',auth.uid()) RETURNING * INTO v_reversal;
  INSERT INTO public.je_lines(journal_entry_id,account_id,debit_amount_minor,credit_amount_minor,line_description,line_number)
    SELECT v_reversal.id,account_id,credit_amount_minor,debit_amount_minor,'Reversal: '||COALESCE(line_description,''),line_number FROM public.je_lines WHERE journal_entry_id=v_original.id;
  PERFORM public.post_journal_entry(v_reversal.id);
  UPDATE public.journal_entries SET status='REVERSED',reversed_entry_id=v_reversal.id,updated_at=NOW() WHERE id=v_original.id;
  INSERT INTO public.gl_posting_events(journal_entry_id,event_type,actor_user_id,metadata) VALUES(v_original.id,'reversed',auth.uid(),jsonb_build_object('reversal_entry_id',v_reversal.id));
  RETURN (SELECT * FROM public.journal_entries WHERE id=v_reversal.id);
END; $$;

CREATE OR REPLACE FUNCTION public.complete_bank_reconciliation(p_statement_id UUID)
RETURNS public.bank_statements LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_statement public.bank_statements%ROWTYPE;
BEGIN
  SELECT * INTO v_statement FROM public.bank_statements WHERE id=p_statement_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bank statement not found'; END IF;
  IF NOT private.org_member_has_permission(v_statement.organization_id, 'finance:write') THEN
    RAISE EXCEPTION 'Not permitted to complete reconciliation';
  END IF;
  IF v_statement.reconciliation_completed THEN RAISE EXCEPTION 'This reconciliation is already closed'; END IF;
  IF EXISTS (SELECT 1 FROM public.bank_transactions WHERE statement_id=p_statement_id AND NOT is_matched) THEN RAISE EXCEPTION 'Resolve or explicitly exclude all bank transactions before completing reconciliation'; END IF;
  IF EXISTS (SELECT 1 FROM public.reconciliation_variances WHERE statement_id=p_statement_id AND resolution_status='PENDING') THEN RAISE EXCEPTION 'Resolve or escalate all reconciliation variances before completing reconciliation'; END IF;
  UPDATE public.bank_statements SET reconciliation_completed=TRUE,reconciled_by=auth.uid(),reconciled_at=NOW() WHERE id=p_statement_id RETURNING * INTO v_statement;
  RETURN v_statement;
END; $$;

CREATE OR REPLACE FUNCTION public.create_accounting_period(
  p_organization_id UUID,
  p_period_name TEXT,
  p_period_start DATE,
  p_period_end DATE,
  p_fiscal_year INT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS public.accounting_periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.accounting_periods%ROWTYPE;
BEGIN
  IF NOT private.org_member_has_permission(p_organization_id, 'finance:write') THEN
    RAISE EXCEPTION 'Not permitted to manage accounting periods';
  END IF;

  IF p_period_start > p_period_end THEN
    RAISE EXCEPTION 'Period start must be before period end';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.accounting_periods ap
    WHERE ap.organization_id = p_organization_id
      AND daterange(ap.period_start, ap.period_end, '[]') && daterange(p_period_start, p_period_end, '[]')
  ) THEN
    RAISE EXCEPTION 'Accounting periods cannot overlap';
  END IF;

  INSERT INTO public.accounting_periods (
    organization_id,
    period_name,
    period_start,
    period_end,
    fiscal_year,
    notes,
    created_by
  )
  VALUES (
    p_organization_id,
    p_period_name,
    p_period_start,
    p_period_end,
    p_fiscal_year,
    p_notes,
    p_created_by
  )
  RETURNING * INTO v_period;

  RETURN v_period;
END;
$$;

CREATE OR REPLACE FUNCTION public.close_accounting_period(
  p_period_id UUID,
  p_closed_by UUID DEFAULT NULL
)
RETURNS public.accounting_periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.accounting_periods%ROWTYPE;
BEGIN
  SELECT * INTO v_period
  FROM public.accounting_periods
  WHERE id = p_period_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accounting period not found';
  END IF;

  IF NOT private.org_member_has_permission(v_period.organization_id, 'finance:write') THEN
    RAISE EXCEPTION 'Not permitted to close accounting periods';
  END IF;

  IF v_period.status = 'CLOSED' THEN
    RAISE EXCEPTION 'Accounting period is already closed';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.journal_entries je
    WHERE je.organization_id = v_period.organization_id
      AND je.status = 'DRAFT'
      AND je.entry_date BETWEEN v_period.period_start AND v_period.period_end
  ) THEN
    RAISE EXCEPTION 'Resolve or post all draft entries before closing the period';
  END IF;

  UPDATE public.accounting_periods
  SET status = 'CLOSED',
      closed_by = COALESCE(p_closed_by, auth.uid()),
      closed_at = NOW(),
      updated_at = NOW()
  WHERE id = v_period.id
  RETURNING * INTO v_period;

  RETURN v_period;
END;
$$;

-- Extend department map for catalog roles used in production memberships.
CREATE OR REPLACE FUNCTION private.role_department(p_role TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE SET search_path='' AS $$
  SELECT CASE
    WHEN p_role IN ('owner','managing_director','property_owner') THEN 'executive'
    WHEN p_role IN ('organization_admin','enterprise_operator') THEN 'administration'
    WHEN p_role IN ('head_property_management','property_manager','manager','estate_officer','developer') THEN 'property'
    WHEN p_role IN ('facilities_manager','caretaker','technician','contractor','vendor') THEN 'maintenance'
    WHEN p_role IN ('sales_manager','agent','sales_agent','marketing_manager','marketing_officer') THEN 'sales'
    WHEN p_role IN ('finance_manager','finance_officer','collections_officer') THEN 'finance'
    WHEN p_role IN ('customer_service_manager','customer_service_agent') THEN 'support'
    WHEN p_role='analyst' THEN 'analytics' END;
$$;

-- ── Audit helper: roles missing from private.role_department map ──
-- Schedule via pg_cron / ops runbook if desired: SELECT * FROM public.audit_unknown_organization_roles();

CREATE OR REPLACE FUNCTION public.audit_unknown_organization_roles()
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  user_id UUID,
  member_role TEXT,
  mapped_department TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT
    om.organization_id,
    o.name,
    om.user_id,
    om.role,
    private.role_department(om.role)
  FROM public.organization_members om
  JOIN public.organizations o ON o.id = om.organization_id
  WHERE private.role_department(om.role) IS NULL
  ORDER BY o.name, om.role;
$$;

REVOKE ALL ON FUNCTION public.audit_unknown_organization_roles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.audit_unknown_organization_roles() TO authenticated, service_role;
