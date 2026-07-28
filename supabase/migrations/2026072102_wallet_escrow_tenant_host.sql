-- Wallet, escrow, tenant portal, and short-stay host foundation

ALTER TABLE public.listings
DROP CONSTRAINT IF EXISTS listings_listing_type_check;

ALTER TABLE public.listings
ADD CONSTRAINT listings_listing_type_check
CHECK (listing_type IN ('rental', 'sale', 'lease', 'short_stay'));

CREATE TABLE IF NOT EXISTS public.user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'GHS',
  available_minor BIGINT NOT NULL DEFAULT 0 CHECK (available_minor >= 0),
  pending_minor BIGINT NOT NULL DEFAULT 0 CHECK (pending_minor >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, currency)
);

CREATE TABLE IF NOT EXISTS public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN ('credit', 'debit', 'hold', 'release', 'payment', 'refund', 'payout')
  ),
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  balance_available_minor BIGINT NOT NULL DEFAULT 0,
  balance_pending_minor BIGINT NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.user_wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  payout_method TEXT NOT NULL DEFAULT 'mobile_money' CHECK (
    payout_method IN ('mobile_money', 'bank_transfer')
  ),
  payout_destination TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'paid', 'rejected', 'cancelled')
  ),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.escrow_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES public.property_transactions(id) ON DELETE CASCADE,
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  payer_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount_minor BIGINT NOT NULL CHECK (amount_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'held' CHECK (
    status IN ('held', 'released', 'disputed', 'refunded', 'cancelled')
  ),
  release_note TEXT,
  dispute_note TEXT,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_case_id UUID REFERENCES public.deal_cases(id) ON DELETE SET NULL,
  tenant_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE,
  rent_minor BIGINT NOT NULL DEFAULT 0 CHECK (rent_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('draft', 'active', 'ended', 'terminated')
  ),
  next_rent_due_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES public.leases(id) ON DELETE SET NULL,
  tenant_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (
    status IN ('open', 'in_progress', 'resolved', 'cancelled')
  ),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (
    priority IN ('low', 'normal', 'high', 'urgent')
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.short_stay_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  guest_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL CHECK (nights > 0),
  total_minor BIGINT NOT NULL CHECK (total_minor > 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'confirmed', 'cancelled', 'completed')
  ),
  transaction_id UUID REFERENCES public.property_transactions(id) ON DELETE SET NULL,
  guest_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (check_out > check_in)
);

CREATE TABLE IF NOT EXISTS public.listing_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  available_date DATE NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  price_override_minor BIGINT CHECK (price_override_minor IS NULL OR price_override_minor >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (listing_id, available_date)
);

CREATE INDEX IF NOT EXISTS idx_user_wallets_user ON public.user_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_ledger_wallet ON public.wallet_ledger(wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_escrow_holds_org ON public.escrow_holds(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leases_tenant ON public.leases(tenant_user_id, status);
CREATE INDEX IF NOT EXISTS idx_maintenance_tenant ON public.maintenance_requests(tenant_user_id, status);
CREATE INDEX IF NOT EXISTS idx_short_stay_guest ON public.short_stay_bookings(guest_user_id, status);
CREATE INDEX IF NOT EXISTS idx_short_stay_org ON public.short_stay_bookings(organization_id, check_in);
CREATE INDEX IF NOT EXISTS idx_listing_availability_listing ON public.listing_availability(listing_id, available_date);

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.short_stay_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their wallet" ON public.user_wallets;
CREATE POLICY "Users can view their wallet"
ON public.user_wallets FOR SELECT
USING (auth.uid() = user_id OR public.is_platform_admin());

DROP POLICY IF EXISTS "Users can view their wallet ledger" ON public.wallet_ledger;
CREATE POLICY "Users can view their wallet ledger"
ON public.wallet_ledger FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_wallets uw
    WHERE uw.id = wallet_ledger.wallet_id
    AND uw.user_id = auth.uid()
  )
  OR public.is_platform_admin()
);

DROP POLICY IF EXISTS "Users can manage their payout requests" ON public.wallet_payout_requests;
CREATE POLICY "Users can manage their payout requests"
ON public.wallet_payout_requests FOR ALL
USING (auth.uid() = user_id OR public.is_platform_admin())
WITH CHECK (auth.uid() = user_id OR public.is_platform_admin());

DROP POLICY IF EXISTS "Users can view their escrow holds" ON public.escrow_holds;
CREATE POLICY "Users can view their escrow holds"
ON public.escrow_holds FOR SELECT
USING (
  auth.uid() = payer_user_id
  OR public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = escrow_holds.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Org managers can update escrow holds" ON public.escrow_holds;
CREATE POLICY "Org managers can update escrow holds"
ON public.escrow_holds FOR UPDATE
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = escrow_holds.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager')
  )
);

DROP POLICY IF EXISTS "Tenants can view their leases" ON public.leases;
CREATE POLICY "Tenants can view their leases"
ON public.leases FOR SELECT
USING (
  auth.uid() = tenant_user_id
  OR public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = leases.organization_id
    AND om.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Org members can manage leases" ON public.leases;
CREATE POLICY "Org members can manage leases"
ON public.leases FOR ALL
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = leases.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager', 'agent')
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = leases.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager', 'agent')
  )
);

DROP POLICY IF EXISTS "Tenants can manage their maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Tenants can manage their maintenance requests"
ON public.maintenance_requests FOR ALL
USING (auth.uid() = tenant_user_id OR public.is_platform_admin())
WITH CHECK (auth.uid() = tenant_user_id OR public.is_platform_admin());

DROP POLICY IF EXISTS "Org members can view maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Org members can view maintenance requests"
ON public.maintenance_requests FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = maintenance_requests.organization_id
    AND om.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Org members can update maintenance requests" ON public.maintenance_requests;
CREATE POLICY "Org members can update maintenance requests"
ON public.maintenance_requests FOR UPDATE
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = maintenance_requests.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager', 'agent')
  )
);

DROP POLICY IF EXISTS "Guests can view their bookings" ON public.short_stay_bookings;
CREATE POLICY "Guests can view their bookings"
ON public.short_stay_bookings FOR SELECT
USING (
  auth.uid() = guest_user_id
  OR public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = short_stay_bookings.organization_id
    AND om.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Guests can create bookings" ON public.short_stay_bookings;
CREATE POLICY "Guests can create bookings"
ON public.short_stay_bookings FOR INSERT
WITH CHECK (auth.uid() = guest_user_id);

DROP POLICY IF EXISTS "Org members can manage bookings" ON public.short_stay_bookings;
CREATE POLICY "Org members can manage bookings"
ON public.short_stay_bookings FOR UPDATE
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.organization_id = short_stay_bookings.organization_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager', 'agent')
  )
);

DROP POLICY IF EXISTS "Anyone can view listing availability" ON public.listing_availability;
CREATE POLICY "Anyone can view listing availability"
ON public.listing_availability FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Org members can manage listing availability" ON public.listing_availability;
CREATE POLICY "Org members can manage listing availability"
ON public.listing_availability FOR ALL
USING (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM public.listings l
    JOIN public.organization_members om ON om.organization_id = l.organization_id
    WHERE l.id = listing_availability.listing_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager', 'agent')
  )
)
WITH CHECK (
  public.is_platform_admin()
  OR EXISTS (
    SELECT 1
    FROM public.listings l
    JOIN public.organization_members om ON om.organization_id = l.organization_id
    WHERE l.id = listing_availability.listing_id
    AND om.user_id = auth.uid()
    AND om.role IN ('owner', 'manager', 'agent')
  )
);

GRANT SELECT, INSERT, UPDATE ON public.user_wallets TO authenticated;
GRANT SELECT ON public.wallet_ledger TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wallet_payout_requests TO authenticated;
GRANT SELECT, UPDATE ON public.escrow_holds TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.leases TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.maintenance_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.short_stay_bookings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listing_availability TO authenticated;

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

  SELECT * INTO wallet_row
  FROM public.user_wallets
  WHERE user_id = hold_row.payer_user_id
    AND currency = hold_row.currency
  FOR UPDATE;

  UPDATE public.escrow_holds
  SET status = 'released',
      release_note = COALESCE(p_note, release_note),
      released_at = NOW(),
      updated_at = NOW()
  WHERE id = p_hold_id
  RETURNING * INTO hold_row;

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
      'Escrow released to recipient'
    );
  END IF;

  RETURN hold_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_escrow_hold(UUID, TEXT) TO authenticated;

ALTER TABLE public.transaction_receipts
DROP CONSTRAINT IF EXISTS transaction_receipts_blockchain_status_check;

ALTER TABLE public.transaction_receipts
ADD CONSTRAINT transaction_receipts_blockchain_status_check
CHECK (blockchain_status IN ('pending', 'submitted', 'confirmed', 'failed', 'disabled'));
