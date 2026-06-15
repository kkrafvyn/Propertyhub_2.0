-- BaytMiftah Utility Management Engine
-- Pluggable global providers + property config + metering + billing

-- =============================================================================
-- GLOBAL UTILITY PROVIDER REGISTRY (plugin layer)
-- =============================================================================

create table if not exists public.utility_providers (
  id text primary key,
  country text not null default 'GH',
  utility_type text not null check (utility_type in ('electricity', 'water', 'internet', 'gas')),
  provider_name text not null,
  billing_model text not null check (billing_model in ('metered', 'flat', 'prepaid')),
  api_available boolean not null default false,
  currency text not null default 'GHS',
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- PROPERTY UTILITY CONFIG
-- =============================================================================

create table if not exists public.property_utilities (
  id text primary key,
  property_id text not null,
  utility_type text not null check (utility_type in ('electricity', 'water', 'internet', 'gas')),
  provider_id text references public.utility_providers(id),
  provider_name text not null,
  billing_model text not null check (billing_model in ('metered', 'flat', 'prepaid')),
  rate_per_unit numeric(12, 4) not null default 0,
  fixed_monthly_fee numeric(12, 2) not null default 0,
  currency text not null default 'GHS',
  enabled boolean not null default true,
  owner_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (property_id, utility_type)
);

-- =============================================================================
-- STAY TYPE + UTILITIES MODE (bookings & leases)
-- =============================================================================

alter table public.reservations
  add column if not exists stay_type text not null default 'short_term',
  add column if not exists utilities_mode text not null default 'inclusive',
  add column if not exists property_id text;

alter table public.leases
  add column if not exists property_id text,
  add column if not exists stay_type text not null default 'long_term',
  add column if not exists utilities_mode text not null default 'billed';

-- =============================================================================
-- UTILITY ACCOUNTS (tenant ↔ property ↔ booking bridge)
-- =============================================================================

create table if not exists public.utility_accounts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  property_id text not null,
  booking_id text,
  lease_id text references public.leases(id) on delete set null,
  reservation_id text references public.reservations(id) on delete set null,
  active boolean not null default true,
  utilities_mode text not null default 'billed',
  created_at timestamptz not null default now()
);

create index if not exists idx_utility_accounts_user on public.utility_accounts(user_id);
create index if not exists idx_utility_accounts_property on public.utility_accounts(property_id);

-- =============================================================================
-- METER READINGS (ECG-style + water meters)
-- =============================================================================

create table if not exists public.meter_readings (
  id text primary key,
  utility_account_id text not null references public.utility_accounts(id) on delete cascade,
  utility_type text not null check (utility_type in ('electricity', 'water', 'internet', 'gas')),
  previous_reading numeric(12, 3) not null default 0,
  current_reading numeric(12, 3) not null default 0,
  units_used numeric(12, 3) not null default 0,
  recorded_by text not null default 'system',
  reading_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- UTILITY BILLS
-- =============================================================================

create table if not exists public.utility_bills (
  id text primary key,
  utility_account_id text not null references public.utility_accounts(id) on delete cascade,
  utility_type text not null check (utility_type in ('electricity', 'water', 'internet', 'gas')),
  provider_name text,
  amount numeric(12, 2) not null default 0,
  usage_units numeric(12, 3),
  billing_month text not null,
  status text not null default 'unpaid' check (status in ('unpaid', 'paid', 'waived', 'overdue')),
  due_date date,
  paid_at timestamptz,
  payment_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_utility_bills_account on public.utility_bills(utility_account_id);
create index if not exists idx_utility_bills_status on public.utility_bills(status);

-- =============================================================================
-- PREPAID BALANCES (Ghana ECG prepaid mode)
-- =============================================================================

create table if not exists public.utility_prepaid_balances (
  id text primary key,
  utility_account_id text not null references public.utility_accounts(id) on delete cascade,
  utility_type text not null,
  units_remaining numeric(12, 3) not null default 0,
  last_top_up_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (utility_account_id, utility_type)
);

-- =============================================================================
-- COMPLIANCE RULES (country-agnostic billing rules)
-- =============================================================================

create table if not exists public.utility_compliance_rules (
  id text primary key,
  country text not null,
  utility_type text,
  rule_key text not null,
  rule_value jsonb not null default '{}'::jsonb,
  unique (country, utility_type, rule_key)
);

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.utility_providers enable row level security;
alter table public.property_utilities enable row level security;
alter table public.utility_accounts enable row level security;
alter table public.meter_readings enable row level security;
alter table public.utility_bills enable row level security;
alter table public.utility_prepaid_balances enable row level security;
alter table public.utility_compliance_rules enable row level security;

drop policy if exists "Public read utility providers" on public.utility_providers;
create policy "Public read utility providers"
  on public.utility_providers for select using (active = true);

drop policy if exists "Owners manage property utilities" on public.property_utilities;
create policy "Owners manage property utilities"
  on public.property_utilities for all
  using (auth.uid() = owner_id);

drop policy if exists "Public read enabled property utilities" on public.property_utilities;
create policy "Public read enabled property utilities"
  on public.property_utilities for select using (enabled = true);

drop policy if exists "Tenants read own utility accounts" on public.utility_accounts;
create policy "Tenants read own utility accounts"
  on public.utility_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "Tenants read own bills" on public.utility_bills;
create policy "Tenants read own bills"
  on public.utility_bills for select
  using (
    exists (
      select 1 from public.utility_accounts a
      where a.id = utility_account_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "Tenants read own meter readings" on public.meter_readings;
create policy "Tenants read own meter readings"
  on public.meter_readings for select
  using (
    exists (
      select 1 from public.utility_accounts a
      where a.id = utility_account_id and a.user_id = auth.uid()
    )
  );

drop policy if exists "Public read compliance rules" on public.utility_compliance_rules;
create policy "Public read compliance rules"
  on public.utility_compliance_rules for select using (true);

-- =============================================================================
-- SEED: Ghana utility providers
-- =============================================================================

insert into public.utility_providers (id, country, utility_type, provider_name, billing_model, api_available) values
  ('gh-ecg', 'GH', 'electricity', 'ECG (Electricity Company of Ghana)', 'metered', false),
  ('gh-ecg-prepaid', 'GH', 'electricity', 'ECG Prepaid', 'prepaid', false),
  ('gh-water', 'GH', 'water', 'Ghana Water Company', 'metered', false),
  ('gh-mtn-fiber', 'GH', 'internet', 'MTN Home Fiber', 'flat', false),
  ('gh-telecel', 'GH', 'internet', 'Telecel Broadband', 'flat', false),
  ('gh-airteltigo', 'GH', 'internet', 'AirtelTigo Home', 'flat', false),
  ('gh-gas-vendor', 'GH', 'gas', 'Local LPG Vendor', 'flat', false)
on conflict (id) do nothing;

insert into public.utility_compliance_rules (id, country, utility_type, rule_key, rule_value) values
  ('gh-short-stay-exempt', 'GH', null, 'short_stay_utilities_inclusive', '{"max_days": 30, "mode": "inclusive"}'::jsonb),
  ('gh-long-term-billed', 'GH', null, 'long_term_utilities_billed', '{"min_days": 30, "mode": "billed"}'::jsonb),
  ('gh-ecg-prepaid', 'GH', 'electricity', 'prepaid_supported', '{"enabled": true}'::jsonb)
on conflict (id) do nothing;

-- Demo property utility config (East Legon listing)
insert into public.property_utilities (id, property_id, utility_type, provider_id, provider_name, billing_model, rate_per_unit, fixed_monthly_fee, enabled) values
  ('pu-east-ecg', 'east-legon-family-home', 'electricity', 'gh-ecg', 'ECG (Electricity Company of Ghana)', 'metered', 1.25, 0, true),
  ('pu-east-water', 'east-legon-family-home', 'water', 'gh-water', 'Ghana Water Company', 'metered', 0.85, 0, true),
  ('pu-east-internet', 'east-legon-family-home', 'internet', 'gh-mtn-fiber', 'MTN Home Fiber', 'flat', 0, 350, true),
  ('pu-east-gas', 'east-legon-family-home', 'gas', 'gh-gas-vendor', 'Local LPG Vendor', 'flat', 0, 180, true)
on conflict (property_id, utility_type) do nothing;
