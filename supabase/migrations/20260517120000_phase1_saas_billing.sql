-- BaytMiftah Phase 1 SaaS foundation: subscriptions, billing events, and real admin access.
-- IoT / Smart Property Access intentionally remains documentation-only in this slice.

CREATE SCHEMA IF NOT EXISTS private;

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS business_address TEXT,
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS contact_person_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_person_phone TEXT,
  ADD COLUMN IF NOT EXISTS property_types_handled TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS public.subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  currency TEXT NOT NULL DEFAULT 'GHS',
  price_minor INTEGER NOT NULL CHECK (price_minor >= 0),
  billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval = 'monthly'),
  agent_seat_limit INTEGER CHECK (agent_seat_limit IS NULL OR agent_seat_limit > 0),
  active_listing_limit INTEGER CHECK (active_listing_limit IS NULL OR active_listing_limit > 0),
  paystack_plan_code TEXT,
  feature_summary TEXT[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  tier_id TEXT NOT NULL REFERENCES public.subscription_tiers(id),
  pending_tier_id TEXT REFERENCES public.subscription_tiers(id),
  pending_tier_effective_at TIMESTAMPTZ,
  provider TEXT NOT NULL DEFAULT 'paystack' CHECK (provider = 'paystack'),
  status TEXT NOT NULL DEFAULT 'pending_payment' CHECK (
    status IN (
      'pending_payment',
      'active',
      'grace_period',
      'past_due',
      'suspended',
      'cancelled'
    )
  ),
  paystack_customer_code TEXT,
  paystack_subscription_code TEXT,
  paystack_email_token TEXT,
  paystack_plan_code TEXT,
  provider_reference TEXT,
  authorization_url TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  next_payment_at TIMESTAMPTZ,
  grace_period_ends_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  activated_at TIMESTAMPTZ,
  suspended_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id)
);

CREATE TABLE IF NOT EXISTS public.organization_subscription_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.organization_subscriptions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'paystack' CHECK (provider = 'paystack'),
  provider_reference TEXT NOT NULL,
  provider_transaction_id TEXT,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'initialized' CHECK (
    status IN ('initialized', 'pending', 'success', 'failed', 'abandoned', 'reversed')
  ),
  paid_at TIMESTAMPTZ,
  payment_channel TEXT,
  gateway_response TEXT,
  authorization_url TEXT,
  access_code TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, provider_reference)
);

CREATE TABLE IF NOT EXISTS public.subscription_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.organization_subscriptions(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.organization_subscription_payments(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL UNIQUE,
  amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency TEXT NOT NULL DEFAULT 'GHS',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'paid', 'failed', 'void', 'refunded')
  ),
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  invoice_pdf_url TEXT,
  storage_bucket TEXT,
  storage_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.organization_billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.organization_subscriptions(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'support', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.subscription_tiers (
  id,
  name,
  description,
  currency,
  price_minor,
  billing_interval,
  agent_seat_limit,
  active_listing_limit,
  feature_summary,
  sort_order
)
VALUES
  (
    'starter',
    'Starter',
    'Independent landlords and small agencies getting organized.',
    'GHS',
    20000,
    'monthly',
    3,
    15,
    ARRAY['Up to 3 agents', 'Up to 15 active listings', 'Workspace, billing, team, and verification basics'],
    10
  ),
  (
    'growth',
    'Growth',
    'Mid-size agencies ready for a tighter operating rhythm.',
    'GHS',
    50000,
    'monthly',
    10,
    60,
    ARRAY['Up to 10 agents', 'Up to 60 active listings', 'Workspace, billing, team, and verification basics'],
    20
  ),
  (
    'pro',
    'Pro',
    'Large agencies and enterprise operators with unlimited seats and inventory.',
    'GHS',
    120000,
    'monthly',
    NULL,
    NULL,
    ARRAY['Unlimited agents', 'Unlimited active listings', 'Workspace, billing, team, and verification basics'],
    30
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  currency = EXCLUDED.currency,
  price_minor = EXCLUDED.price_minor,
  billing_interval = EXCLUDED.billing_interval,
  agent_seat_limit = EXCLUDED.agent_seat_limit,
  active_listing_limit = EXCLUDED.active_listing_limit,
  feature_summary = EXCLUDED.feature_summary,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();

CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins admin
    WHERE admin.user_id = auth.uid()
      AND admin.status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION private.can_manage_platform()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins admin
    WHERE admin.user_id = auth.uid()
      AND admin.status = 'active'
      AND admin.role IN ('admin', 'support')
  );
$$;

CREATE OR REPLACE FUNCTION private.is_organization_member(target_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = target_organization_id
      AND membership.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION private.can_manage_organization_billing(target_organization_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members membership
    WHERE membership.organization_id = target_organization_id
      AND membership.user_id = auth.uid()
      AND membership.role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION private.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_manage_platform() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_organization_member(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.can_manage_organization_billing(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION private.is_platform_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_platform() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.is_organization_member(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION private.can_manage_organization_billing(UUID) TO anon, authenticated;

DROP TRIGGER IF EXISTS set_subscription_tiers_updated_at ON public.subscription_tiers;
CREATE TRIGGER set_subscription_tiers_updated_at
BEFORE UPDATE ON public.subscription_tiers
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_organization_subscriptions_updated_at ON public.organization_subscriptions;
CREATE TRIGGER set_organization_subscriptions_updated_at
BEFORE UPDATE ON public.organization_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_organization_subscription_payments_updated_at ON public.organization_subscription_payments;
CREATE TRIGGER set_organization_subscription_payments_updated_at
BEFORE UPDATE ON public.organization_subscription_payments
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_subscription_invoices_updated_at ON public.subscription_invoices;
CREATE TRIGGER set_subscription_invoices_updated_at
BEFORE UPDATE ON public.subscription_invoices
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP TRIGGER IF EXISTS set_platform_admins_updated_at ON public.platform_admins;
CREATE TRIGGER set_platform_admins_updated_at
BEFORE UPDATE ON public.platform_admins
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

CREATE INDEX IF NOT EXISTS idx_subscription_tiers_active_sort
ON public.subscription_tiers(is_active, sort_order);

CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_organization
ON public.organization_subscriptions(organization_id);

CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_status
ON public.organization_subscriptions(status);

CREATE INDEX IF NOT EXISTS idx_organization_subscriptions_paystack_subscription
ON public.organization_subscriptions(paystack_subscription_code);

CREATE INDEX IF NOT EXISTS idx_organization_subscription_payments_subscription
ON public.organization_subscription_payments(subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_organization_subscription_payments_reference
ON public.organization_subscription_payments(provider, provider_reference);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_subscription
ON public.subscription_invoices(subscription_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_organization_billing_events_organization
ON public.organization_billing_events(organization_id, created_at DESC);

ALTER TABLE public.subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_subscription_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.subscription_tiers TO anon, authenticated;
GRANT SELECT ON public.organization_subscriptions TO authenticated;
GRANT SELECT ON public.organization_subscription_payments TO authenticated;
GRANT SELECT ON public.subscription_invoices TO authenticated;
GRANT SELECT, INSERT ON public.organization_billing_events TO authenticated;
GRANT SELECT ON public.platform_admins TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

DROP POLICY IF EXISTS "Anyone can view active subscription tiers" ON public.subscription_tiers;
CREATE POLICY "Anyone can view active subscription tiers"
ON public.subscription_tiers FOR SELECT
USING (is_active = TRUE);

DROP POLICY IF EXISTS "Platform admins can manage subscription tiers" ON public.subscription_tiers;
CREATE POLICY "Platform admins can manage subscription tiers"
ON public.subscription_tiers FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Org members and admins can view subscriptions" ON public.organization_subscriptions;
CREATE POLICY "Org members and admins can view subscriptions"
ON public.organization_subscriptions FOR SELECT
USING (
  private.is_platform_admin()
  OR private.is_organization_member(organization_subscriptions.organization_id)
);

DROP POLICY IF EXISTS "Owners can update subscription preferences" ON public.organization_subscriptions;
CREATE POLICY "Owners can update subscription preferences"
ON public.organization_subscriptions FOR UPDATE
USING (private.can_manage_organization_billing(organization_id) OR private.can_manage_platform())
WITH CHECK (private.can_manage_organization_billing(organization_id) OR private.can_manage_platform());

DROP POLICY IF EXISTS "Org members and admins can view subscription payments" ON public.organization_subscription_payments;
CREATE POLICY "Org members and admins can view subscription payments"
ON public.organization_subscription_payments FOR SELECT
USING (
  private.is_platform_admin()
  OR private.is_organization_member(organization_subscription_payments.organization_id)
);

DROP POLICY IF EXISTS "Org members and admins can view subscription invoices" ON public.subscription_invoices;
CREATE POLICY "Org members and admins can view subscription invoices"
ON public.subscription_invoices FOR SELECT
USING (
  private.is_platform_admin()
  OR private.is_organization_member(subscription_invoices.organization_id)
);

DROP POLICY IF EXISTS "Org members and admins can view billing events" ON public.organization_billing_events;
CREATE POLICY "Org members and admins can view billing events"
ON public.organization_billing_events FOR SELECT
USING (
  private.is_platform_admin()
  OR private.is_organization_member(organization_billing_events.organization_id)
);

DROP POLICY IF EXISTS "Owners and admins can create billing events" ON public.organization_billing_events;
CREATE POLICY "Owners and admins can create billing events"
ON public.organization_billing_events FOR INSERT
WITH CHECK (
  private.can_manage_platform()
  OR private.can_manage_organization_billing(organization_billing_events.organization_id)
);

DROP POLICY IF EXISTS "Platform admins can view admin roster" ON public.platform_admins;
CREATE POLICY "Platform admins can view admin roster"
ON public.platform_admins FOR SELECT
USING (user_id = auth.uid() OR private.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can manage admin roster" ON public.platform_admins;
CREATE POLICY "Platform admins can manage admin roster"
ON public.platform_admins FOR ALL
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Platform admins can view all organizations" ON public.organizations;
CREATE POLICY "Platform admins can view all organizations"
ON public.organizations FOR SELECT
USING (private.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can update organizations" ON public.organizations;
CREATE POLICY "Platform admins can update organizations"
ON public.organizations FOR UPDATE
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Platform admins can view all members" ON public.organization_members;
CREATE POLICY "Platform admins can view all members"
ON public.organization_members FOR SELECT
USING (private.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all invitations" ON public.organization_invitations;
CREATE POLICY "Platform admins can view all invitations"
ON public.organization_invitations FOR SELECT
USING (private.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can view all listings" ON public.listings;
CREATE POLICY "Platform admins can view all listings"
ON public.listings FOR SELECT
USING (private.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins can moderate listings" ON public.listings;
CREATE POLICY "Platform admins can moderate listings"
ON public.listings FOR UPDATE
USING (private.can_manage_platform())
WITH CHECK (private.can_manage_platform());

DROP POLICY IF EXISTS "Platform admins can view audit logs" ON public.audit_logs;
CREATE POLICY "Platform admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (private.is_platform_admin());

CREATE OR REPLACE FUNCTION private.enforce_active_listing_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  current_limit INTEGER;
  active_count INTEGER;
  subscription_status TEXT;
  paid_until TIMESTAMPTZ;
BEGIN
  IF NOT (NEW.status = 'listed' AND NEW.visibility = 'public') THEN
    RETURN NEW;
  END IF;

  SELECT
    tier.active_listing_limit,
    subscription.status,
    subscription.current_period_end
  INTO current_limit, subscription_status, paid_until
  FROM public.organization_subscriptions subscription
  JOIN public.subscription_tiers tier
    ON tier.id = subscription.tier_id
  WHERE subscription.organization_id = NEW.organization_id
  ORDER BY subscription.created_at DESC
  LIMIT 1;

  IF subscription_status IS NULL THEN
    RAISE EXCEPTION 'A paid subscription is required before publishing active listings';
  END IF;

  IF subscription_status NOT IN ('active', 'grace_period')
    AND NOT (subscription_status = 'cancelled' AND paid_until > NOW())
  THEN
    RAISE EXCEPTION 'This workspace subscription is not active enough to publish listings';
  END IF;

  IF current_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO active_count
  FROM public.listings listing
  WHERE listing.organization_id = NEW.organization_id
    AND listing.status = 'listed'
    AND listing.visibility = 'public'
    AND listing.id <> NEW.id;

  IF active_count >= current_limit THEN
    RAISE EXCEPTION 'This subscription tier has reached its active listing limit';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_active_listing_limit ON public.listings;
CREATE TRIGGER enforce_active_listing_limit
BEFORE INSERT OR UPDATE OF status, visibility, organization_id
ON public.listings
FOR EACH ROW
EXECUTE FUNCTION private.enforce_active_listing_limit();

COMMENT ON TABLE public.subscription_tiers IS
  'BaytMiftah SaaS subscription tiers. Seeded with starter, growth, and pro Phase 1 pricing.';
COMMENT ON TABLE public.organization_subscriptions IS
  'Current Paystack-backed SaaS subscription state for each organization workspace.';
COMMENT ON TABLE public.organization_subscription_payments IS
  'SaaS subscription payment attempts and successful recurring payments, separate from property payment escrow.';
COMMENT ON TABLE public.platform_admins IS
  'Authoritative platform admin roster. Do not rely on user-editable auth metadata for admin access.';

NOTIFY pgrst, 'reload schema';
