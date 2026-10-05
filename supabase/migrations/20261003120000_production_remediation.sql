-- Production remediation: WhatsApp dedup, distribution RPC hardening, maintenance offline idempotency.

-- ── WhatsApp inbound claim (dedupe before side effects) ──
ALTER TABLE public.whatsapp_inbound_messages
  ADD COLUMN IF NOT EXISTS processing_status TEXT NOT NULL DEFAULT 'received'
    CHECK (processing_status IN ('received', 'processing', 'completed', 'skipped'));

CREATE OR REPLACE FUNCTION public.claim_whatsapp_inbound_message(
  p_organization_id UUID,
  p_wa_message_id TEXT
)
RETURNS TABLE (claimed BOOLEAN, inbound_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_wa_message_id IS NULL OR length(trim(p_wa_message_id)) = 0 THEN
    claimed := TRUE;
    inbound_id := NULL;
    RETURN NEXT;
    RETURN;
  END IF;

  BEGIN
    INSERT INTO public.whatsapp_inbound_messages (
      organization_id,
      wa_message_id,
      sender_phone,
      message_text,
      bot_replied,
      processing_status
    )
    VALUES (
      p_organization_id,
      p_wa_message_id,
      'pending',
      '',
      FALSE,
      'processing'
    )
    RETURNING id INTO v_id;
    claimed := TRUE;
    inbound_id := v_id;
  EXCEPTION
    WHEN unique_violation THEN
      claimed := FALSE;
      inbound_id := NULL;
  END;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_inbound_message(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_inbound_message(UUID, TEXT) TO service_role;

-- ── Distribution approvals: inserts via RPC only ──
REVOKE INSERT ON public.estate_distribution_approvals FROM authenticated;

DROP POLICY IF EXISTS "Finance manages distribution approvals" ON public.estate_distribution_approvals;

CREATE POLICY "Finance read distribution approvals" ON public.estate_distribution_approvals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.estate_owner_statement_runs sr
      JOIN public.managed_estates e ON e.id = sr.estate_id
      WHERE sr.id = estate_distribution_approvals.statement_run_id
        AND private.can_manage_estate_finance(e.id)
    )
  );

CREATE POLICY "Finance update distribution approvals" ON public.estate_distribution_approvals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.estate_owner_statement_runs sr
      JOIN public.managed_estates e ON e.id = sr.estate_id
      WHERE sr.id = estate_distribution_approvals.statement_run_id
        AND private.can_manage_estate_finance(e.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.estate_owner_statement_runs sr
      JOIN public.managed_estates e ON e.id = sr.estate_id
      WHERE sr.id = estate_distribution_approvals.statement_run_id
        AND private.can_manage_estate_finance(e.id)
    )
  );

ALTER TABLE public.estate_distribution_approvals
  ADD COLUMN IF NOT EXISTS client_request_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS estate_distribution_approvals_client_request_uidx
  ON public.estate_distribution_approvals (statement_run_id, client_request_id)
  WHERE client_request_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.request_distribution_approval(
  p_statement_run_id UUID,
  p_client_request_id TEXT DEFAULT NULL
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
  IF p_client_request_id IS NOT NULL AND length(trim(p_client_request_id)) > 0 THEN
    SELECT * INTO v_approval
    FROM public.estate_distribution_approvals
    WHERE statement_run_id = p_statement_run_id
      AND client_request_id = p_client_request_id
    LIMIT 1;
    IF FOUND THEN
      RETURN v_approval;
    END IF;
  END IF;

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
    statement_run_id, requested_amount_minor, requested_by, client_request_id
  )
  VALUES (
    p_statement_run_id, v_statement.net_distributable_minor, auth.uid(), NULLIF(trim(p_client_request_id), '')
  )
  RETURNING * INTO v_approval;
  RETURN v_approval;
END;
$$;

REVOKE ALL ON FUNCTION public.request_distribution_approval(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_distribution_approval(UUID, TEXT) TO authenticated;

-- Drop old single-arg overload if present (replace above handles both via default)
DROP FUNCTION IF EXISTS public.request_distribution_approval(UUID);

-- ── Maintenance offline idempotency ──
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS offline_client_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS maintenance_requests_org_offline_client_uidx
  ON public.maintenance_requests (organization_id, offline_client_id)
  WHERE offline_client_id IS NOT NULL;

-- ── Session tracking: distinguish real sign-ins ──
ALTER TABLE public.user_sessions
  ADD COLUMN IF NOT EXISTS auth_session_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS user_sessions_user_auth_session_uidx
  ON public.user_sessions (user_id, auth_session_id)
  WHERE auth_session_id IS NOT NULL AND revoked_at IS NULL;

-- ── Import job status semantics ──
ALTER TABLE public.estate_import_jobs
  ADD COLUMN IF NOT EXISTS failed_rows INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.estate_import_jobs DROP CONSTRAINT IF EXISTS estate_import_jobs_status_check;
ALTER TABLE public.estate_import_jobs ADD CONSTRAINT estate_import_jobs_status_check
  CHECK (status IN ('draft', 'validated', 'approved', 'importing', 'imported', 'partially_imported', 'failed'));

CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_endpoint_uidx
  ON public.push_subscriptions (subscription_endpoint)
  WHERE subscription_endpoint IS NOT NULL;
