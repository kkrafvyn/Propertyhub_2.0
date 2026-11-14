-- Seed BaytMiftah revenue architecture catalog.
-- Admin toggles `enabled` and edits prices in /admin/revenue/catalog.
-- Upsert helper preserves admin fee_value / enabled when row already exists.

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

SELECT private.upsert_revenue_catalog_rule('org_workspace_subscription', 'Organization Workspace subscription', 'saas_subscriptions', FALSE, 'fixed', 600, NULL, 'GHS',
  '{"payer":"organization","cycle":"monthly"}'::jsonb,
  '{"stream_id":1,"stage":"now","group":"saas","description":"Recurring org license (Starter/Pro anchors)."}'::jsonb, 100);
SELECT private.upsert_revenue_catalog_rule('managed_unit_overage', 'Managed-unit overages', 'saas_subscriptions', FALSE, 'fixed', 2, NULL, 'GHS',
  '{"payer":"organization","unit":"active_unit","cycle":"monthly"}'::jsonb,
  '{"stream_id":2,"stage":"now","group":"saas","description":"Per extra active unit beyond plan allowance."}'::jsonb, 101);
SELECT private.upsert_revenue_catalog_rule('additional_staff_seat', 'Additional staff seats', 'saas_subscriptions', FALSE, 'fixed', 50, NULL, 'GHS',
  '{"payer":"organization","unit":"seat","cycle":"monthly"}'::jsonb,
  '{"stream_id":3,"stage":"next","group":"saas"}'::jsonb, 102);
SELECT private.upsert_revenue_catalog_rule('premium_module_addon', 'Premium functional modules', 'saas_subscriptions', FALSE, 'fixed', 150, NULL, 'GHS',
  '{"payer":"organization","unit":"module","cycle":"monthly"}'::jsonb,
  '{"stream_id":4,"stage":"next","group":"saas"}'::jsonb, 103);
SELECT private.upsert_revenue_catalog_rule('ai_usage_pack', 'AI and automation usage packs', 'ai_usage', FALSE, 'fixed', 100, NULL, 'GHS',
  '{"payer":"organization","unit":"pack"}'::jsonb,
  '{"stream_id":5,"stage":"next","group":"ai"}'::jsonb, 104);
SELECT private.upsert_revenue_catalog_rule('premium_support_sla', 'Premium support and SLAs', 'saas_subscriptions', FALSE, 'fixed', 250, NULL, 'GHS',
  '{"payer":"organization","cycle":"monthly"}'::jsonb,
  '{"stream_id":6,"stage":"next","group":"saas"}'::jsonb, 105);
SELECT private.upsert_revenue_catalog_rule('enterprise_white_label', 'Enterprise and white-label licensing', 'enterprise_pricing', FALSE, 'fixed', 5000, NULL, 'GHS',
  '{"payer":"organization","cycle":"annual"}'::jsonb,
  '{"stream_id":7,"stage":"later","group":"enterprise"}'::jsonb, 106);
SELECT private.upsert_revenue_catalog_rule('api_integration_subscription', 'API and integration subscriptions', 'saas_subscriptions', FALSE, 'fixed', 500, NULL, 'GHS',
  '{"payer":"organization","cycle":"monthly"}'::jsonb,
  '{"stream_id":8,"stage":"later","group":"saas"}'::jsonb, 107);

SELECT private.upsert_revenue_catalog_rule('platform_fee_sale', 'Property sale platform fee (founding)', 'platform_fees', TRUE, 'percentage', 1.0, NULL, 'GHS',
  '{"purposes":["sale","purchase","purchase_installment"],"charged_to":"seller"}'::jsonb,
  '{"stream_id":9,"stage":"later","group":"payments","tier":"founding","fee_name":"BaytMiftah platform fee"}'::jsonb, 1);
SELECT private.upsert_revenue_catalog_rule('platform_fee_sale_standard', 'Property sale platform fee (standard)', 'platform_fees', TRUE, 'percentage', 1.5, NULL, 'GHS',
  '{"purposes":["sale","purchase","purchase_installment"],"charged_to":"seller"}'::jsonb,
  '{"stream_id":9,"stage":"later","group":"payments","tier":"standard","fee_name":"BaytMiftah platform fee"}'::jsonb, 2);
SELECT private.upsert_revenue_catalog_rule('platform_fee_rent', 'Rental payment platform fee', 'platform_fees', TRUE, 'percentage', 2.0, NULL, 'GHS',
  '{"purposes":["rent","lease_fee","deposit"],"charged_to":"landlord"}'::jsonb,
  '{"stream_id":10,"stage":"next","group":"payments","tier":"standard","fee_name":"BaytMiftah platform fee"}'::jsonb, 5);
SELECT private.upsert_revenue_catalog_rule('booking_guest_fee', 'Short-stay guest booking fee', 'booking_fees', FALSE, 'percentage', 5, NULL, 'GHS',
  '{"side":"guest","charged_to":"guest"}'::jsonb,
  '{"stream_id":11,"stage":"later","group":"payments"}'::jsonb, 20);
SELECT private.upsert_revenue_catalog_rule('booking_host_fee', 'Short-stay host commission', 'booking_fees', FALSE, 'percentage', 8, NULL, 'GHS',
  '{"side":"host","charged_to":"host"}'::jsonb,
  '{"stream_id":11,"stage":"later","group":"payments"}'::jsonb, 21);
SELECT private.upsert_revenue_catalog_rule('premium_listing', 'Paid listing placement (premium)', 'listing_fees', TRUE, 'fixed', 200, NULL, 'GHS',
  '{"listing_types":["sale","rental","lease","short_stay"]}'::jsonb,
  '{"stream_id":12,"stage":"later","group":"listings"}'::jsonb, 30);
SELECT private.upsert_revenue_catalog_rule('featured_listing', 'Featured listing boost', 'listing_fees', FALSE, 'fixed', 75, NULL, 'GHS',
  '{"listing_types":["sale","rental","lease","short_stay"]}'::jsonb,
  '{"stream_id":12,"stage":"later","group":"listings"}'::jsonb, 31);
SELECT private.upsert_revenue_catalog_rule('developer_project_launch', 'Developer project launch campaign', 'listing_fees', FALSE, 'fixed', 2500, NULL, 'GHS',
  '{"payer":"developer"}'::jsonb,
  '{"stream_id":13,"stage":"later","group":"listings"}'::jsonb, 32);
SELECT private.upsert_revenue_catalog_rule('agency_verification', 'Agency verification package', 'verification_fees', TRUE, 'fixed', 300, NULL, 'GHS',
  '{"role":"agency"}'::jsonb,
  '{"stream_id":14,"stage":"later","group":"trust"}'::jsonb, 50);
SELECT private.upsert_revenue_catalog_rule('agent_verification', 'Agent verification package', 'verification_fees', TRUE, 'fixed', 150, NULL, 'GHS',
  '{"role":"agent"}'::jsonb,
  '{"stream_id":14,"stage":"later","group":"trust"}'::jsonb, 51);
SELECT private.upsert_revenue_catalog_rule('property_verification', 'Property verification package', 'verification_fees', TRUE, 'fixed', 100, NULL, 'GHS',
  '{"role":"property"}'::jsonb,
  '{"stream_id":14,"stage":"later","group":"trust"}'::jsonb, 52);
SELECT private.upsert_revenue_catalog_rule('vendor_marketplace_commission', 'Contractor marketplace commission', 'marketplace_commissions', TRUE, 'percentage', 10, NULL, 'GHS',
  '{}'::jsonb,
  '{"stream_id":15,"stage":"later","group":"marketplace"}'::jsonb, 60);
SELECT private.upsert_revenue_catalog_rule('mortgage_insurance_referral', 'Mortgage and insurance introductions', 'partner_referrals', FALSE, 'fixed', 0, NULL, 'GHS',
  '{"payer":"partner"}'::jsonb,
  '{"stream_id":16,"stage":"later","group":"partners"}'::jsonb, 65);

SELECT private.upsert_revenue_catalog_rule('portfolio_onboarding', 'Portfolio onboarding and migration', 'professional_services', FALSE, 'fixed', 2000, NULL, 'GHS',
  '{"payer":"organization"}'::jsonb,
  '{"stream_id":17,"stage":"now","group":"services"}'::jsonb, 200);
SELECT private.upsert_revenue_catalog_rule('esign_envelope', 'Digital lease and e-sign usage', 'professional_services', FALSE, 'fixed', 25, NULL, 'GHS',
  '{"unit":"envelope"}'::jsonb,
  '{"stream_id":18,"stage":"next","group":"services"}'::jsonb, 201);
SELECT private.upsert_revenue_catalog_rule('tenant_application_pack', 'Tenant application workflow pack', 'professional_services', FALSE, 'fixed', 40, NULL, 'GHS',
  '{"unit":"application","charged_to":"landlord"}'::jsonb,
  '{"stream_id":19,"stage":"next","group":"services"}'::jsonb, 202);
SELECT private.upsert_revenue_catalog_rule('inspection_report', 'Move-in / move-out inspection report', 'professional_services', FALSE, 'fixed', 80, NULL, 'GHS',
  '{"unit":"report"}'::jsonb,
  '{"stream_id":20,"stage":"later","group":"services"}'::jsonb, 203);
SELECT private.upsert_revenue_catalog_rule('secure_deal_room', 'Secure property deal room', 'professional_services', FALSE, 'fixed', 250, NULL, 'GHS',
  '{"unit":"deal"}'::jsonb,
  '{"stream_id":21,"stage":"later","group":"services"}'::jsonb, 204);
SELECT private.upsert_revenue_catalog_rule('virtual_viewing_session', 'Virtual viewing session', 'professional_services', FALSE, 'fixed', 200, NULL, 'GHS',
  '{"unit":"session"}'::jsonb,
  '{"stream_id":22,"stage":"later","group":"services"}'::jsonb, 205);
SELECT private.upsert_revenue_catalog_rule('listing_media_package', 'Professional photos / listing media package', 'professional_services', FALSE, 'fixed', 450, NULL, 'GHS',
  '{"unit":"package"}'::jsonb,
  '{"stream_id":23,"stage":"later","group":"services"}'::jsonb, 206);
SELECT private.upsert_revenue_catalog_rule('diaspora_due_diligence', 'Diaspora due-diligence coordination', 'professional_services', FALSE, 'fixed', 800, NULL, 'GHS',
  '{"unit":"engagement"}'::jsonb,
  '{"stream_id":24,"stage":"later","group":"services"}'::jsonb, 207);

SELECT private.upsert_revenue_catalog_rule('hostel_os_subscription', 'Student housing / hostel OS', 'vertical_ops', FALSE, 'fixed', 300, NULL, 'GHS',
  '{"cycle":"monthly","unit":"hostel"}'::jsonb,
  '{"stream_id":25,"stage":"later","group":"vertical"}'::jsonb, 300);
SELECT private.upsert_revenue_catalog_rule('estate_hoa_subscription', 'Estate and residents association OS', 'vertical_ops', FALSE, 'fixed', 500, 3, 'GHS',
  '{"cycle":"monthly","unit":"site","secondary_unit":"household"}'::jsonb,
  '{"stream_id":26,"stage":"now","group":"vertical","description":"Base site fee; secondary = per-household amount."}'::jsonb, 301);
SELECT private.upsert_revenue_catalog_rule('parking_permits', 'Parking permits and allocations', 'vertical_ops', FALSE, 'fixed', 150, NULL, 'GHS',
  '{"cycle":"monthly","unit":"site"}'::jsonb,
  '{"stream_id":27,"stage":"later","group":"vertical"}'::jsonb, 302);
SELECT private.upsert_revenue_catalog_rule('gate_visitor_qr', 'Gate access and visitor QR management', 'vertical_ops', FALSE, 'fixed', 250, NULL, 'GHS',
  '{"cycle":"monthly","unit":"site"}'::jsonb,
  '{"stream_id":28,"stage":"now","group":"vertical"}'::jsonb, 303);
SELECT private.upsert_revenue_catalog_rule('utility_submeter_billing', 'Utility submetering and billing software', 'vertical_ops', FALSE, 'fixed', 2, NULL, 'GHS',
  '{"cycle":"monthly","unit":"meter"}'::jsonb,
  '{"stream_id":29,"stage":"now","group":"vertical"}'::jsonb, 304);
SELECT private.upsert_revenue_catalog_rule('construction_progress_reporting', 'Construction progress reporting', 'vertical_ops', FALSE, 'fixed', 400, NULL, 'GHS',
  '{"cycle":"monthly","unit":"project"}'::jsonb,
  '{"stream_id":30,"stage":"later","group":"vertical"}'::jsonb, 305);
SELECT private.upsert_revenue_catalog_rule('commercial_lease_admin', 'Commercial lease administration', 'vertical_ops', FALSE, 'fixed', 400, NULL, 'GHS',
  '{"cycle":"monthly"}'::jsonb,
  '{"stream_id":31,"stage":"later","group":"vertical"}'::jsonb, 306);
SELECT private.upsert_revenue_catalog_rule('facilities_compliance', 'Facilities compliance and asset inspections', 'vertical_ops', FALSE, 'fixed', 200, NULL, 'GHS',
  '{"cycle":"monthly","unit":"site"}'::jsonb,
  '{"stream_id":32,"stage":"later","group":"vertical"}'::jsonb, 307);

SELECT private.upsert_revenue_catalog_rule('relocation_contracts', 'Employer / university relocation contracts', 'ecosystem', FALSE, 'custom', NULL, NULL, 'GHS',
  '{"payer":"institution"}'::jsonb,
  '{"stream_id":33,"stage":"later","group":"ecosystem"}'::jsonb, 400);
SELECT private.upsert_revenue_catalog_rule('moving_storage_partner', 'Moving and storage partner bookings', 'ecosystem', FALSE, 'percentage', 8, NULL, 'GHS',
  '{"payer":"partner"}'::jsonb,
  '{"stream_id":34,"stage":"later","group":"ecosystem"}'::jsonb, 401);
SELECT private.upsert_revenue_catalog_rule('procurement_supplier_fee', 'Property supplies procurement marketplace', 'ecosystem', FALSE, 'percentage', 5, NULL, 'GHS',
  '{"payer":"supplier"}'::jsonb,
  '{"stream_id":35,"stage":"later","group":"ecosystem"}'::jsonb, 402);
SELECT private.upsert_revenue_catalog_rule('academy_course', 'BaytMiftah Academy and certifications', 'ecosystem', FALSE, 'fixed', 99, NULL, 'GHS',
  '{"unit":"course"}'::jsonb,
  '{"stream_id":36,"stage":"next","group":"ecosystem"}'::jsonb, 403);
SELECT private.upsert_revenue_catalog_rule('market_intelligence_subscription', 'Market intelligence subscriptions', 'ecosystem', FALSE, 'fixed', 500, NULL, 'GHS',
  '{"cycle":"monthly"}'::jsonb,
  '{"stream_id":37,"stage":"later","group":"ecosystem"}'::jsonb, 404);
SELECT private.upsert_revenue_catalog_rule('multi_branch_network_license', 'Multi-branch network licensing', 'enterprise_pricing', FALSE, 'fixed', 2000, NULL, 'GHS',
  '{"cycle":"monthly"}'::jsonb,
  '{"stream_id":38,"stage":"later","group":"enterprise"}'::jsonb, 405);

SELECT private.upsert_revenue_catalog_rule('sms_credit_pack', 'SMS credit pack', 'messaging_credits', FALSE, 'fixed', 50, NULL, 'GHS',
  '{"unit":"pack"}'::jsonb,
  '{"stage":"next","group":"messaging"}'::jsonb, 500);
SELECT private.upsert_revenue_catalog_rule('whatsapp_bundle', 'WhatsApp automation bundle', 'messaging_credits', FALSE, 'fixed', 200, NULL, 'GHS',
  '{"cycle":"monthly"}'::jsonb,
  '{"stage":"next","group":"messaging"}'::jsonb, 501);
SELECT private.upsert_revenue_catalog_rule('comms_bundle', 'Push / email / voice-video bundle', 'messaging_credits', FALSE, 'fixed', 150, NULL, 'GHS',
  '{"cycle":"monthly"}'::jsonb,
  '{"stage":"next","group":"messaging"}'::jsonb, 502);
SELECT private.upsert_revenue_catalog_rule('tenant_screening_report', 'Tenant screening report', 'professional_services', FALSE, 'fixed', 80, NULL, 'GHS',
  '{"unit":"report","charged_to":"landlord"}'::jsonb,
  '{"stage":"next","group":"trust"}'::jsonb, 510);
SELECT private.upsert_revenue_catalog_rule('kyc_check_markup', 'KYC check (platform markup)', 'professional_services', FALSE, 'fixed', 25, NULL, 'GHS',
  '{"unit":"check"}'::jsonb,
  '{"stage":"next","group":"trust"}'::jsonb, 511);
SELECT private.upsert_revenue_catalog_rule('owner_disbursement_fee', 'Owner disbursement fee', 'wallet_fees', FALSE, 'percentage', 0.5, NULL, 'GHS',
  '{"charged_to":"owner"}'::jsonb,
  '{"stage":"later","group":"payments"}'::jsonb, 512);

INSERT INTO public.subscription_plans (
  plan_key, name, description, price_amount, currency, billing_cycle, features, is_active, is_custom_pricing, sort_order
) VALUES
  ('property_operations_core', 'Property Operations Core', 'Managers of 20–500 rental units: license + unit capacity', 600, 'GHS', 'monthly',
    '["Leases","Maintenance","Inspections","Simple finance","Reminders"]'::jsonb, FALSE, FALSE, 20),
  ('agency_growth_suite', 'Agency Growth Suite', 'Agency license + CRM + listing quota', 600, 'GHS', 'monthly',
    '["CRM / leads","Listing quota","Optional boosts","E-sign"]'::jsonb, FALSE, FALSE, 21),
  ('estate_os_integrated', 'EstateOS Integrated', 'Gated estates / HOA: site license + household capacity', 500, 'GHS', 'monthly',
    '["HOA / residents","Complaints","Optional parking & gate","Utilities"]'::jsonb, FALSE, FALSE, 22),
  ('campus_hostel', 'Campus & Hostel', 'Hostel operators: license + bed capacity', 300, 'GHS', 'monthly',
    '["Beds / rooms","Term cycles","Tenancy e-sign","Utilities"]'::jsonb, FALSE, FALSE, 23)
ON CONFLICT (plan_key) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

INSERT INTO public.platform_settings (key, value, description) VALUES
  ('revenue_catalog_version', '"2026-11-14"', 'Revenue architecture catalog seed version'),
  ('revenue_catalog_admin_note', '"Toggle streams ON only when billing/fulfillment is ready. Prices are admin-editable."', 'Shown in admin revenue catalog')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();

REVOKE ALL ON FUNCTION private.upsert_revenue_catalog_rule(TEXT, TEXT, TEXT, BOOLEAN, TEXT, NUMERIC, NUMERIC, TEXT, JSONB, JSONB, INTEGER) FROM PUBLIC, anon, authenticated;
