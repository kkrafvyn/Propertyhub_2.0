-- BaytMiftah Production OS Backbone
-- Event bus, ACID ledger, tenant intelligence, analytics facts

-- =============================================================================
-- EVENT BUS (Kafka/NATS-ready — append-only, partitionable by aggregate)
-- =============================================================================

create table if not exists public.platform_events (
  id text primary key,
  event_type text not null,
  aggregate_type text not null,
  aggregate_id text not null,
  actor_id uuid references auth.users(id),
  region_id text,
  payload jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text unique,
  published_at timestamptz not null default now()
);

create index if not exists idx_platform_events_type on public.platform_events(event_type);
create index if not exists idx_platform_events_aggregate on public.platform_events(aggregate_type, aggregate_id);
create index if not exists idx_platform_events_published on public.platform_events(published_at desc);

-- =============================================================================
-- FINANCIAL LEDGER (append-only ACID — never mutate, only append)
-- =============================================================================

create table if not exists public.financial_ledger (
  id text primary key,
  entry_type text not null check (entry_type in ('debit', 'credit')),
  account_type text not null check (account_type in ('user_wallet', 'property_wallet', 'escrow', 'platform', 'utility', 'rent')),
  account_id text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'GHS',
  reference_type text not null,
  reference_id text not null,
  idempotency_key text not null unique,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_financial_ledger_account on public.financial_ledger(account_type, account_id);
create index if not exists idx_financial_ledger_reference on public.financial_ledger(reference_type, reference_id);

-- =============================================================================
-- TENANT INTELLIGENCE (housing-specific credit & risk)
-- =============================================================================

create table if not exists public.tenant_intelligence (
  user_id uuid primary key references auth.users(id) on delete cascade,
  rental_history_months int not null default 0,
  on_time_payments int not null default 0,
  late_payments int not null default 0,
  missed_payments int not null default 0,
  utility_on_time int not null default 0,
  utility_late int not null default 0,
  credit_score int not null default 650 check (credit_score between 300 and 850),
  risk_score int not null default 0 check (risk_score between 0 and 100),
  risk_band text not null default 'standard' check (risk_band in ('approved', 'standard', 'elevated', 'high_risk', 'reject')),
  deposit_multiplier numeric(4, 2) not null default 1.0,
  last_computed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- ANALYTICS FACTS (data warehouse ingestion layer)
-- =============================================================================

create table if not exists public.analytics_facts (
  id text primary key,
  fact_type text not null,
  region_id text,
  country text,
  dimension_key text,
  dimension_value text,
  metric_value numeric(14, 4) not null,
  currency text,
  period text not null,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists idx_analytics_facts_type_period on public.analytics_facts(fact_type, period);

-- =============================================================================
-- BOOKING MODULE ACTIVATION LOG
-- =============================================================================

create table if not exists public.booking_module_activations (
  id text primary key,
  booking_type text not null check (booking_type in ('reservation', 'lease')),
  booking_id text not null,
  stay_type text not null,
  modules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (booking_type, booking_id)
);

-- =============================================================================
-- RLS
-- =============================================================================

alter table public.platform_events enable row level security;
alter table public.financial_ledger enable row level security;
alter table public.tenant_intelligence enable row level security;
alter table public.analytics_facts enable row level security;
alter table public.booking_module_activations enable row level security;

drop policy if exists "Users read own events" on public.platform_events;
drop policy if exists "Users read own events" on public.platform_events;
create policy "Users read own events"
  on public.platform_events for select
  using (auth.uid() = actor_id);

drop policy if exists "Users read own ledger" on public.financial_ledger;
drop policy if exists "Users read own ledger" on public.financial_ledger;
create policy "Users read own ledger"
  on public.financial_ledger for select
  using (
    account_type = 'user_wallet' and account_id = auth.uid()::text
  );

drop policy if exists "Users read own tenant intelligence" on public.tenant_intelligence;
drop policy if exists "Users read own tenant intelligence" on public.tenant_intelligence;
create policy "Users read own tenant intelligence"
  on public.tenant_intelligence for select
  using (auth.uid() = user_id);

drop policy if exists "Public read analytics facts" on public.analytics_facts;
drop policy if exists "Public read analytics facts" on public.analytics_facts;
create policy "Public read analytics facts"
  on public.analytics_facts for select using (true);

drop policy if exists "Users read own booking modules" on public.booking_module_activations;
drop policy if exists "Users read own booking modules" on public.booking_module_activations;
create policy "Users read own booking modules"
  on public.booking_module_activations for select using (true);

-- Seed analytics baseline (Greater Accra rent benchmark)
insert into public.analytics_facts (id, fact_type, region_id, country, dimension_key, dimension_value, metric_value, currency, period) values
  ('af-gh-rent-median', 'rent_median', 'africa_ghana', 'GH', 'city', 'Accra', 8500, 'GHS', '2026-06'),
  ('af-gh-util-ecg', 'utility_cost_avg', 'africa_ghana', 'GH', 'utility_type', 'electricity', 187.5, 'GHS', '2026-06'),
  ('af-gh-default-rate', 'default_rate', 'africa_ghana', 'GH', 'segment', 'long_term', 0.042, null, '2026-06')
on conflict (id) do nothing;
