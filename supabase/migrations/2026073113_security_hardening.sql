-- BaytMiftah production security hardening
-- Addresses privilege escalation, PII exposure, payment tampering, audit integrity, and escrow auth.

-- ============ USERS: protect privileged columns ============
CREATE OR REPLACE FUNCTION public.protect_users_privileged_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF auth.uid() IS DISTINCT FROM OLD.id AND NOT public.is_platform_admin() THEN
      RAISE EXCEPTION 'Not authorized to update this user';
    END IF;

    IF auth.uid() = OLD.id AND NOT public.is_platform_admin() THEN
      IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
        RAISE EXCEPTION 'Cannot modify platform admin flag';
      END IF;
      IF NEW.banned IS DISTINCT FROM OLD.banned THEN
        RAISE EXCEPTION 'Cannot modify banned status';
      END IF;
      IF NEW.verified IS DISTINCT FROM OLD.verified THEN
        RAISE EXCEPTION 'Cannot modify verified status';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_users_privileged_columns ON public.users;
CREATE TRIGGER trg_protect_users_privileged_columns
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.protect_users_privileged_columns();

-- ============ USERS: restrict public PII exposure ============
DROP POLICY IF EXISTS "Allow public profile view (limited fields)" ON public.users;

REVOKE SELECT ON public.users FROM anon;

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  full_name,
  avatar_url,
  verified,
  created_at
FROM public.users;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Conversation partners may see limited contact info
DROP POLICY IF EXISTS "Users can view conversation partner profiles" ON public.users;
CREATE POLICY "Users can view conversation partner profiles"
ON public.users FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE (c.participant_1_id = auth.uid() AND c.participant_2_id = users.id)
       OR (c.participant_2_id = auth.uid() AND c.participant_1_id = users.id)
  )
);

-- Org members can see teammate names
DROP POLICY IF EXISTS "Org members can view teammate profiles" ON public.users;
CREATE POLICY "Org members can view teammate profiles"
ON public.users FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1
    FROM public.organization_members om_self
    JOIN public.organization_members om_peer
      ON om_self.organization_id = om_peer.organization_id
    WHERE om_self.user_id = auth.uid()
      AND om_peer.user_id = users.id
  )
);

-- Platform admins retain full user access
DROP POLICY IF EXISTS "Platform admins can view all users" ON public.users;
CREATE POLICY "Platform admins can view all users"
ON public.users FOR SELECT
USING (public.is_platform_admin());

-- ============ PROPERTY TRANSACTIONS: server-only writes ============
REVOKE INSERT, UPDATE ON public.property_transactions FROM authenticated;
GRANT SELECT ON public.property_transactions TO authenticated;

DROP POLICY IF EXISTS "Users can create their own property transactions" ON public.property_transactions;
DROP POLICY IF EXISTS "Users can update their own pending property transactions" ON public.property_transactions;

-- ============ TRANSACTIONS & AUDIT LOGS: no client forgery ============
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.transactions FROM authenticated;

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert transactions" ON public.transactions;

CREATE OR REPLACE FUNCTION public.write_audit_log(
  p_action TEXT,
  p_entity_type TEXT DEFAULT NULL,
  p_entity_id TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  INSERT INTO public.audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (
    auth.uid(),
    p_action,
    COALESCE(p_entity_type, 'system'),
    COALESCE(p_entity_id, 'n/a'),
    COALESCE(p_details, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.write_audit_log(TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ============ WALLET LEDGER: idempotency + immutability ============
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_ledger_idempotency
ON public.wallet_ledger (wallet_id, reference_type, reference_id, entry_type)
WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_org_wallet_ledger_idempotency
ON public.organization_wallet_ledger (wallet_id, reference_type, reference_id, entry_type)
WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.prevent_wallet_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Wallet ledger entries are immutable';
END;
$$;

DROP TRIGGER IF EXISTS trg_wallet_ledger_immutable ON public.wallet_ledger;
CREATE TRIGGER trg_wallet_ledger_immutable
BEFORE UPDATE OR DELETE ON public.wallet_ledger
FOR EACH ROW EXECUTE FUNCTION public.prevent_wallet_ledger_mutation();

DROP TRIGGER IF EXISTS trg_org_wallet_ledger_immutable ON public.organization_wallet_ledger;
CREATE TRIGGER trg_org_wallet_ledger_immutable
BEFORE UPDATE OR DELETE ON public.organization_wallet_ledger
FOR EACH ROW EXECUTE FUNCTION public.prevent_wallet_ledger_mutation();

-- ============ ESCROW: partial release authorization ============
CREATE OR REPLACE FUNCTION public.release_partial_escrow_hold(
  p_hold_id UUID,
  p_amount_minor BIGINT,
  p_note TEXT DEFAULT NULL
)
RETURNS public.escrow_holds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hold_row public.escrow_holds;
BEGIN
  IF p_amount_minor IS NULL OR p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'Release amount must be positive';
  END IF;

  SELECT * INTO hold_row
  FROM public.escrow_holds
  WHERE id = p_hold_id
  FOR UPDATE;

  IF hold_row IS NULL THEN
    RAISE EXCEPTION 'Escrow hold not found';
  END IF;

  IF NOT public.is_platform_admin() AND NOT EXISTS (
    SELECT 1
    FROM public.organization_members om
    WHERE om.organization_id = hold_row.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'Not authorized to release escrow';
  END IF;

  IF hold_row.status <> 'held' THEN
    RAISE EXCEPTION 'Escrow hold is not releasable';
  END IF;

  IF p_amount_minor >= hold_row.amount_minor THEN
    RETURN public.release_escrow_hold(p_hold_id, p_note);
  END IF;

  UPDATE public.escrow_holds
  SET amount_minor = hold_row.amount_minor - p_amount_minor,
      release_note = COALESCE(p_note, release_note),
      updated_at = NOW()
  WHERE id = p_hold_id
  RETURNING * INTO hold_row;

  RETURN hold_row;
END;
$$;

-- ============ WEBHOOK REPLAY PROTECTION ============
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  reference TEXT,
  payload JSONB,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, event_id)
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins can view webhook events" ON public.webhook_events;
CREATE POLICY "Platform admins can view webhook events"
ON public.webhook_events FOR SELECT
USING (public.is_platform_admin());

-- ============ RATE LIMITING ============
CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  hit_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
-- No client policies — service role / security definer only

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_bucket_key TEXT,
  p_max_hits INTEGER DEFAULT 30,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.rate_limit_buckets%ROWTYPE;
BEGIN
  SELECT * INTO v_row
  FROM public.rate_limit_buckets
  WHERE bucket_key = p_bucket_key
  FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.rate_limit_buckets (bucket_key, hit_count, window_start)
    VALUES (p_bucket_key, 1, NOW())
    ON CONFLICT (bucket_key) DO UPDATE
    SET hit_count = 1, window_start = NOW();
    RETURN TRUE;
  END IF;

  IF v_row.window_start + make_interval(secs => p_window_seconds) < NOW() THEN
    UPDATE public.rate_limit_buckets
    SET hit_count = 1, window_start = NOW()
    WHERE bucket_key = p_bucket_key;
    RETURN TRUE;
  END IF;

  IF v_row.hit_count >= p_max_hits THEN
    RETURN FALSE;
  END IF;

  UPDATE public.rate_limit_buckets
  SET hit_count = hit_count + 1
  WHERE bucket_key = p_bucket_key;

  RETURN TRUE;
END;
$$;

-- ============ AUTOMATION RUNS: admin only ============
DROP POLICY IF EXISTS "Authenticated users can view automation runs" ON public.automation_runs;
CREATE POLICY "Platform admins can view automation runs"
ON public.automation_runs FOR SELECT
USING (public.is_platform_admin());

-- ============ PAYMENT GATEWAYS: hide secrets in config ============
CREATE OR REPLACE VIEW public.payment_gateways_public
WITH (security_invoker = true)
AS
SELECT
  id,
  gateway_key,
  display_name,
  enabled,
  fee_type,
  fee_value,
  supported_currencies,
  supported_regions,
  api_status,
  sort_order,
  created_at,
  updated_at
FROM public.payment_gateways;

GRANT SELECT ON public.payment_gateways_public TO authenticated;

DROP POLICY IF EXISTS "Anyone read payment_gateways" ON public.payment_gateways;
CREATE POLICY "Platform admins manage payment gateways"
ON public.payment_gateways FOR ALL
USING (public.is_platform_admin())
WITH CHECK (public.is_platform_admin());

CREATE POLICY "Authenticated users read payment gateway metadata"
ON public.payment_gateways FOR SELECT
USING (public.is_platform_admin());

-- ============ REVENUE SETTINGS: admin-only reads ============
DROP POLICY IF EXISTS "Anyone read platform_settings" ON public.platform_settings;
DROP POLICY IF EXISTS "Anyone read revenue_rules" ON public.revenue_rules;

CREATE POLICY "Authenticated read platform settings"
ON public.platform_settings FOR SELECT
USING (TRUE);

CREATE POLICY "Authenticated read revenue rules"
ON public.revenue_rules FOR SELECT
USING (TRUE);

-- ============ PROMO CODES: hide inactive from non-admins ============
DROP POLICY IF EXISTS "Anyone read active promo_codes" ON public.promo_codes;
DROP POLICY IF EXISTS "Anyone read promo_codes" ON public.promo_codes;
CREATE POLICY "Users read active promo codes"
ON public.promo_codes FOR SELECT
USING ((is_active = TRUE AND (expires_at IS NULL OR expires_at > NOW())) OR public.is_platform_admin());

-- ============ FRAUD ALERTS: fix invalid role ============
DROP POLICY IF EXISTS "fraud_alerts_select" ON public.fraud_alerts;
CREATE POLICY "fraud_alerts_org_select"
ON public.fraud_alerts FOR SELECT
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = fraud_alerts.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
  )
);

-- ============ BLOCKCHAIN: restrict client inserts ============
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'blockchain_records',
    'blockchain_transactions',
    'property_token_holdings'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS "System can insert %I" ON public.%I', tbl, tbl);
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM authenticated', tbl);
    END IF;
  END LOOP;
END $$;

-- ============ USER SESSIONS (device management) ============
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_label TEXT,
  user_agent TEXT,
  ip_address TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON public.user_sessions(user_id, last_seen_at DESC);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own sessions" ON public.user_sessions;
CREATE POLICY "Users manage own sessions"
ON public.user_sessions FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_sessions TO authenticated;

COMMENT ON VIEW public.public_profiles IS 'Safe public user fields — no email, phone, or admin flags.';
