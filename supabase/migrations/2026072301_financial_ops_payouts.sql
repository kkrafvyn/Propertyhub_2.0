-- Financial ops hardening: organization wallets, secure payout RPCs, escrow release crediting

CREATE TABLE IF NOT EXISTS public.organization_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'GHS',
  available_minor BIGINT NOT NULL DEFAULT 0 CHECK (available_minor >= 0),
  pending_minor BIGINT NOT NULL DEFAULT 0 CHECK (pending_minor >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, currency)
);

CREATE TABLE IF NOT EXISTS public.organization_wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.organization_wallets(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN ('credit', 'debit', 'hold', 'release', 'payment', 'refund', 'payout', 'fee')
  ),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  balance_available_minor BIGINT NOT NULL DEFAULT 0,
  balance_pending_minor BIGINT NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.organization_wallets(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  payout_method TEXT NOT NULL DEFAULT 'mobile_money' CHECK (
    payout_method IN ('mobile_money', 'bank_transfer')
  ),
  payout_destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'processing', 'paid', 'rejected', 'cancelled')
  ),
  notes TEXT,
  processor_note TEXT,
  processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wallet_payout_requests
  DROP CONSTRAINT IF EXISTS wallet_payout_requests_status_check;

ALTER TABLE public.wallet_payout_requests
  ADD CONSTRAINT wallet_payout_requests_status_check
  CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'rejected', 'cancelled'));

ALTER TABLE public.wallet_payout_requests
  ADD COLUMN IF NOT EXISTS processor_note TEXT,
  ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

ALTER TABLE public.lease_rent_schedule
  ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reminder_type TEXT;

CREATE INDEX IF NOT EXISTS idx_org_wallets_org ON public.organization_wallets(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_wallet_ledger_wallet ON public.organization_wallet_ledger(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_payout_requests_org ON public.organization_payout_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_lease_rent_schedule_due ON public.lease_rent_schedule(status, due_date);

ALTER TABLE public.organization_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members can view organization wallet" ON public.organization_wallets;
CREATE POLICY "Org members can view organization wallet"
ON public.organization_wallets FOR SELECT
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_wallets.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Org managers can view organization wallet ledger" ON public.organization_wallet_ledger;
CREATE POLICY "Org managers can view organization wallet ledger"
ON public.organization_wallet_ledger FOR SELECT
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM public.organization_wallets ow
    JOIN public.organization_members om ON om.organization_id = ow.organization_id
    WHERE ow.id = organization_wallet_ledger.wallet_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Org managers can view organization payout requests" ON public.organization_payout_requests;
CREATE POLICY "Org managers can view organization payout requests"
ON public.organization_payout_requests FOR SELECT
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_payout_requests.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Org managers can create organization payout requests" ON public.organization_payout_requests;
CREATE POLICY "Org managers can create organization payout requests"
ON public.organization_payout_requests FOR INSERT
WITH CHECK (
  auth.uid() = requested_by_user_id
  AND EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = organization_payout_requests.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
  )
);

GRANT SELECT ON public.organization_wallets TO authenticated;
GRANT SELECT ON public.organization_wallet_ledger TO authenticated;
GRANT SELECT, INSERT ON public.organization_payout_requests TO authenticated;

REVOKE UPDATE ON public.user_wallets FROM authenticated;

CREATE OR REPLACE FUNCTION public.ensure_organization_wallet(
  p_organization_id UUID,
  p_currency TEXT DEFAULT 'GHS'
)
RETURNS public.organization_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_row public.organization_wallets;
BEGIN
  SELECT * INTO wallet_row
  FROM public.organization_wallets
  WHERE organization_id = p_organization_id
    AND currency = p_currency;

  IF wallet_row.id IS NOT NULL THEN
    RETURN wallet_row;
  END IF;

  INSERT INTO public.organization_wallets (organization_id, currency)
  VALUES (p_organization_id, p_currency)
  RETURNING * INTO wallet_row;

  RETURN wallet_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_organization_wallet(
  p_organization_id UUID,
  p_amount_minor BIGINT,
  p_currency TEXT DEFAULT 'GHS',
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_entry_type TEXT DEFAULT 'credit'
)
RETURNS public.organization_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_row public.organization_wallets;
  next_available BIGINT;
BEGIN
  IF p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  wallet_row := public.ensure_organization_wallet(p_organization_id, p_currency);
  next_available := wallet_row.available_minor + p_amount_minor;

  UPDATE public.organization_wallets
  SET available_minor = next_available,
      updated_at = NOW()
  WHERE id = wallet_row.id
  RETURNING * INTO wallet_row;

  INSERT INTO public.organization_wallet_ledger (
    wallet_id,
    entry_type,
    amount_minor,
    balance_available_minor,
    balance_pending_minor,
    reference_type,
    reference_id,
    description
  )
  VALUES (
    wallet_row.id,
    p_entry_type,
    p_amount_minor,
    wallet_row.available_minor,
    wallet_row.pending_minor,
    p_reference_type,
    p_reference_id,
    p_description
  );

  RETURN wallet_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.debit_organization_wallet(
  p_organization_id UUID,
  p_amount_minor BIGINT,
  p_currency TEXT DEFAULT 'GHS',
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_entry_type TEXT DEFAULT 'debit'
)
RETURNS public.organization_wallets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_row public.organization_wallets;
BEGIN
  IF p_amount_minor <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  wallet_row := public.ensure_organization_wallet(p_organization_id, p_currency);

  IF wallet_row.available_minor < p_amount_minor THEN
    RAISE EXCEPTION 'Insufficient organization wallet balance';
  END IF;

  UPDATE public.organization_wallets
  SET available_minor = wallet_row.available_minor - p_amount_minor,
      updated_at = NOW()
  WHERE id = wallet_row.id
  RETURNING * INTO wallet_row;

  INSERT INTO public.organization_wallet_ledger (
    wallet_id,
    entry_type,
    amount_minor,
    balance_available_minor,
    balance_pending_minor,
    reference_type,
    reference_id,
    description
  )
  VALUES (
    wallet_row.id,
    p_entry_type,
    p_amount_minor,
    wallet_row.available_minor,
    wallet_row.pending_minor,
    p_reference_type,
    p_reference_id,
    p_description
  );

  RETURN wallet_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_wallet_payout(
  p_user_id UUID,
  p_amount_minor BIGINT,
  p_currency TEXT DEFAULT 'GHS',
  p_payout_method TEXT DEFAULT 'mobile_money',
  p_payout_destination TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.wallet_payout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_row public.user_wallets;
  request_row public.wallet_payout_requests;
  next_available BIGINT;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized to request payout for this user';
  END IF;

  IF p_amount_minor <= 0 OR p_payout_destination IS NULL OR length(trim(p_payout_destination)) = 0 THEN
    RAISE EXCEPTION 'Invalid payout request';
  END IF;

  SELECT * INTO wallet_row
  FROM public.user_wallets
  WHERE user_id = p_user_id
    AND currency = p_currency
  FOR UPDATE;

  IF wallet_row.id IS NULL OR wallet_row.available_minor < p_amount_minor THEN
    RAISE EXCEPTION 'Insufficient available balance for this payout request';
  END IF;

  next_available := wallet_row.available_minor - p_amount_minor;

  UPDATE public.user_wallets
  SET available_minor = next_available,
      updated_at = NOW()
  WHERE id = wallet_row.id;

  INSERT INTO public.wallet_ledger (
    wallet_id,
    entry_type,
    amount_minor,
    balance_available_minor,
    balance_pending_minor,
    reference_type,
    description
  )
  VALUES (
    wallet_row.id,
    'hold',
    p_amount_minor,
    next_available,
    wallet_row.pending_minor,
    'wallet_payout_request',
    'Funds reserved for payout request'
  );

  INSERT INTO public.wallet_payout_requests (
    wallet_id,
    user_id,
    amount_minor,
    currency,
    payout_method,
    payout_destination,
    notes,
    status
  )
  VALUES (
    wallet_row.id,
    p_user_id,
    p_amount_minor,
    p_currency,
    p_payout_method,
    trim(p_payout_destination),
    p_notes,
    'pending'
  )
  RETURNING * INTO request_row;

  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.request_organization_payout(
  p_organization_id UUID,
  p_requested_by_user_id UUID,
  p_amount_minor BIGINT,
  p_currency TEXT DEFAULT 'GHS',
  p_payout_method TEXT DEFAULT 'mobile_money',
  p_payout_destination TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS public.organization_payout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  wallet_row public.organization_wallets;
  request_row public.organization_payout_requests;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_requested_by_user_id AND NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT public.is_platform_admin() AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = p_organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'Only organization managers can request payouts';
  END IF;

  wallet_row := public.ensure_organization_wallet(p_organization_id, p_currency);

  IF wallet_row.available_minor < p_amount_minor THEN
    RAISE EXCEPTION 'Insufficient organization balance for this payout request';
  END IF;

  PERFORM public.debit_organization_wallet(
    p_organization_id,
    p_amount_minor,
    p_currency,
    'organization_payout_request',
    NULL,
    'Funds reserved for organization payout request',
    'hold'
  );

  INSERT INTO public.organization_payout_requests (
    wallet_id,
    organization_id,
    requested_by_user_id,
    amount_minor,
    currency,
    payout_method,
    payout_destination,
    notes,
    status
  )
  VALUES (
    wallet_row.id,
    p_organization_id,
    p_requested_by_user_id,
    p_amount_minor,
    p_currency,
    p_payout_method,
    trim(p_payout_destination),
    p_notes,
    'pending'
  )
  RETURNING * INTO request_row;

  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_wallet_payout_request(
  p_request_id UUID,
  p_action TEXT,
  p_processor_note TEXT DEFAULT NULL
)
RETURNS public.wallet_payout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.wallet_payout_requests;
  wallet_row public.user_wallets;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can process user payout requests';
  END IF;

  SELECT * INTO request_row
  FROM public.wallet_payout_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF request_row.id IS NULL THEN
    RAISE EXCEPTION 'Payout request not found';
  END IF;

  IF request_row.status NOT IN ('pending', 'approved', 'processing') THEN
    RAISE EXCEPTION 'Payout request is not processable';
  END IF;

  SELECT * INTO wallet_row
  FROM public.user_wallets
  WHERE id = request_row.wallet_id
  FOR UPDATE;

  IF p_action = 'approve' THEN
    UPDATE public.wallet_payout_requests
    SET status = 'approved',
        processor_note = COALESCE(p_processor_note, processor_note),
        processed_by = auth.uid(),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO request_row;
  ELSIF p_action = 'mark_paid' THEN
    UPDATE public.wallet_payout_requests
    SET status = 'paid',
        processor_note = COALESCE(p_processor_note, processor_note),
        processed_by = auth.uid(),
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO request_row;

    INSERT INTO public.wallet_ledger (
      wallet_id,
      entry_type,
      amount_minor,
      balance_available_minor,
      balance_pending_minor,
      reference_type,
      reference_id,
      description
    )
    VALUES (
      wallet_row.id,
      'payout',
      request_row.amount_minor,
      wallet_row.available_minor,
      wallet_row.pending_minor,
      'wallet_payout_request',
      request_row.id,
      'Payout disbursed'
    );
  ELSIF p_action = 'reject' THEN
    UPDATE public.user_wallets
    SET available_minor = wallet_row.available_minor + request_row.amount_minor,
        updated_at = NOW()
    WHERE id = wallet_row.id
    RETURNING * INTO wallet_row;

    UPDATE public.wallet_payout_requests
    SET status = 'rejected',
        processor_note = COALESCE(p_processor_note, processor_note),
        processed_by = auth.uid(),
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO request_row;

    INSERT INTO public.wallet_ledger (
      wallet_id,
      entry_type,
      amount_minor,
      balance_available_minor,
      balance_pending_minor,
      reference_type,
      reference_id,
      description
    )
    VALUES (
      wallet_row.id,
      'release',
      request_row.amount_minor,
      wallet_row.available_minor,
      wallet_row.pending_minor,
      'wallet_payout_request',
      request_row.id,
      'Payout request rejected, funds released'
    );
  ELSE
    RAISE EXCEPTION 'Unsupported payout action';
  END IF;

  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.process_organization_payout_request(
  p_request_id UUID,
  p_action TEXT,
  p_processor_note TEXT DEFAULT NULL
)
RETURNS public.organization_payout_requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_row public.organization_payout_requests;
BEGIN
  IF NOT public.is_platform_admin() AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = (
      SELECT organization_id FROM public.organization_payout_requests WHERE id = p_request_id
    )
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'Not authorized to process this payout request';
  END IF;

  SELECT * INTO request_row
  FROM public.organization_payout_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF request_row.id IS NULL THEN
    RAISE EXCEPTION 'Organization payout request not found';
  END IF;

  IF request_row.status NOT IN ('pending', 'approved', 'processing') THEN
    RAISE EXCEPTION 'Payout request is not processable';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE public.organization_payout_requests
    SET status = 'approved',
        processor_note = COALESCE(p_processor_note, processor_note),
        processed_by = auth.uid(),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO request_row;
  ELSIF p_action = 'mark_paid' THEN
    UPDATE public.organization_payout_requests
    SET status = 'paid',
        processor_note = COALESCE(p_processor_note, processor_note),
        processed_by = auth.uid(),
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO request_row;

    INSERT INTO public.organization_wallet_ledger (
      wallet_id,
      entry_type,
      amount_minor,
      balance_available_minor,
      balance_pending_minor,
      reference_type,
      reference_id,
      description
    )
    SELECT
      request_row.wallet_id,
      'payout',
      request_row.amount_minor,
      ow.available_minor,
      ow.pending_minor,
      'organization_payout_request',
      request_row.id,
      'Organization payout disbursed'
    FROM public.organization_wallets ow
    WHERE ow.id = request_row.wallet_id;
  ELSIF p_action = 'reject' THEN
    PERFORM public.credit_organization_wallet(
      request_row.organization_id,
      request_row.amount_minor,
      request_row.currency,
      'organization_payout_request',
      request_row.id,
      'Organization payout rejected, funds returned',
      'release'
    );

    UPDATE public.organization_payout_requests
    SET status = 'rejected',
        processor_note = COALESCE(p_processor_note, processor_note),
        processed_by = auth.uid(),
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_request_id
    RETURNING * INTO request_row;
  ELSE
    RAISE EXCEPTION 'Unsupported payout action';
  END IF;

  RETURN request_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.release_escrow_hold(
  p_hold_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS public.escrow_holds
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hold_row public.escrow_holds;
  wallet_row public.user_wallets;
  platform_fee_minor BIGINT;
  net_minor BIGINT;
BEGIN
  SELECT * INTO hold_row
  FROM public.escrow_holds
  WHERE id = p_hold_id
  FOR UPDATE;

  IF hold_row IS NULL THEN
    RAISE EXCEPTION 'Escrow hold not found';
  END IF;

  IF hold_row.status <> 'held' THEN
    RAISE EXCEPTION 'Escrow hold is not releasable';
  END IF;

  IF NOT public.is_platform_admin() AND NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = hold_row.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'manager')
  ) THEN
    RAISE EXCEPTION 'Not authorized to release this escrow hold';
  END IF;

  platform_fee_minor := GREATEST(0, ROUND(hold_row.amount_minor * 0.025));
  net_minor := hold_row.amount_minor - platform_fee_minor;

  UPDATE public.escrow_holds
  SET status = 'released',
      release_note = COALESCE(p_note, release_note),
      released_at = NOW(),
      updated_at = NOW()
  WHERE id = p_hold_id
  RETURNING * INTO hold_row;

  SELECT * INTO wallet_row
  FROM public.user_wallets
  WHERE user_id = hold_row.payer_user_id
    AND currency = hold_row.currency
  FOR UPDATE;

  IF wallet_row.id IS NOT NULL THEN
    UPDATE public.user_wallets
    SET pending_minor = GREATEST(0, wallet_row.pending_minor - hold_row.amount_minor),
        updated_at = NOW()
    WHERE id = wallet_row.id;

    INSERT INTO public.wallet_ledger (
      wallet_id,
      entry_type,
      amount_minor,
      balance_available_minor,
      balance_pending_minor,
      reference_type,
      reference_id,
      description
    )
    VALUES (
      wallet_row.id,
      'release',
      hold_row.amount_minor,
      wallet_row.available_minor,
      GREATEST(0, wallet_row.pending_minor - hold_row.amount_minor),
      'escrow_hold',
      hold_row.id,
      'Escrow released to organization'
    );
  END IF;

  PERFORM public.credit_organization_wallet(
    hold_row.organization_id,
    net_minor,
    hold_row.currency,
    'escrow_hold',
    hold_row.id,
    'Escrow released to organization wallet',
    'release'
  );

  RETURN hold_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_organization_wallet(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.credit_organization_wallet(UUID, BIGINT, TEXT, TEXT, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.debit_organization_wallet(UUID, BIGINT, TEXT, TEXT, UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_wallet_payout(UUID, BIGINT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_organization_payout(UUID, UUID, BIGINT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_wallet_payout_request(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.process_organization_payout_request(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_escrow_hold(UUID, TEXT) TO authenticated;
