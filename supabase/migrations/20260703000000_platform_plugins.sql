-- BaytMiftah Platform Plugin Architecture
-- Region-by-region scaling: utility + payment + compliance modules

-- =============================================================================
-- MARKET REGIONS (scaling tiers — not "global at once")
-- =============================================================================

create table if not exists public.market_regions (
  id text primary key,
  name text not null,
  tier text not null check (tier in ('africa', 'asia', 'western')),
  default_country text not null,
  default_currency text not null,
  launch_phase int not null default 1,
  active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- PLUGIN REGISTRY (utility / payment / compliance adapters)
-- =============================================================================

create table if not exists public.platform_plugins (
  id text primary key,
  module text not null check (module in ('utility', 'payment', 'compliance')),
  adapter_id text not null,
  name text not null,
  description text,
  countries text[] not null default '{}',
  partner text,
  api_available boolean not null default false,
  fallback boolean not null default false,
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (module, adapter_id)
);

create table if not exists public.region_plugin_bindings (
  region_id text not null references public.market_regions(id) on delete cascade,
  plugin_id text not null references public.platform_plugins(id) on delete cascade,
  is_default boolean not null default false,
  priority int not null default 0,
  enabled boolean not null default true,
  primary key (region_id, plugin_id)
);

-- =============================================================================
-- HOUSING COMPLIANCE (rent / tax / eviction — country-agnostic store)
-- =============================================================================

create table if not exists public.housing_compliance_rules (
  id text primary key,
  region_id text references public.market_regions(id),
  country text not null,
  category text not null check (category in ('rent', 'utilities', 'tax', 'eviction', 'deposit')),
  rule_key text not null,
  rule_value jsonb not null default '{}'::jsonb,
  unique (country, category, rule_key)
);

-- =============================================================================
-- UNIFIED MONEY LAYER — wallet purposes (rent / utility / escrow)
-- =============================================================================

alter table public.wallets
  add column if not exists wallet_purpose text not null default 'general'
    check (wallet_purpose in ('general', 'rent', 'utility', 'escrow'));

alter table public.wallets drop constraint if exists wallets_owner_type_owner_id_currency_key;
create unique index if not exists idx_wallets_owner_purpose
  on public.wallets (owner_type, owner_id, currency, wallet_purpose);

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.market_regions enable row level security;
alter table public.platform_plugins enable row level security;
alter table public.region_plugin_bindings enable row level security;
alter table public.housing_compliance_rules enable row level security;

drop policy if exists "Public read market regions" on public.market_regions;
drop policy if exists "Public read market regions" on public.market_regions;
create policy "Public read market regions"
  on public.market_regions for select using (active = true);

drop policy if exists "Public read platform plugins" on public.platform_plugins;
drop policy if exists "Public read platform plugins" on public.platform_plugins;
create policy "Public read platform plugins"
  on public.platform_plugins for select using (active = true);

drop policy if exists "Public read region plugin bindings" on public.region_plugin_bindings;
drop policy if exists "Public read region plugin bindings" on public.region_plugin_bindings;
create policy "Public read region plugin bindings"
  on public.region_plugin_bindings for select using (enabled = true);

drop policy if exists "Public read housing compliance" on public.housing_compliance_rules;
drop policy if exists "Public read housing compliance" on public.housing_compliance_rules;
create policy "Public read housing compliance"
  on public.housing_compliance_rules for select using (true);

-- =============================================================================
-- SEED: 3 market tiers (Ghana/Africa, India/SEA, US/EU)
-- =============================================================================

insert into public.market_regions (id, name, tier, default_country, default_currency, launch_phase, config) values
  ('africa_ghana', 'Ghana & West Africa', 'africa', 'GH', 'GHS', 1, '{"utility_mode":"manual_metered","payment_mode":"mobile_money","partner_strategy":"paystack"}'::jsonb),
  ('asia_india', 'India & Southeast Asia', 'asia', 'IN', 'INR', 2, '{"utility_mode":"prepaid","payment_mode":"upi","partner_strategy":"razorpay"}'::jsonb),
  ('western_us', 'United States', 'western', 'US', 'USD', 3, '{"utility_mode":"api_metered","payment_mode":"ach","partner_strategy":"stripe"}'::jsonb),
  ('western_eu', 'European Union', 'western', 'EU', 'EUR', 3, '{"utility_mode":"smart_meter","payment_mode":"sepa","partner_strategy":"stripe"}'::jsonb)
on conflict (id) do nothing;

-- Utility adapters
insert into public.platform_plugins (id, module, adapter_id, name, description, countries, partner, api_available, fallback, config) values
  ('util-gh-manual', 'utility', 'manual_metered', 'Manual metered billing', 'Landlord or agent enters readings — Ghana, Africa hybrid markets', '{GH,NG,KE}', null, false, true, '{"types":["electricity","water","gas"]}'::jsonb),
  ('util-gh-ecg', 'utility', 'ecg_ghana', 'ECG Ghana', 'Electricity Company of Ghana — metered/postpaid', '{GH}', 'ECG', false, false, '{"type":"electricity","billing":"metered"}'::jsonb),
  ('util-in-prepaid', 'utility', 'prepaid_digital', 'Prepaid digital utilities', 'Prepaid electricity/water — India, SEA high-volume rentals', '{IN,PH,ID}', null, false, false, '{"billing":"prepaid"}'::jsonb),
  ('util-us-utility', 'utility', 'us_utility_api', 'US utility provider API', 'Regional utility company integrations', '{US}', null, true, false, '{"billing":"metered"}'::jsonb),
  ('util-eu-smart', 'utility', 'eu_smart_meter', 'EU smart meter API', 'Smart meter reads via partner aggregator', '{DE,FR,NL,EU}', null, true, false, '{"billing":"metered"}'::jsonb),
  ('util-manual-fallback', 'utility', 'manual_fallback', 'Manual fallback', 'Universal manual entry when no API available', '{}', null, false, true, '{}'::jsonb)
on conflict (id) do nothing;

-- Payment adapters
insert into public.platform_plugins (id, module, adapter_id, name, description, countries, partner, api_available, fallback, config) values
  ('pay-paystack', 'payment', 'paystack', 'Paystack', 'Mobile money, bank & cards — Africa', '{GH,NG,KE,ZA}', 'Paystack', true, false, '{"methods":["momo","bank","card"]}'::jsonb),
  ('pay-stripe', 'payment', 'stripe', 'Stripe', 'Cards, ACH, SEPA — US & EU', '{US,EU,GB,INTL}', 'Stripe', true, false, '{"methods":["card","ach","sepa"]}'::jsonb),
  ('pay-razorpay', 'payment', 'razorpay', 'Razorpay', 'UPI, cards, netbanking — India', '{IN}', 'Razorpay', true, false, '{"methods":["upi","card","netbanking"]}'::jsonb),
  ('pay-bank-transfer', 'payment', 'bank_transfer', 'Bank transfer', 'Manual bank transfer fallback', '{}', null, false, true, '{}'::jsonb)
on conflict (id) do nothing;

-- Compliance adapters
insert into public.platform_plugins (id, module, adapter_id, name, description, countries, api_available, fallback, config) values
  ('comp-gh', 'compliance', 'ghana_housing', 'Ghana housing rules', 'Short-stay utility exemption, rent collection norms', '{GH}', false, false, '{"short_stay_max_days":30}'::jsonb),
  ('comp-in', 'compliance', 'india_rent', 'India rent control', 'State-level rent rules, prepaid utility norms', '{IN}', false, false, '{"short_stay_max_days":30}'::jsonb),
  ('comp-us', 'compliance', 'us_tenant_law', 'US tenant protection', 'State eviction rules, deposit limits', '{US}', false, false, '{"short_stay_max_days":30}'::jsonb),
  ('comp-eu', 'compliance', 'eu_rent_control', 'EU rent control', 'Rent caps, tenant protection by city', '{EU}', false, false, '{"short_stay_max_days":30}'::jsonb)
on conflict (id) do nothing;

-- Region bindings
insert into public.region_plugin_bindings (region_id, plugin_id, is_default, priority) values
  ('africa_ghana', 'util-gh-manual', true, 1),
  ('africa_ghana', 'util-gh-ecg', false, 2),
  ('africa_ghana', 'util-manual-fallback', false, 99),
  ('africa_ghana', 'pay-paystack', true, 1),
  ('africa_ghana', 'pay-stripe', false, 2),
  ('africa_ghana', 'comp-gh', true, 1),
  ('asia_india', 'util-in-prepaid', true, 1),
  ('asia_india', 'util-manual-fallback', false, 99),
  ('asia_india', 'pay-razorpay', true, 1),
  ('asia_india', 'pay-stripe', false, 2),
  ('asia_india', 'comp-in', true, 1),
  ('western_us', 'util-us-utility', true, 1),
  ('western_us', 'util-manual-fallback', false, 99),
  ('western_us', 'pay-stripe', true, 1),
  ('western_us', 'comp-us', true, 1),
  ('western_eu', 'util-eu-smart', true, 1),
  ('western_eu', 'util-manual-fallback', false, 99),
  ('western_eu', 'pay-stripe', true, 1),
  ('western_eu', 'comp-eu', true, 1)
on conflict (region_id, plugin_id) do nothing;

-- Compliance rules per country
insert into public.housing_compliance_rules (id, region_id, country, category, rule_key, rule_value) values
  ('gh-util-short-stay', 'africa_ghana', 'GH', 'utilities', 'short_stay_inclusive', '{"max_days":30,"mode":"inclusive"}'::jsonb),
  ('gh-rent-deposit', 'africa_ghana', 'GH', 'deposit', 'max_months', '{"months":3}'::jsonb),
  ('in-util-prepaid', 'asia_india', 'IN', 'utilities', 'default_billing', '{"mode":"prepaid"}'::jsonb),
  ('in-rent-notice', 'asia_india', 'IN', 'eviction', 'notice_days', '{"days":30}'::jsonb),
  ('us-eviction-notice', 'western_us', 'US', 'eviction', 'notice_days', '{"days":30,"varies_by_state":true}'::jsonb),
  ('us-deposit-limit', 'western_us', 'US', 'deposit', 'max_months', '{"months":2,"varies_by_state":true}'::jsonb),
  ('eu-rent-cap', 'western_eu', 'EU', 'rent', 'rent_control_cities', '{"enabled":true,"cities":["berlin","paris","amsterdam"]}'::jsonb)
on conflict (id) do nothing;
