CREATE OR REPLACE FUNCTION public.portfolio_ledger_source(
  p_org UUID,
  p_start DATE,
  p_end DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  report JSONB;
BEGIN
  IF auth.uid() IS NULL
     OR NOT private.account_access_allowed()
     OR NOT (private.is_org_admin(p_org) OR private.org_member_has_permission(p_org, 'finance:read')) THEN
    RAISE EXCEPTION 'Finance reporting access denied' USING ERRCODE = '42501';
  END IF;
  IF p_start IS NULL OR p_end IS NULL OR p_end < p_start OR p_end - p_start > 3660 THEN
    RAISE EXCEPTION 'Choose a valid reporting period of at most ten years';
  END IF;
  WITH ledger_rows AS (
    SELECT j.id AS entry_id, j.entry_date, j.reference_number, l.id AS line_id,
      l.allocation_id, l.charge_id, a.account_code, a.account_name, a.account_type,
      COALESCE(l.debit_amount_minor, 0) AS debit, COALESCE(l.credit_amount_minor, 0) AS credit
    FROM public.journal_entries AS j
    JOIN public.je_lines AS l ON l.journal_entry_id = j.id
    LEFT JOIN public.coa_accounts AS a ON a.id = l.account_id AND a.organization_id = j.organization_id
    WHERE j.organization_id = p_org AND j.status = 'POSTED' AND j.entry_date BETWEEN p_start AND p_end
  ), entry_totals AS (
    SELECT entry_id, SUM(debit) - SUM(credit) AS balance
    FROM ledger_rows
    GROUP BY entry_id
  ), ordered_lines AS (
    SELECT jsonb_build_object(
      'entryId', entry_id, 'entryDate', entry_date, 'referenceNumber', reference_number,
      'lineId', line_id, 'allocationId', allocation_id, 'chargeId', charge_id,
      'accountCode', account_code, 'accountName', account_name, 'accountType', account_type,
      'debitMinor', debit, 'creditMinor', credit
    ) AS line
    FROM ledger_rows
    ORDER BY entry_date, entry_id, line_id
  )
  SELECT jsonb_build_object(
    'generatedAt', NOW(), 'periodStart', p_start, 'periodEnd', p_end,
    'missingAccounts', (SELECT COUNT(*) FROM ledger_rows WHERE account_code IS NULL),
    'unbalancedEntryIds', COALESCE(
      (SELECT jsonb_agg(entry_id ORDER BY entry_id) FROM entry_totals WHERE balance <> 0), '[]'::JSONB
    ),
    'lines', COALESCE((SELECT jsonb_agg(line) FROM ordered_lines), '[]'::JSONB)
  ) INTO report;
  RETURN report;
END;
$$;
REVOKE ALL ON FUNCTION public.portfolio_ledger_source(UUID, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portfolio_ledger_source(UUID, DATE, DATE) TO authenticated;
NOTIFY pgrst, 'reload schema';
