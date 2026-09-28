-- Owner statements are calculated records, not ordinary finance CRUD.
REVOKE INSERT, UPDATE, DELETE ON public.estate_owner_statement_runs FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.estate_owner_statement_runs TO authenticated;

DROP POLICY IF EXISTS "Finance manages owner statements" ON public.estate_owner_statement_runs;
DROP POLICY IF EXISTS "Owners and finance view owner statements" ON public.estate_owner_statement_runs;
CREATE POLICY "Owners and finance view owner statements"
ON public.estate_owner_statement_runs
FOR SELECT
USING (
  owner_user_id = auth.uid()
  OR private.can_manage_estate_finance(estate_id)
);

CREATE OR REPLACE FUNCTION public.guard_owner_statement_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND current_user NOT IN ('postgres', 'service_role') THEN
    RAISE EXCEPTION 'Owner statements are generated and transitioned by trusted server functions only';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IN ('approved', 'queued', 'delivered') THEN
    IF NEW.estate_id IS DISTINCT FROM OLD.estate_id
      OR NEW.owner_user_id IS DISTINCT FROM OLD.owner_user_id
      OR NEW.period_start IS DISTINCT FROM OLD.period_start
      OR NEW.period_end IS DISTINCT FROM OLD.period_end
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.gross_collections_minor IS DISTINCT FROM OLD.gross_collections_minor
      OR NEW.expense_minor IS DISTINCT FROM OLD.expense_minor
      OR NEW.net_distributable_minor IS DISTINCT FROM OLD.net_distributable_minor
      OR NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
      RAISE EXCEPTION 'Approved owner statement financial fields are immutable';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_owner_statement_fields ON public.estate_owner_statement_runs;
CREATE TRIGGER trg_guard_owner_statement_fields
BEFORE UPDATE ON public.estate_owner_statement_runs
FOR EACH ROW
EXECUTE FUNCTION public.guard_owner_statement_fields();

CREATE OR REPLACE FUNCTION public.approve_owner_statement(p_statement_id UUID)
RETURNS public.estate_owner_statement_runs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_statement public.estate_owner_statement_runs;
BEGIN
  SELECT * INTO v_statement
  FROM public.estate_owner_statement_runs
  WHERE id = p_statement_id
  FOR UPDATE;

  IF NOT FOUND OR NOT private.can_manage_estate_finance(v_statement.estate_id) THEN
    RAISE EXCEPTION 'Finance approval is required for this statement';
  END IF;

  IF v_statement.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft statements can be approved';
  END IF;

  UPDATE public.estate_owner_statement_runs
  SET status = 'approved', approved_by = auth.uid()
  WHERE id = p_statement_id
  RETURNING * INTO v_statement;

  RETURN v_statement;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_owner_statement(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_owner_statement(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_distribution_approval(
  p_statement_run_id UUID
)
RETURNS public.estate_distribution_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_statement public.estate_owner_statement_runs;
  v_approval public.estate_distribution_approvals;
BEGIN
  SELECT * INTO v_statement
  FROM public.estate_owner_statement_runs
  WHERE id = p_statement_run_id
  FOR UPDATE;

  IF NOT FOUND OR NOT private.can_manage_estate_finance(v_statement.estate_id) THEN
    RAISE EXCEPTION 'Finance capability is required to request a distribution';
  END IF;
  IF v_statement.status NOT IN ('approved', 'queued') OR v_statement.net_distributable_minor <= 0 THEN
    RAISE EXCEPTION 'Statement is not eligible for distribution';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.estate_distribution_approvals
    WHERE statement_run_id = p_statement_run_id AND status IN ('pending', 'approved', 'processing')
  ) THEN
    RAISE EXCEPTION 'An active distribution approval already exists';
  END IF;

  INSERT INTO public.estate_distribution_approvals (
    statement_run_id, requested_amount_minor, requested_by
  )
  VALUES (p_statement_run_id, v_statement.net_distributable_minor, auth.uid())
  RETURNING * INTO v_approval;
  RETURN v_approval;
END;
$$;
REVOKE ALL ON FUNCTION public.request_distribution_approval(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_distribution_approval(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_distribution_approval(
  p_approval_id UUID,
  p_decision TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS public.estate_distribution_approvals
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_approval public.estate_distribution_approvals;
  v_statement public.estate_owner_statement_runs;
BEGIN
  SELECT * INTO v_approval
  FROM public.estate_distribution_approvals
  WHERE id = p_approval_id AND status = 'pending'
  FOR UPDATE;
  SELECT * INTO v_statement
  FROM public.estate_owner_statement_runs
  WHERE id = v_approval.statement_run_id;

  IF NOT FOUND OR NOT private.can_manage_estate_finance(v_statement.estate_id) THEN
    RAISE EXCEPTION 'Finance capability is required to review a distribution';
  END IF;
  IF v_approval.requested_by = auth.uid() THEN
    RAISE EXCEPTION 'The requester cannot approve the same distribution';
  END IF;
  IF p_decision NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid distribution decision';
  END IF;
  IF p_decision = 'approved' AND v_approval.requested_amount_minor <> v_statement.net_distributable_minor THEN
    RAISE EXCEPTION 'Distribution amount no longer matches the trusted statement';
  END IF;

  UPDATE public.estate_distribution_approvals
  SET status = p_decision,
      reviewed_by = auth.uid(),
      review_note = NULLIF(btrim(p_note), ''),
      reviewed_at = NOW()
  WHERE id = p_approval_id
  RETURNING * INTO v_approval;
  RETURN v_approval;
END;
$$;
REVOKE ALL ON FUNCTION public.review_distribution_approval(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_distribution_approval(UUID, TEXT, TEXT) TO authenticated;

-- Worker metadata on automation events cannot be altered by interactive clients.
CREATE OR REPLACE FUNCTION public.guard_automation_worker_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
    AND current_user NOT IN ('postgres', 'service_role')
    AND (
      NEW.status IS DISTINCT FROM OLD.status
      OR NEW.attempt_count IS DISTINCT FROM OLD.attempt_count
      OR NEW.next_attempt_at IS DISTINCT FROM OLD.next_attempt_at
      OR NEW.last_error IS DISTINCT FROM OLD.last_error
      OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
    ) THEN
    RAISE EXCEPTION 'Automation worker fields are service-controlled';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_automation_worker_fields ON public.estate_automation_events;
CREATE TRIGGER trg_guard_automation_worker_fields
BEFORE UPDATE ON public.estate_automation_events
FOR EACH ROW
EXECUTE FUNCTION public.guard_automation_worker_fields();
