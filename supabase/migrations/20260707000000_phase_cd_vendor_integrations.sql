-- Phase C/D + vendor portal, Paystack transfers, subscriptions

-- Payout accounts: Paystack transfer recipient
alter table public.payout_accounts add column if not exists paystack_recipient_code text;
alter table public.payout_accounts add column if not exists account_type text not null default 'mobile_money';
alter table public.payout_accounts add column if not exists bank_code text;
alter table public.payout_accounts add column if not exists account_name text;

alter table public.wallet_transactions add column if not exists provider_ref text;

-- Vendors: vendor portal login + stats
alter table public.vendors add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.vendors add column if not exists rating numeric(3, 2) default 0;
alter table public.vendors add column if not exists jobs_completed integer not null default 0;
alter table public.vendors add column if not exists specialty text;

create index if not exists idx_vendors_user_id on public.vendors (user_id);

drop policy if exists "Vendor users read assigned profile" on public.vendors;
drop policy if exists "Vendor users read assigned profile" on public.vendors;
create policy "Vendor users read assigned profile"
  on public.vendors for select using (auth.uid() = user_id);

-- Reputation scores (Phase C)
create table if not exists public.reputation_scores (
  user_id uuid primary key references auth.users(id) on delete cascade,
  score numeric(5, 2) not null default 50,
  review_avg numeric(3, 2) default 0,
  kyc_bonus numeric(5, 2) default 0,
  payment_bonus numeric(5, 2) default 0,
  factors jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.reputation_scores enable row level security;

drop policy if exists "Users read own reputation" on public.reputation_scores;
create policy "Users read own reputation"
  on public.reputation_scores for select using (auth.uid() = user_id);

drop policy if exists "Public read reputation" on public.reputation_scores;
create policy "Public read reputation"
  on public.reputation_scores for select using (true);

-- Property scores (Phase C)
create table if not exists public.property_scores (
  listing_id text primary key,
  score numeric(5, 2) not null default 70,
  factors jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.property_scores enable row level security;

drop policy if exists "Anyone read property scores" on public.property_scores;
create policy "Anyone read property scores"
  on public.property_scores for select using (true);

-- Subscription plans (Phase D)
create table if not exists public.subscription_plans (
  id text primary key,
  name text not null,
  tier text not null,
  price_monthly numeric(12, 2) not null,
  currency text not null default 'GHS',
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true
);

create table if not exists public.user_subscriptions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.subscription_plans(id),
  status text not null default 'active',
  provider text,
  provider_ref text,
  current_period_end timestamptz,
  created_at timestamptz not null default now()
);

alter table public.subscription_plans enable row level security;
alter table public.user_subscriptions enable row level security;

drop policy if exists "Anyone read active plans" on public.subscription_plans;
create policy "Anyone read active plans"
  on public.subscription_plans for select using (active = true);

drop policy if exists "Users read own subscriptions" on public.user_subscriptions;
create policy "Users read own subscriptions"
  on public.user_subscriptions for select using (auth.uid() = user_id);

insert into public.subscription_plans (id, name, tier, price_monthly, currency, features) values
  ('plan-agent-starter', 'Agent Starter', 'agent', 199, 'GHS', '["CRM", "10 listings", "Lead pipeline"]'),
  ('plan-agency-pro', 'Agency Pro', 'agency', 899, 'GHS', '["Team seats", "Payroll", "Analytics"]'),
  ('plan-enterprise', 'Enterprise', 'enterprise', 4999, 'GHS', '["Multi-org", "ESG", "API access"]')
on conflict (id) do nothing;

-- Partner referrals (Phase D)
create table if not exists public.partner_referrals (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  partner_type text not null,
  partner_id text,
  listing_id text,
  amount numeric(14, 2),
  referral_fee numeric(14, 2),
  status text not null default 'submitted',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.partner_referrals enable row level security;

drop policy if exists "Users read own referrals" on public.partner_referrals;
create policy "Users read own referrals"
  on public.partner_referrals for select using (auth.uid() = user_id);

-- Enterprise org ↔ portfolio links (Phase D)
create table if not exists public.enterprise_org_links (
  id text primary key,
  org_id text not null,
  portfolio_id text not null references public.enterprise_portfolios(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (org_id, portfolio_id)
);

alter table public.enterprise_org_links enable row level security;

drop policy if exists "Owners manage org links" on public.enterprise_org_links;
create policy "Owners manage org links"
  on public.enterprise_org_links for all using (auth.uid() = owner_user_id);

-- API usage metering (Phase D)
alter table public.platform_api_keys add column if not exists requests_total bigint not null default 0;

create table if not exists public.api_usage_logs (
  id text primary key,
  key_id text not null,
  endpoint text,
  created_at timestamptz not null default now()
);

alter table public.api_usage_logs enable row level security;
