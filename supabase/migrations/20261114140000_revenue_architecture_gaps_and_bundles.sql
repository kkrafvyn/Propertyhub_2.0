-- Fill revenue architecture gaps: land/buyer fees, contractor lead fee,
-- escrow/wallet not_now tags, 8 offer bundles, price hints.
-- Preserves admin-edited enabled / fee_value via upsert helper.

-- Ensure helper exists (idempotent recreate matching prior migration).
CREATE OR REPLACE FUNCTION private.upsert_revenue_catalog_rule(
  p_rule_key TEXT,
  p_label TEXT,
  p_category TEXT,
  p_enabled BOOLEAN,
  p_fee_type TEXT,
  p_fee_value NUMERIC,
  p_fee_value_secondary NUMERIC,
  p_currency TEXT,
  p_applies_to JSONB,
  p_metadata JSONB,
  p_sort_order INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SET search_path = public, private
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.revenue_rules WHERE rule_key = p_rule_key) THEN
    UPDATE public.revenue_rules
    SET
      label = p_label,
      category = p_category,
      applies_to = p_applies_to,
      metadata = COALESCE(metadata, '{}'::jsonb) || p_metadata,
      sort_order = p_sort_order,
      updated_at = NOW()
    WHERE rule_key = p_rule_key;
  ELSE
    INSERT INTO public.revenue_rules (
      rule_key, label, category, enabled, fee_type, fee_value, fee_value_secondary,
      currency, applies_to, metadata, sort_order
    ) VALUES (
      p_rule_key, p_label, p_category, p_enabled, p_fee_type, p_fee_value, p_fee_value_secondary,
      p_currency, p_applies_to, p_metadata, p_sort_order
    );
  END IF;
END;
$$;

-- A. Missing payment / fee rows
SELECT private.upsert_revenue_catalog_rule(
  'platform_fee_land', 'Land sale platform fee (founding)', 'platform_fees', TRUE, 'percentage', 1.0, NULL, 'GHS',
  '{"purposes":["land_sale"],"charged_to":"seller"}'::jsonb,
  '{"stream_id":9,"architecture_id":9,"stage":"later","group":"payments","tier":"founding","payer":"seller","fee_name":"BaytMiftah platform fee","price_hint":"1% founding on land sales","launch_stance":"Grow after supply/traffic"}'::jsonb,
  3
);
SELECT private.upsert_revenue_catalog_rule(
  'platform_fee_land_standard', 'Land sale platform fee (standard)', 'platform_fees', TRUE, 'percentage', 1.5, NULL, 'GHS',
  '{"purposes":["land_sale"],"charged_to":"seller"}'::jsonb,
  '{"stream_id":9,"architecture_id":9,"stage":"later","group":"payments","tier":"standard","payer":"seller","fee_name":"BaytMiftah platform fee","price_hint":"1.5% standard on land sales","launch_stance":"Grow after supply/traffic"}'::jsonb,
  4
);
SELECT private.upsert_revenue_catalog_rule(
  'platform_fee_buyer_sale', 'Buyer platform fee on sales', 'platform_fees', TRUE, 'percentage', 0, NULL, 'GHS',
  '{"purposes":["sale","purchase","purchase_installment","land_sale"],"charged_to":"buyer"}'::jsonb,
  '{"stream_id":9,"architecture_id":9,"stage":"later","group":"payments","tier":"standard","payer":"buyer","fee_name":"BaytMiftah platform fee","price_hint":"0% default — raise when ready","launch_stance":"Grow after supply/traffic"}'::jsonb,
  6
);
SELECT private.upsert_revenue_catalog_rule(
  'contractor_lead_fee', 'Contractor marketplace lead fee', 'marketplace_commissions', FALSE, 'fixed', 50, NULL, 'GHS',
  '{"unit":"lead","charged_to":"vendor"}'::jsonb,
  '{"stream_id":15,"architecture_id":15,"stage":"later","group":"marketplace","payer":"vendor","price_hint":"GH₵50/lead or 5–10% completion","launch_stance":"Grow after supply/traffic"}'::jsonb,
  61
);

-- Tag escrow / wallet as not_now (do not flip enabled)
UPDATE public.revenue_rules
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'stage', 'not_now',
  'group', 'payments',
  'launch_stance', 'Requires regulated custody model',
  'price_hint', 'Keep OFF until licensed escrow/wallet model'
),
updated_at = NOW()
WHERE rule_key IN ('escrow_fee', 'wallet_topup_fee', 'wallet_payout_fee');

-- Enrich existing payment streams with architecture metadata (preserve enabled/fee_value)
UPDATE public.revenue_rules
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'architecture_id', 9,
  'price_hint', '1% founding / 1.5% standard — seller',
  'payer', 'seller',
  'launch_stance', 'Grow after supply/traffic'
),
updated_at = NOW()
WHERE rule_key IN ('platform_fee_sale', 'platform_fee_sale_standard');

UPDATE public.revenue_rules
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'architecture_id', 10,
  'price_hint', '2% of rent/lease/deposit — landlord',
  'payer', 'landlord',
  'launch_stance', 'Next after PayAngels live'
),
updated_at = NOW()
WHERE rule_key = 'platform_fee_rent';

UPDATE public.revenue_rules
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'architecture_id', 11,
  'price_hint', '5% guest / 8% host on confirmed bookings',
  'launch_stance', 'Relaunch deliberately when bookings scale'
),
updated_at = NOW()
WHERE rule_key IN ('booking_guest_fee', 'booking_host_fee');

-- B. Eight offer combination packages (subscription_plans + catalog rules)
INSERT INTO public.subscription_plans (
  plan_key, name, description, price_amount, currency, billing_cycle, features, is_active, is_custom_pricing, sort_order
) VALUES
  ('property_operations_core', 'Property Operations Core',
   'Managers of 20–500 rental units: org license + unit capacity + leases, maintenance, inspections, simple finance.',
   600, 'GHS', 'monthly',
   '["Leases","Maintenance","Inspections","Simple finance","Reminders","Optional e-sign & AI"]'::jsonb,
   FALSE, FALSE, 20),
  ('agency_growth_suite', 'Agency Growth Suite',
   'Agency license + CRM/lead routing + listing quota + optional boosts, photography, e-sign.',
   600, 'GHS', 'monthly',
   '["CRM / leads","Listing quota","Optional boosts","Photography packages","E-sign"]'::jsonb,
   FALSE, FALSE, 21),
  ('estate_os_integrated', 'EstateOS Integrated',
   'Gated estates / HOA: site license + household capacity + residents, complaints, optional parking/gate/utilities.',
   500, 'GHS', 'monthly',
   '["HOA / residents","Complaints","Work orders","Optional parking & gate","Utilities"]'::jsonb,
   FALSE, FALSE, 22),
  ('developer_sales_trust', 'Developer Sales & Trust',
   'Developer Pro license + project launch + virtual tours + progress reports + deal rooms.',
   1500, 'GHS', 'monthly',
   '["Developer inventory tools","Project launch","Virtual tours","Progress reports","Deal rooms"]'::jsonb,
   FALSE, FALSE, 24),
  ('enterprise_reos', 'Enterprise REOS',
   'Multi-org license + GL/procurement + API + governance + AI quotas + priority support + onboarding. Quote by scope.',
   NULL, 'GHS', 'custom',
   '["Multi-org / multi-branch","GL & procurement","API access","AI quotas","Priority support","Onboarding"]'::jsonb,
   FALSE, TRUE, 25),
  ('diaspora_concierge', 'Diaspora Concierge & Evidence',
   'Remote viewing coordination + evidence dossier + document room + construction updates + specialist visits.',
   800, 'GHS', 'custom',
   '["Remote viewing coordination","Evidence dossier","Document room","Construction updates","Partner visits"]'::jsonb,
   FALSE, FALSE, 26),
  ('campus_hostel', 'Campus & Hostel',
   'Hostel operators: license + bed capacity + term cycles + tenancy e-sign + utilities + maintenance.',
   300, 'GHS', 'monthly',
   '["Beds / rooms","Term cycles","Tenancy e-sign","Utility allocations","Maintenance"]'::jsonb,
   FALSE, FALSE, 23),
  ('transaction_partner_marketplace', 'Transaction & Partner Marketplace',
   'Config package: disclosed placement + qualified transaction fees + optional partner introductions. Fees drive revenue.',
   0, 'GHS', 'monthly',
   '["Free consumer discovery","Paid placement","Qualified transaction fees","Partner introductions"]'::jsonb,
   FALSE, FALSE, 27)
ON CONFLICT (plan_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  billing_cycle = EXCLUDED.billing_cycle,
  is_custom_pricing = EXCLUDED.is_custom_pricing,
  updated_at = NOW();

-- Mirror bundles in revenue_rules for catalog toggles/prices
SELECT private.upsert_revenue_catalog_rule(
  'bundle_property_operations_core', 'Bundle: Property Operations Core', 'offer_bundles', FALSE, 'fixed', 600, 2, 'GHS',
  '{"plan_key":"property_operations_core","cycle":"monthly","secondary_unit":"active_unit"}'::jsonb,
  '{"architecture_id":"bundle-01","stage":"now","group":"bundles","payer":"organization","price_hint":"GH₵600 base + GH₵1–5/extra unit","launch_stance":"Launch first","plan_key":"property_operations_core","description":"Daily workflows, unit-based recurring income for property managers."}'::jsonb,
  700
);
SELECT private.upsert_revenue_catalog_rule(
  'bundle_agency_growth_suite', 'Bundle: Agency Growth Suite', 'offer_bundles', FALSE, 'fixed', 600, NULL, 'GHS',
  '{"plan_key":"agency_growth_suite","cycle":"monthly"}'::jsonb,
  '{"architecture_id":"bundle-02","stage":"now","group":"bundles","payer":"organization","price_hint":"GH₵600/month + boosts/media add-ons","launch_stance":"Launch first","plan_key":"agency_growth_suite","description":"Acquires listings and business subscribers together."}'::jsonb,
  701
);
SELECT private.upsert_revenue_catalog_rule(
  'bundle_estate_os_integrated', 'Bundle: EstateOS Integrated', 'offer_bundles', FALSE, 'fixed', 500, 3, 'GHS',
  '{"plan_key":"estate_os_integrated","cycle":"monthly","secondary_unit":"household"}'::jsonb,
  '{"architecture_id":"bundle-03","stage":"next","group":"bundles","payer":"organization","price_hint":"GH₵500 site + GH₵2–5/unit","launch_stance":"Pilot next","plan_key":"estate_os_integrated","description":"High-value institutional contracts; sticky operations."}'::jsonb,
  702
);
SELECT private.upsert_revenue_catalog_rule(
  'bundle_developer_sales_trust', 'Bundle: Developer Sales & Trust', 'offer_bundles', FALSE, 'fixed', 1500, NULL, 'GHS',
  '{"plan_key":"developer_sales_trust","cycle":"monthly"}'::jsonb,
  '{"architecture_id":"bundle-04","stage":"next","group":"bundles","payer":"developer","price_hint":"GH₵1,500/month + project launch fees","launch_stance":"Pilot next","plan_key":"developer_sales_trust","description":"Premium developer fees plus diaspora services."}'::jsonb,
  703
);
SELECT private.upsert_revenue_catalog_rule(
  'bundle_enterprise_reos', 'Bundle: Enterprise REOS', 'offer_bundles', FALSE, 'custom', NULL, NULL, 'GHS',
  '{"plan_key":"enterprise_reos","cycle":"custom"}'::jsonb,
  '{"architecture_id":"bundle-05","stage":"later","group":"bundles","payer":"organization","price_hint":"Custom quote — setup + annual minimum","launch_stance":"Sell selectively","plan_key":"enterprise_reos","description":"High contract value, high diligence needs."}'::jsonb,
  704
);
SELECT private.upsert_revenue_catalog_rule(
  'bundle_diaspora_concierge', 'Bundle: Diaspora Concierge & Evidence', 'offer_bundles', FALSE, 'fixed', 800, NULL, 'GHS',
  '{"plan_key":"diaspora_concierge","cycle":"custom"}'::jsonb,
  '{"architecture_id":"bundle-06","stage":"later","group":"bundles","payer":"customer","price_hint":"GH₵800–2,500 + pass-through professional costs","launch_stance":"Partner pilot","plan_key":"diaspora_concierge","description":"Differentiation and high-touch service margin."}'::jsonb,
  705
);
SELECT private.upsert_revenue_catalog_rule(
  'bundle_campus_hostel', 'Bundle: Campus & Hostel', 'offer_bundles', FALSE, 'fixed', 300, NULL, 'GHS',
  '{"plan_key":"campus_hostel","cycle":"monthly"}'::jsonb,
  '{"architecture_id":"bundle-07","stage":"later","group":"bundles","payer":"operator","price_hint":"GH₵300/hostel/month + bed overage","launch_stance":"Build after discovery","plan_key":"campus_hostel","description":"Strong niche; hostel-specific workflows required."}'::jsonb,
  706
);
SELECT private.upsert_revenue_catalog_rule(
  'bundle_transaction_partner_marketplace', 'Bundle: Transaction & Partner Marketplace', 'offer_bundles', FALSE, 'custom', NULL, NULL, 'GHS',
  '{"plan_key":"transaction_partner_marketplace","cycle":"monthly"}'::jsonb,
  '{"architecture_id":"bundle-08","stage":"later","group":"bundles","payer":"mixed","price_hint":"Driven by enabled transaction/placement fees","launch_stance":"Grow after supply/traffic","plan_key":"transaction_partner_marketplace","description":"Scales with verified market liquidity; not early MRR foundation."}'::jsonb,
  707
);

-- Price hints for SaaS / vertical seeds commonly edited by admin
UPDATE public.revenue_rules
SET metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
  'price_hint', COALESCE(metadata->>'price_hint', 'Admin-editable; validate in pilot')
),
updated_at = NOW()
WHERE metadata->>'price_hint' IS NULL
  AND category IN (
    'saas_subscriptions','platform_fees','listing_fees','booking_fees','verification_fees',
    'marketplace_commissions','professional_services','vertical_ops','ecosystem',
    'enterprise_pricing','ai_usage','messaging_credits','partner_referrals','offer_bundles','wallet_fees'
  );

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('revenue_catalog_version', '"2026-11-14-bundles"', 'Revenue architecture catalog + offer bundles'),
  ('revenue_catalog_admin_note', '"Toggle streams and bundles ON only when billing/fulfillment is ready. Prices are admin-editable."', 'Shown in admin revenue catalog')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

REVOKE ALL ON FUNCTION private.upsert_revenue_catalog_rule(TEXT, TEXT, TEXT, BOOLEAN, TEXT, NUMERIC, NUMERIC, TEXT, JSONB, JSONB, INTEGER) FROM PUBLIC, anon, authenticated;
