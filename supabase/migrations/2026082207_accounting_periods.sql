-- Accounting period controls for the general ledger.
-- Adds open/close periods and prevents posting into closed periods.

CREATE TABLE IF NOT EXISTS public.accounting_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  period_name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  fiscal_year INT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  notes TEXT,
  closed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  closed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (period_start <= period_end),
  UNIQUE (organization_id, period_name, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_accounting_periods_org_start
  ON public.accounting_periods (organization_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_accounting_periods_org_status
  ON public.accounting_periods (organization_id, status);

ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can read accounting periods"
  ON public.accounting_periods
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Finance leaders can manage accounting periods"
  ON public.accounting_periods
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'manager', 'finance')
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'manager', 'finance')
    )
  );

CREATE OR REPLACE FUNCTION public.assert_accounting_period_open(
  p_organization_id UUID,
  p_entry_date DATE
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.accounting_periods ap
    WHERE ap.organization_id = p_organization_id
      AND ap.status = 'CLOSED'
      AND p_entry_date BETWEEN ap.period_start AND ap.period_end
  ) THEN
    RAISE EXCEPTION 'Closed accounting period blocks this posting date';
  END IF;
END;
$$;

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
  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager', 'finance')
  ) THEN
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

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = v_period.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager', 'finance')
  ) THEN
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

CREATE OR REPLACE FUNCTION public.post_journal_entry(p_journal_entry_id UUID)
RETURNS public.journal_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.journal_entries%ROWTYPE;
  v_debits BIGINT;
  v_credits BIGINT;
BEGIN
  SELECT * INTO v_entry
  FROM public.journal_entries
  WHERE id = p_journal_entry_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journal entry not found';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = v_entry.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'Not permitted to post journal entries';
  END IF;

  IF v_entry.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Only draft journal entries can be posted';
  END IF;

  PERFORM public.assert_accounting_period_open(v_entry.organization_id, v_entry.entry_date);

  SELECT
    COALESCE(SUM(debit_amount_minor), 0),
    COALESCE(SUM(credit_amount_minor), 0)
  INTO v_debits, v_credits
  FROM public.je_lines
  WHERE journal_entry_id = v_entry.id;

  IF v_debits = 0 OR v_debits <> v_credits THEN
    RAISE EXCEPTION 'Journal entry must contain balanced, non-zero debits and credits';
  END IF;

  UPDATE public.journal_entries
  SET status = 'POSTED',
      posted_by = auth.uid(),
      posted_at = NOW(),
      updated_at = NOW()
  WHERE id = v_entry.id
  RETURNING * INTO v_entry;

  INSERT INTO public.gl_posting_events (
    journal_entry_id,
    event_type,
    actor_user_id,
    metadata
  )
  VALUES (
    v_entry.id,
    'posted',
    auth.uid(),
    jsonb_build_object('debits_minor', v_debits, 'credits_minor', v_credits)
  );

  RETURN v_entry;
END;
$$;

CREATE OR REPLACE FUNCTION public.reverse_journal_entry(p_journal_entry_id UUID)
RETURNS public.journal_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_original public.journal_entries%ROWTYPE;
  v_reversal public.journal_entries%ROWTYPE;
BEGIN
  SELECT * INTO v_original
  FROM public.journal_entries
  WHERE id = p_journal_entry_id
  FOR UPDATE;

  IF NOT FOUND OR v_original.status <> 'POSTED' THEN
    RAISE EXCEPTION 'Only posted journal entries can be reversed';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE organization_id = v_original.organization_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'Not permitted to reverse journal entries';
  END IF;

  PERFORM public.assert_accounting_period_open(v_original.organization_id, CURRENT_DATE);

  INSERT INTO public.journal_entries (
    organization_id,
    entry_date,
    description,
    reference_number,
    status,
    created_by
  )
  VALUES (
    v_original.organization_id,
    CURRENT_DATE,
    'Reversal of: ' || v_original.description,
    v_original.reference_number,
    'DRAFT',
    auth.uid()
  )
  RETURNING * INTO v_reversal;

  INSERT INTO public.je_lines (
    journal_entry_id,
    account_id,
    debit_amount_minor,
    credit_amount_minor,
    line_description,
    line_number
  )
  SELECT
    v_reversal.id,
    account_id,
    credit_amount_minor,
    debit_amount_minor,
    'Reversal: ' || COALESCE(line_description, ''),
    line_number
  FROM public.je_lines
  WHERE journal_entry_id = v_original.id;

  PERFORM public.post_journal_entry(v_reversal.id);

  UPDATE public.journal_entries
  SET status = 'REVERSED',
      reversed_entry_id = v_reversal.id,
      updated_at = NOW()
  WHERE id = v_original.id;

  INSERT INTO public.gl_posting_events (
    journal_entry_id,
    event_type,
    actor_user_id,
    metadata
  )
  VALUES (
    v_original.id,
    'reversed',
    auth.uid(),
    jsonb_build_object('reversal_entry_id', v_reversal.id)
  );

  RETURN (SELECT * FROM public.journal_entries WHERE id = v_reversal.id);
END;
$$;

REVOKE ALL ON FUNCTION public.assert_accounting_period_open(UUID, DATE), public.create_accounting_period(UUID, TEXT, DATE, DATE, INT, TEXT, UUID), public.close_accounting_period(UUID, UUID), public.post_journal_entry(UUID), public.reverse_journal_entry(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_accounting_period_open(UUID, DATE), public.create_accounting_period(UUID, TEXT, DATE, DATE, INT, TEXT, UUID), public.close_accounting_period(UUID, UUID), public.post_journal_entry(UUID), public.reverse_journal_entry(UUID) TO authenticated;
