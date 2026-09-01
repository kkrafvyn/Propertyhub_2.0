-- Align legacy 'finance' role checks with canonical organization member roles.
-- Keeps owner/manager and adds finance_manager, finance_officer, collections_officer, head_property_management.

CREATE OR REPLACE FUNCTION private.can_manage_estate_finance(target_estate_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.managed_estates estate
    JOIN public.organization_members membership ON membership.organization_id = estate.organization_id
    WHERE estate.id = target_estate_id
      AND membership.user_id = auth.uid()
      AND membership.role IN (
        'owner',
        'manager',
        'finance_manager',
        'finance_officer',
        'collections_officer',
        'head_property_management'
      )
  );
$$;

DROP POLICY IF EXISTS "finance_can_post_je" ON public.journal_entries;
CREATE POLICY "finance_can_post_je" ON public.journal_entries
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN (
          'owner',
          'manager',
          'finance_manager',
          'finance_officer',
          'collections_officer',
          'head_property_management'
        )
    )
  );

DROP POLICY IF EXISTS "finance_can_manage_gl_rules" ON public.gl_posting_rules;
CREATE POLICY "finance_can_manage_gl_rules" ON public.gl_posting_rules
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN (
          'owner',
          'manager',
          'finance_manager',
          'finance_officer',
          'collections_officer',
          'head_property_management'
        )
    )
  );

DROP POLICY IF EXISTS "finance_can_manage_bank_accounts" ON public.bank_accounts;
CREATE POLICY "finance_can_manage_bank_accounts" ON public.bank_accounts
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN (
          'owner',
          'manager',
          'finance_manager',
          'finance_officer',
          'collections_officer',
          'head_property_management'
        )
    )
  );

DROP POLICY IF EXISTS "finance_can_manage_statements" ON public.bank_statements;
CREATE POLICY "finance_can_manage_statements" ON public.bank_statements
  FOR ALL USING (
    organization_id IN (
      SELECT organization_id FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN (
          'owner',
          'manager',
          'finance_manager',
          'finance_officer',
          'collections_officer',
          'head_property_management'
        )
    )
  );

DROP POLICY IF EXISTS "finance_can_match_txns" ON public.bank_transactions;
CREATE POLICY "finance_can_match_txns" ON public.bank_transactions
  FOR UPDATE USING (
    statement_id IN (
      SELECT id FROM public.bank_statements
      WHERE organization_id IN (
        SELECT organization_id FROM public.workspace_members
        WHERE user_id = auth.uid()
          AND role IN (
            'owner',
            'manager',
            'finance_manager',
            'finance_officer',
            'collections_officer',
            'head_property_management'
          )
      )
    )
  );

DROP POLICY IF EXISTS "finance_can_manage_variances" ON public.reconciliation_variances;
CREATE POLICY "finance_can_manage_variances" ON public.reconciliation_variances
  FOR ALL USING (
    statement_id IN (
      SELECT id FROM public.bank_statements
      WHERE organization_id IN (
        SELECT organization_id FROM public.workspace_members
        WHERE user_id = auth.uid()
          AND role IN (
            'owner',
            'manager',
            'finance_manager',
            'finance_officer',
            'collections_officer',
            'head_property_management'
          )
      )
    )
  );

DROP POLICY IF EXISTS "Finance leaders can manage accounting periods" ON public.accounting_periods;
CREATE POLICY "Finance leaders can manage accounting periods"
  ON public.accounting_periods
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN (
          'owner',
          'manager',
          'finance_manager',
          'finance_officer',
          'collections_officer',
          'head_property_management'
        )
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN (
          'owner',
          'manager',
          'finance_manager',
          'finance_officer',
          'collections_officer',
          'head_property_management'
        )
    )
  );

DROP POLICY IF EXISTS "Finance members manage PayAngels connections" ON public.payment_provider_connections;
CREATE POLICY "Finance members manage PayAngels connections" ON public.payment_provider_connections FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = payment_provider_connections.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN (
        'owner',
        'manager',
        'finance_manager',
        'finance_officer',
        'collections_officer',
        'head_property_management'
      )
  )
) WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.organization_members m
    WHERE m.organization_id = payment_provider_connections.organization_id
      AND m.user_id = auth.uid()
      AND m.role IN (
        'owner',
        'manager',
        'finance_manager',
        'finance_officer',
        'collections_officer',
        'head_property_management'
      )
  )
);

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
      AND om.role IN (
        'owner',
        'manager',
        'finance_manager',
        'finance_officer',
        'collections_officer',
        'head_property_management'
      )
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
      AND om.role IN (
        'owner',
        'manager',
        'finance_manager',
        'finance_officer',
        'collections_officer',
        'head_property_management'
      )
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
