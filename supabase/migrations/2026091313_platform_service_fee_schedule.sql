-- BaytMiftah platform/service fee schedule (admin-editable via revenue_rules).
-- Not a property tax: VAT/NHIL/GETFund apply to BaytMiftah's taxable supply (the fee).

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('platform_fee_display_name', '"BaytMiftah platform fee"', 'Checkout label for marketplace platform fee'),
  ('active_pricing_tier', '"founding"', 'Active commercial tier: founding | standard')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

-- Keep Ghana statutory rates current for platform-fee VAT estimates.
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('vat_rate', '15', 'VAT percentage applied to BaytMiftah platform fees (not property price)'),
  ('vat_enabled', 'true', 'Whether VAT estimate is shown on BaytMiftah platform fees'),
  ('nhil_rate', '2.5', 'NHIL levy percentage on BaytMiftah platform fees'),
  ('getfund_rate', '2.5', 'GETFund levy percentage on BaytMiftah platform fees')
ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = NOW();

-- Purpose-specific platform fees (admin can change fee_value / charged_to anytime).
INSERT INTO public.revenue_rules (
  rule_key, label, category, enabled, fee_type, fee_value, currency, applies_to, metadata, sort_order
) VALUES
  (
    'platform_fee_sale',
    'Property sale platform fee (founding)',
    'platform_fees',
    TRUE,
    'percentage',
    1.0,
    'GHS',
    '{"purposes":["sale","purchase","purchase_installment"],"charged_to":"seller"}'::jsonb,
    '{"fee_name":"BaytMiftah platform fee","tier":"founding"}'::jsonb,
    1
  ),
  (
    'platform_fee_sale_standard',
    'Property sale platform fee (standard)',
    'platform_fees',
    TRUE,
    'percentage',
    1.5,
    'GHS',
    '{"purposes":["sale","purchase","purchase_installment"],"charged_to":"seller"}'::jsonb,
    '{"fee_name":"BaytMiftah platform fee","tier":"standard"}'::jsonb,
    2
  ),
  (
    'platform_fee_land',
    'Land sale platform fee (founding)',
    'platform_fees',
    TRUE,
    'percentage',
    1.0,
    'GHS',
    '{"purposes":["land_sale"],"charged_to":"seller"}'::jsonb,
    '{"fee_name":"BaytMiftah platform fee","tier":"founding"}'::jsonb,
    3
  ),
  (
    'platform_fee_land_standard',
    'Land sale platform fee (standard)',
    'platform_fees',
    TRUE,
    'percentage',
    1.5,
    'GHS',
    '{"purposes":["land_sale"],"charged_to":"seller"}'::jsonb,
    '{"fee_name":"BaytMiftah platform fee","tier":"standard"}'::jsonb,
    4
  ),
  (
    'platform_fee_rent',
    'Rental payment platform fee',
    'platform_fees',
    TRUE,
    'percentage',
    2.0,
    'GHS',
    '{"purposes":["rent","lease_fee","deposit"],"charged_to":"landlord"}'::jsonb,
    '{"fee_name":"BaytMiftah platform fee","tier":"standard"}'::jsonb,
    5
  ),
  (
    'platform_fee_buyer_sale',
    'Buyer platform fee on sales',
    'platform_fees',
    TRUE,
    'percentage',
    0,
    'GHS',
    '{"purposes":["sale","purchase","purchase_installment","land_sale"],"charged_to":"buyer"}'::jsonb,
    '{"fee_name":"BaytMiftah platform fee","tier":"standard"}'::jsonb,
    6
  )
ON CONFLICT (rule_key) DO UPDATE SET
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  fee_type = EXCLUDED.fee_type,
  fee_value = EXCLUDED.fee_value,
  applies_to = EXCLUDED.applies_to,
  metadata = EXCLUDED.metadata,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- Short-stay dual fees stay off until admin enables (launch later).
UPDATE public.revenue_rules
SET enabled = FALSE, updated_at = NOW()
WHERE rule_key IN ('booking_guest_fee', 'booking_host_fee');

-- Clarify legacy catch-all.
UPDATE public.revenue_rules
SET
  label = 'Legacy transaction fee (fallback)',
  metadata = COALESCE(metadata, '{}'::jsonb) || '{"fee_name":"BaytMiftah platform fee","legacy_fallback":true}'::jsonb,
  updated_at = NOW()
WHERE rule_key = 'transaction_fee';

-- Developer subscription plans (admin-editable prices).
INSERT INTO public.subscription_plans (
  plan_key, name, description, price_amount, currency, billing_cycle, features, is_active, is_custom_pricing, sort_order
) VALUES
  (
    'developer_basic',
    'Developer Basic',
    'Free basic listings for property developers',
    0,
    'GHS',
    'monthly',
    '["Basic listings","Standard discovery","Email support"]'::jsonb,
    TRUE,
    FALSE,
    10
  ),
  (
    'developer_pro',
    'Developer Pro',
    'Featured inventory exposure for growing developers',
    1500,
    'GHS',
    'monthly',
    '["Priority placement","Lead routing","Analytics","Priority support"]'::jsonb,
    TRUE,
    FALSE,
    11
  ),
  (
    'developer_enterprise',
    'Developer Enterprise',
    'Custom sales-channel partnership for large developers',
    NULL,
    'GHS',
    'custom',
    '["Custom success fee 0.5-1%","Dedicated manager","API access","White-label options"]'::jsonb,
    TRUE,
    TRUE,
    12
  )
ON CONFLICT (plan_key) DO NOTHING;
