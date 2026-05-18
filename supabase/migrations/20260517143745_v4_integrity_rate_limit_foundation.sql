-- BaytMiftah v4 integrity, rate-limit, and diaspora-ready payment foundations.
-- Trust proof is fully internal: SHA-256 hash chaining plus optional RSA signatures.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS diaspora_billing_currency TEXT CHECK (
    diaspora_billing_currency IS NULL OR diaspora_billing_currency IN ('USD', 'GBP', 'EUR')
  );

ALTER TABLE public.subscription_tiers
  ADD COLUMN IF NOT EXISTS stripe_price_id_usd TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id_gbp TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id_eur TEXT;

ALTER TABLE public.organization_subscriptions
  DROP CONSTRAINT IF EXISTS organization_subscriptions_provider_check;

ALTER TABLE public.organization_subscriptions
  ADD CONSTRAINT organization_subscriptions_provider_check
  CHECK (provider IN ('paystack', 'stripe'));

ALTER TABLE public.organization_subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;

ALTER TABLE public.organization_subscription_payments
  DROP CONSTRAINT IF EXISTS organization_subscription_payments_provider_check;

ALTER TABLE public.organization_subscription_payments
  ADD CONSTRAINT organization_subscription_payments_provider_check
  CHECK (provider IN ('paystack', 'stripe'));

ALTER TABLE public.organization_subscription_payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

ALTER TABLE public.property_transactions
  DROP CONSTRAINT IF EXISTS property_transactions_provider_check;

ALTER TABLE public.property_transactions
  ADD CONSTRAINT property_transactions_provider_check
  CHECK (provider IN ('paystack', 'stripe', 'flutterwave', 'it_consortium'));

ALTER TABLE public.property_transactions
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS exchange_rate_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.property_refunds
  DROP CONSTRAINT IF EXISTS property_refunds_provider_check;

ALTER TABLE public.property_refunds
  ADD CONSTRAINT property_refunds_provider_check
  CHECK (provider IN ('paystack', 'stripe'));

ALTER TABLE public.property_refunds
  ADD COLUMN IF NOT EXISTS provider_response JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.property_escrows
  ADD COLUMN IF NOT EXISTS payment_processor TEXT NOT NULL DEFAULT 'paystack' CHECK (
    payment_processor IN ('paystack', 'stripe')
  ),
  ADD COLUMN IF NOT EXISTS platform_fee_minor BIGINT NOT NULL DEFAULT 0 CHECK (platform_fee_minor >= 0),
  ADD COLUMN IF NOT EXISTS release_amount_minor BIGINT GENERATED ALWAYS AS (
    GREATEST(amount_minor - platform_fee_minor, 0)
  ) STORED,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

ALTER TABLE public.property_escrow_documents
  ADD COLUMN IF NOT EXISTS watermark_text TEXT,
  ADD COLUMN IF NOT EXISTS watermarked_content_markdown TEXT,
  ADD COLUMN IF NOT EXISTS watermarked_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS watermarked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rsa_signature TEXT,
  ADD COLUMN IF NOT EXISTS integrity_audit_log_id UUID;

CREATE TABLE IF NOT EXISTS public.integrity_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  payload_hash TEXT NOT NULL CHECK (length(payload_hash) = 64),
  prev_hash TEXT NOT NULL CHECK (length(prev_hash) = 64),
  chain_hash TEXT NOT NULL UNIQUE CHECK (length(chain_hash) = 64),
  rsa_signature TEXT,
  public_key_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_audit_log_entity_created
ON public.integrity_audit_log(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integrity_audit_log_org_created
ON public.integrity_audit_log(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_integrity_audit_log_chain_created
ON public.integrity_audit_log(created_at DESC, chain_hash);

ALTER TABLE public.property_escrow_documents
  DROP CONSTRAINT IF EXISTS property_escrow_documents_integrity_audit_log_id_fkey;

ALTER TABLE public.property_escrow_documents
  ADD CONSTRAINT property_escrow_documents_integrity_audit_log_id_fkey
  FOREIGN KEY (integrity_audit_log_id)
  REFERENCES public.integrity_audit_log(id)
  ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.integrity_anchors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anchor_hash TEXT NOT NULL CHECK (length(anchor_hash) = 64),
  latest_chain_hash TEXT NOT NULL CHECK (length(latest_chain_hash) = 64),
  event_count BIGINT NOT NULL CHECK (event_count >= 0),
  anchoring_provider TEXT NOT NULL DEFAULT 'github',
  external_reference_url TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_anchors_created
ON public.integrity_anchors(created_at DESC);

CREATE TABLE IF NOT EXISTS public.edge_rate_limit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route TEXT NOT NULL,
  subject_key TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  window_seconds INTEGER NOT NULL CHECK (window_seconds > 0),
  request_count INTEGER NOT NULL DEFAULT 1 CHECK (request_count >= 0),
  blocked_until TIMESTAMPTZ,
  last_request_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (route, subject_key, window_started_at)
);

CREATE INDEX IF NOT EXISTS idx_edge_rate_limit_events_route_subject
ON public.edge_rate_limit_events(route, subject_key, window_started_at DESC);

CREATE TABLE IF NOT EXISTS public.property_condition_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escrow_id UUID REFERENCES public.property_escrows(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  submitted_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  submitted_role TEXT NOT NULL CHECK (submitted_role IN ('agent', 'tenant', 'owner', 'manager', 'admin')),
  report_stage TEXT NOT NULL DEFAULT 'move_in' CHECK (report_stage IN ('move_in', 'move_out', 'ad_hoc')),
  condition_status TEXT NOT NULL DEFAULT 'submitted' CHECK (
    condition_status IN ('draft', 'submitted', 'acknowledged', 'disputed')
  ),
  notes TEXT NOT NULL DEFAULT '',
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  report_sha256 TEXT NOT NULL CHECK (length(report_sha256) = 64),
  acknowledged_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_property_condition_reports_escrow_created
ON public.property_condition_reports(escrow_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_property_condition_reports_org_created
ON public.property_condition_reports(organization_id, created_at DESC);

ALTER TABLE public.integrity_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_anchors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edge_rate_limit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_condition_reports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.integrity_audit_log TO authenticated;
GRANT SELECT ON public.integrity_anchors TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.edge_rate_limit_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.property_condition_reports TO authenticated;

DROP POLICY IF EXISTS "Integrity log participants can read relevant rows" ON public.integrity_audit_log;
CREATE POLICY "Integrity log participants can read relevant rows"
ON public.integrity_audit_log FOR SELECT
USING (
  private.is_platform_admin()
  OR actor_id = auth.uid()
  OR (
    organization_id IS NOT NULL
    AND private.is_organization_member(organization_id)
  )
);

DROP POLICY IF EXISTS "Authenticated actors can append integrity rows" ON public.integrity_audit_log;
CREATE POLICY "Authenticated actors can append integrity rows"
ON public.integrity_audit_log FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Anyone can read integrity anchors" ON public.integrity_anchors;
CREATE POLICY "Anyone can read integrity anchors"
ON public.integrity_anchors FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Platform admins can create integrity anchors" ON public.integrity_anchors;
CREATE POLICY "Platform admins can create integrity anchors"
ON public.integrity_anchors FOR INSERT
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Platform admins can read rate limit counters" ON public.edge_rate_limit_events;
CREATE POLICY "Platform admins can read rate limit counters"
ON public.edge_rate_limit_events FOR SELECT
USING (private.is_platform_admin());

DROP POLICY IF EXISTS "Escrow parties and admins can view condition reports" ON public.property_condition_reports;
CREATE POLICY "Escrow parties and admins can view condition reports"
ON public.property_condition_reports FOR SELECT
USING (
  private.is_platform_admin()
  OR private.is_organization_member(organization_id)
  OR submitted_by = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.property_escrows escrow
    WHERE escrow.id = property_condition_reports.escrow_id
      AND escrow.payer_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Escrow parties and org members can add condition reports" ON public.property_condition_reports;
CREATE POLICY "Escrow parties and org members can add condition reports"
ON public.property_condition_reports FOR INSERT
WITH CHECK (
  submitted_by = auth.uid()
  AND (
    private.is_organization_member(organization_id)
    OR EXISTS (
      SELECT 1
      FROM public.property_escrows escrow
      WHERE escrow.id = property_condition_reports.escrow_id
        AND escrow.payer_user_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "Report submitters and admins can update condition acknowledgement" ON public.property_condition_reports;
CREATE POLICY "Report submitters and admins can update condition acknowledgement"
ON public.property_condition_reports FOR UPDATE
USING (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
  OR submitted_by = auth.uid()
)
WITH CHECK (
  private.can_manage_platform()
  OR private.is_organization_member(organization_id)
  OR submitted_by = auth.uid()
);

CREATE OR REPLACE FUNCTION public.reject_integrity_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'integrity_audit_log is append-only';
END;
$$;

DROP TRIGGER IF EXISTS reject_integrity_audit_log_update ON public.integrity_audit_log;
CREATE TRIGGER reject_integrity_audit_log_update
BEFORE UPDATE ON public.integrity_audit_log
FOR EACH ROW EXECUTE FUNCTION public.reject_integrity_audit_log_mutation();

DROP TRIGGER IF EXISTS reject_integrity_audit_log_delete ON public.integrity_audit_log;
CREATE TRIGGER reject_integrity_audit_log_delete
BEFORE DELETE ON public.integrity_audit_log
FOR EACH ROW EXECUTE FUNCTION public.reject_integrity_audit_log_mutation();

CREATE OR REPLACE FUNCTION private.set_property_escrow_payment_processor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  transaction_provider TEXT;
BEGIN
  SELECT provider
  INTO transaction_provider
  FROM public.property_transactions
  WHERE id = NEW.transaction_id;

  NEW.payment_processor := CASE
    WHEN transaction_provider = 'stripe' THEN 'stripe'
    ELSE 'paystack'
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.set_property_escrow_payment_processor() FROM PUBLIC;

DROP TRIGGER IF EXISTS set_property_escrow_payment_processor ON public.property_escrows;
CREATE TRIGGER set_property_escrow_payment_processor
BEFORE INSERT ON public.property_escrows
FOR EACH ROW EXECUTE FUNCTION private.set_property_escrow_payment_processor();

DROP TRIGGER IF EXISTS set_edge_rate_limit_events_updated_at ON public.edge_rate_limit_events;
CREATE TRIGGER set_edge_rate_limit_events_updated_at
BEFORE UPDATE ON public.edge_rate_limit_events
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_property_condition_reports_updated_at ON public.property_condition_reports;
CREATE TRIGGER set_property_condition_reports_updated_at
BEFORE UPDATE ON public.property_condition_reports
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

COMMENT ON TABLE public.integrity_audit_log IS
  'Append-only trust log using SHA-256 hash chaining and optional RSA signatures for escrow and document events.';

COMMENT ON TABLE public.integrity_anchors IS
  'Periodic public anchor checkpoints for the integrity log. Intended for GitHub timestamp commits.';

COMMENT ON TABLE public.edge_rate_limit_events IS
  'Server-side counters used by Edge Functions to limit sensitive payment and auth actions.';

COMMENT ON TABLE public.property_condition_reports IS
  'Move-in and move-out condition evidence tied to escrow and listing records.';

NOTIFY pgrst, 'reload schema';
