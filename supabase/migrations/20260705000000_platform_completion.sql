-- Platform completion: automation rules, partner API keys, property wallets, tenant linkage

-- =============================================================================
-- EVENT AUTOMATION RULES (DB-driven, replaces hardcoded switch)
-- =============================================================================

create table if not exists public.event_automation_rules (
  id text primary key,
  event_type text not null,
  action_type text not null default 'notify_user'
    check (action_type in ('notify_user', 'email', 'webhook')),
  title_template text not null,
  body_template text not null,
  link_template text,
  condition jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  priority int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_event_automation_rules_type
  on public.event_automation_rules (event_type, enabled, priority desc);

alter table public.event_automation_rules enable row level security;

drop policy if exists "Public read automation rules" on public.event_automation_rules;
create policy "Public read automation rules"
  on public.event_automation_rules for select using (enabled = true);

insert into public.event_automation_rules (id, event_type, action_type, title_template, body_template, link_template, condition) values
  ('auto-pay-done', 'payment.completed', 'notify_user', 'Payment received', 'Your {{purpose}} payment of GHS {{amount}} was successful.', '/renter/payments', '{}'::jsonb),
  ('auto-bill-gen', 'utility.bill.generated', 'notify_user', 'New utility bill', 'A utility bill of GHS {{amount}} is ready.', '/renter/utilities', '{}'::jsonb),
  ('auto-bill-paid', 'utility.bill.paid', 'notify_user', 'Utility bill paid', 'Your utility payment has been recorded. Thank you!', '/renter/utilities', '{}'::jsonb),
  ('auto-booking', 'booking.created', 'notify_user', 'Booking confirmed', 'Your stay is booked — {{utilities_message}}.', '/trips', '{}'::jsonb),
  ('auto-risk', 'tenant.risk_updated', 'notify_user', 'Housing credit update', 'Your risk band is now "{{risk_band}}". Pay on time to improve your score.', '/renter/credit', '{"risk_bands":["elevated","high_risk"]}'::jsonb)
on conflict (id) do nothing;

-- =============================================================================
-- PARTNER API KEYS + RATE LIMITING
-- =============================================================================

create table if not exists public.platform_api_keys (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  key_hash text not null unique,
  key_prefix text not null,
  scopes text[] not null default '{read}',
  rate_limit_per_minute int not null default 60,
  requests_this_minute int not null default 0,
  minute_window timestamptz,
  last_used_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_api_keys_prefix on public.platform_api_keys (key_prefix);

alter table public.platform_api_keys enable row level security;

drop policy if exists "Users manage own api keys" on public.platform_api_keys;
create policy "Users manage own api keys"
  on public.platform_api_keys for all
  using (auth.uid() = user_id);

-- =============================================================================
-- PROPERTY WALLETS + PAYOUT SPLITS
-- =============================================================================

alter table public.wallets drop constraint if exists wallets_owner_type_check;
alter table public.wallets add constraint wallets_owner_type_check
  check (owner_type in ('user', 'organization', 'property'));

create table if not exists public.property_payout_rules (
  property_id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  platform_fee_pct numeric(5, 2) not null default 5.0 check (platform_fee_pct between 0 and 100),
  landlord_split_pct numeric(5, 2) not null default 95.0 check (landlord_split_pct between 0 and 100),
  auto_payout boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.property_payout_rules enable row level security;

drop policy if exists "Owners read property payout rules" on public.property_payout_rules;
create policy "Owners read property payout rules"
  on public.property_payout_rules for select
  using (auth.uid() = owner_user_id);

drop policy if exists "Owners manage property payout rules" on public.property_payout_rules;
create policy "Owners manage property payout rules"
  on public.property_payout_rules for all
  using (auth.uid() = owner_user_id);

drop policy if exists "Owners read property wallets" on public.wallets;
create policy "Owners read property wallets"
  on public.wallets for select
  using (
    owner_type = 'property'
    and exists (
      select 1 from public.property_payout_rules ppr
      where ppr.property_id = owner_id and ppr.owner_user_id = auth.uid()
    )
  );

-- =============================================================================
-- PMS TENANT → USER LINK (for credit score at lease approval)
-- =============================================================================

alter table public.pms_tenants
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_pms_tenants_user on public.pms_tenants (user_id);
