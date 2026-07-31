-- Platform revenue management: dynamic fees, plans, promos, gateways

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.revenue_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  fee_type TEXT NOT NULL DEFAULT 'fixed'
    CHECK (fee_type IN ('fixed', 'percentage', 'tiered', 'custom')),
  fee_value NUMERIC,
  fee_value_secondary NUMERIC,
  currency TEXT NOT NULL DEFAULT 'GHS',
  min_fee NUMERIC,
  max_fee NUMERIC,
  applies_to JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  effective_from TIMESTAMPTZ,
  effective_until TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revenue_rules_category ON public.revenue_rules(category, enabled);

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_amount NUMERIC,
  currency TEXT NOT NULL DEFAULT 'GHS',
  billing_cycle TEXT NOT NULL DEFAULT 'monthly'
    CHECK (billing_cycle IN ('monthly', 'yearly', 'custom')),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_custom_pricing BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  applies_to TEXT NOT NULL DEFAULT 'any',
  currency TEXT DEFAULT 'GHS',
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gateway_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  fee_type TEXT NOT NULL DEFAULT 'percentage'
    CHECK (fee_type IN ('fixed', 'percentage')),
  fee_value NUMERIC,
  supported_currencies TEXT[] NOT NULL DEFAULT '{}',
  supported_regions TEXT[] NOT NULL DEFAULT '{}',
  api_status TEXT NOT NULL DEFAULT 'unknown'
    CHECK (api_status IN ('connected', 'disconnected', 'unknown', 'error')),
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform admins manage platform_settings" ON public.platform_settings;
CREATE POLICY "Platform admins manage platform_settings" ON public.platform_settings
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Anyone read platform_settings" ON public.platform_settings;
CREATE POLICY "Anyone read platform_settings" ON public.platform_settings
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Platform admins manage revenue_rules" ON public.revenue_rules;
CREATE POLICY "Platform admins manage revenue_rules" ON public.revenue_rules
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Anyone read revenue_rules" ON public.revenue_rules;
CREATE POLICY "Anyone read revenue_rules" ON public.revenue_rules
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "Platform admins manage subscription_plans" ON public.subscription_plans;
CREATE POLICY "Platform admins manage subscription_plans" ON public.subscription_plans
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Anyone read active subscription_plans" ON public.subscription_plans;
CREATE POLICY "Anyone read active subscription_plans" ON public.subscription_plans
  FOR SELECT USING (is_active = TRUE OR public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins manage promo_codes" ON public.promo_codes;
CREATE POLICY "Platform admins manage promo_codes" ON public.promo_codes
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Anyone read active promo_codes" ON public.promo_codes;
CREATE POLICY "Anyone read active promo_codes" ON public.promo_codes
  FOR SELECT USING (is_active = TRUE OR public.is_platform_admin());

DROP POLICY IF EXISTS "Platform admins manage payment_gateways" ON public.payment_gateways;
CREATE POLICY "Platform admins manage payment_gateways" ON public.payment_gateways
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Anyone read payment_gateways" ON public.payment_gateways;
CREATE POLICY "Anyone read payment_gateways" ON public.payment_gateways
  FOR SELECT USING (TRUE);

GRANT SELECT ON public.platform_settings, public.revenue_rules, public.subscription_plans, public.promo_codes, public.payment_gateways TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.platform_settings, public.revenue_rules, public.subscription_plans, public.promo_codes, public.payment_gateways TO authenticated;

-- Platform defaults
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('default_currency', '"GHS"', 'Default platform currency'),
  ('default_country', '"GH"', 'Default country code'),
  ('vat_rate', '15', 'VAT percentage'),
  ('vat_enabled', 'true', 'Whether VAT is applied to platform fees'),
  ('nhil_rate', '2.5', 'NHIL levy percentage (Ghana)'),
  ('getfund_rate', '2.5', 'GETFund levy percentage (Ghana)'),
  ('tax_inclusive_pricing', 'false', 'Whether displayed prices include tax')
ON CONFLICT (key) DO NOTHING;

-- Revenue rules
INSERT INTO public.revenue_rules (rule_key, label, category, enabled, fee_type, fee_value, currency, applies_to, sort_order) VALUES
  ('premium_listing', 'Premium Listings', 'listing_fees', TRUE, 'fixed', 200, 'GHS',
    '{"listing_types":["sale","rental","lease","short_stay"]}'::jsonb, 1),
  ('featured_listing', 'Featured Listing Boost', 'listing_fees', FALSE, 'fixed', 75, 'GHS',
    '{"listing_types":["sale","rental","lease","short_stay"]}'::jsonb, 2),
  ('transaction_fee', 'Transaction Fee', 'transaction_fees', TRUE, 'percentage', 1.5, 'GHS', '{}'::jsonb, 10),
  ('booking_guest_fee', 'Guest Booking Fee', 'booking_fees', TRUE, 'percentage', 5, 'GHS', '{"side":"guest"}'::jsonb, 20),
  ('booking_host_fee', 'Host Commission', 'booking_fees', TRUE, 'percentage', 8, 'GHS', '{"side":"host"}'::jsonb, 21),
  ('escrow_fee', 'Escrow Fee', 'escrow_fees', FALSE, 'percentage', 1, 'GHS', '{}'::jsonb, 30),
  ('wallet_topup_fee', 'Wallet Top-up Fee', 'wallet_fees', FALSE, 'percentage', 0.5, 'GHS', '{}'::jsonb, 40),
  ('wallet_payout_fee', 'Wallet Payout Fee', 'wallet_fees', FALSE, 'fixed', 5, 'GHS', '{}'::jsonb, 41),
  ('agency_verification', 'Agency Verification', 'verification_fees', TRUE, 'fixed', 300, 'GHS', '{"role":"agency"}'::jsonb, 50),
  ('agent_verification', 'Agent Verification', 'verification_fees', TRUE, 'fixed', 150, 'GHS', '{"role":"agent"}'::jsonb, 51),
  ('property_verification', 'Property Verification', 'verification_fees', TRUE, 'fixed', 100, 'GHS', '{"role":"property"}'::jsonb, 52),
  ('vendor_marketplace_commission', 'Vendor Marketplace Commission', 'marketplace_commissions', TRUE, 'percentage', 10, 'GHS', '{}'::jsonb, 60),
  ('enterprise_setup_fee', 'Enterprise Setup Fee', 'enterprise_pricing', TRUE, 'fixed', 5000, 'GHS', '{}'::jsonb, 70),
  ('enterprise_per_seat', 'Enterprise Per-Seat Fee', 'enterprise_pricing', TRUE, 'fixed', 50, 'GHS', '{"unit":"seat","cycle":"monthly"}'::jsonb, 71)
ON CONFLICT (rule_key) DO NOTHING;

-- Subscription plans
INSERT INTO public.subscription_plans (plan_key, name, description, price_amount, currency, billing_cycle, features, is_active, is_custom_pricing, sort_order) VALUES
  ('starter', 'Starter', 'For independent agents getting started', 150, 'GHS', 'monthly',
    '["Up to 10 listings","Basic CRM","Email support"]'::jsonb, TRUE, FALSE, 1),
  ('professional', 'Professional', 'For growing agencies', 600, 'GHS', 'monthly',
    '["Unlimited listings","Team workspace","Automation","Priority support"]'::jsonb, TRUE, FALSE, 2),
  ('enterprise', 'Enterprise', 'Custom pricing for large operators', NULL, 'GHS', 'custom',
    '["White-label","API access","Dedicated success manager","Custom workflows"]'::jsonb, TRUE, TRUE, 3)
ON CONFLICT (plan_key) DO NOTHING;

-- Promo codes
INSERT INTO public.promo_codes (code, label, discount_type, discount_value, applies_to, max_uses, expires_at, is_active) VALUES
  ('NEWAGENCY50', '50% off Agency Pro', 'percentage', 50, 'agency_pro', 100, '2026-12-31T23:59:59Z', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Payment gateways
INSERT INTO public.payment_gateways (gateway_key, display_name, enabled, fee_type, fee_value, supported_currencies, supported_regions, api_status, sort_order) VALUES
  ('paystack', 'Paystack', TRUE, 'percentage', 1.5, ARRAY['GHS','NGN','ZAR','KES','USD'], ARRAY['GH','NG','ZA','KE','GLOBAL'], 'unknown', 1),
  ('stripe', 'Stripe', FALSE, 'percentage', 2.9, ARRAY['USD','EUR','GBP'], ARRAY['US','EU','GB','GLOBAL'], 'unknown', 2),
  ('mobile_money', 'Mobile Money (Direct)', FALSE, 'percentage', 1.5, ARRAY['GHS'], ARRAY['GH'], 'disconnected', 3)
ON CONFLICT (gateway_key) DO NOTHING;
