-- Pending OS migrations

-- Platform moderator role: limited admin staff for trust & safety

-- Extend listing moderation visibility to platform moderators
drop policy if exists "Submitters read own listings" on public.listings;
create policy "Submitters read own listings"
  on public.listings for select
  using (
    status = 'active'
    or submitted_by = auth.uid()
    or exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in ('agency_owner', 'agency_manager', 'platform_admin', 'platform_moderator')
    )
  );

-- Extend agent viewing reads to platform moderators
drop policy if exists "Agents read all viewing requests" on public.viewing_requests;
create policy "Agents read all viewing requests"
  on public.viewing_requests for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in (
        'independent_agent',
        'agency_agent',
        'agency_owner',
        'agency_manager',
        'platform_admin',
        'platform_moderator'
      )
    )
  );

drop policy if exists "Agents update viewing requests" on public.viewing_requests;
create policy "Agents update viewing requests"
  on public.viewing_requests for update
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in (
        'independent_agent',
        'agency_agent',
        'agency_owner',
        'agency_manager',
        'platform_admin',
        'platform_moderator'
      )
    )
  );


-- BaytMiftah Real Estate OS: capabilities, wallet, host/reservations,
-- tenant portal, investment, smart resident, organizations, RLS hardening

-- =============================================================================
-- CAPABILITIES (capability-based access)
-- =============================================================================

create table if not exists public.user_capabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  capability text not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id),
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  unique (user_id, capability)
);

create index if not exists idx_user_capabilities_user on public.user_capabilities(user_id);

alter table public.user_capabilities enable row level security;

create policy "Users read own capabilities"
  on public.user_capabilities for select
  using (auth.uid() = user_id);

create policy "Staff manage capabilities"
  on public.user_capabilities for all
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in ('platform_admin', 'platform_moderator')
    )
  );

-- Backfill capabilities from legacy consumer roles
insert into public.user_capabilities (user_id, capability, metadata)
select p.id, 'buy', '{"source":"role_migration"}'::jsonb
from public.user_profiles p
where p.role in ('buyer', 'property_owner')
on conflict (user_id, capability) do nothing;

insert into public.user_capabilities (user_id, capability, metadata)
select p.id, 'rent', '{"source":"role_migration"}'::jsonb
from public.user_profiles p
where p.role in ('renter', 'property_owner', 'property_manager')
on conflict (user_id, capability) do nothing;

insert into public.user_capabilities (user_id, capability, metadata)
select p.id, 'invest', '{"source":"role_migration"}'::jsonb
from public.user_profiles p
where p.role in ('investor', 'enterprise_operator')
on conflict (user_id, capability) do nothing;

insert into public.user_capabilities (user_id, capability, metadata)
select p.id, 'host_short_stay', '{"source":"role_migration"}'::jsonb
from public.user_profiles p
where p.role in ('property_owner', 'buyer')
on conflict (user_id, capability) do nothing;

-- =============================================================================
-- WALLET / LEDGER
-- =============================================================================

create table if not exists public.wallets (
  id text primary key,
  owner_type text not null check (owner_type in ('user', 'organization')),
  owner_id text not null,
  currency text not null default 'GHS',
  available_balance numeric(14, 2) not null default 0,
  pending_balance numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_type, owner_id, currency)
);

create table if not exists public.wallet_transactions (
  id text primary key,
  wallet_id text not null references public.wallets(id) on delete cascade,
  type text not null,
  amount numeric(14, 2) not null,
  currency text not null default 'GHS',
  status text not null default 'completed',
  reference_type text,
  reference_id text,
  description text,
  created_at timestamptz not null default now()
);

create table if not exists public.wallet_holds (
  id text primary key,
  wallet_id text not null references public.wallets(id) on delete cascade,
  amount numeric(14, 2) not null,
  reason text not null,
  release_at timestamptz,
  escrow_id text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.payout_accounts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  account_ref text not null,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.wallet_holds enable row level security;
alter table public.payout_accounts enable row level security;

drop policy if exists "Owners read own wallets" on public.wallets;
create policy "Owners read own wallets"
  on public.wallets for select
  using (owner_type = 'user' and owner_id = auth.uid()::text);

drop policy if exists "Owners read own wallet transactions" on public.wallet_transactions;
create policy "Owners read own wallet transactions"
  on public.wallet_transactions for select
  using (
    exists (
      select 1 from public.wallets w
      where w.id = wallet_id and w.owner_type = 'user' and w.owner_id = auth.uid()::text
    )
  );

drop policy if exists "Users read own payout accounts" on public.payout_accounts;
create policy "Users read own payout accounts"
  on public.payout_accounts for select
  using (auth.uid() = user_id);

drop policy if exists "Users manage own payout accounts" on public.payout_accounts;
create policy "Users manage own payout accounts"
  on public.payout_accounts for all
  using (auth.uid() = user_id);

-- =============================================================================
-- HOST / SHORT-STAY
-- =============================================================================

create table if not exists public.host_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  superhost_score numeric(4, 2) default 0,
  payout_account_id text references public.payout_accounts(id),
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_availability (
  id text primary key,
  listing_id text not null,
  date date not null,
  available boolean not null default true,
  min_nights int not null default 1,
  price_override numeric(12, 2),
  unique (listing_id, date)
);

create table if not exists public.listing_pricing_rules (
  id text primary key,
  listing_id text not null,
  rule_type text not null,
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id text primary key,
  listing_id text not null,
  guest_id uuid not null references auth.users(id),
  host_id uuid not null references auth.users(id),
  check_in date not null,
  check_out date not null,
  status text not null default 'pending',
  total numeric(12, 2) not null default 0,
  currency text not null default 'GHS',
  guests int not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.reservation_events (
  id text primary key,
  reservation_id text not null references public.reservations(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.cleaning_tasks (
  id text primary key,
  listing_id text not null,
  reservation_id text references public.reservations(id),
  scheduled_at timestamptz not null,
  vendor_name text,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create table if not exists public.host_payouts (
  id text primary key,
  host_id uuid not null references auth.users(id),
  amount numeric(12, 2) not null,
  currency text not null default 'GHS',
  status text not null default 'pending',
  wallet_transaction_id text references public.wallet_transactions(id),
  created_at timestamptz not null default now()
);

alter table public.host_profiles enable row level security;
alter table public.listing_availability enable row level security;
alter table public.listing_pricing_rules enable row level security;
alter table public.reservations enable row level security;
alter table public.cleaning_tasks enable row level security;
alter table public.host_payouts enable row level security;

create policy "Hosts manage own profile"
  on public.host_profiles for all
  using (auth.uid() = user_id);

create policy "Public read availability"
  on public.listing_availability for select
  using (true);

create policy "Hosts manage availability"
  on public.listing_availability for all
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
      and (l.submitted_by = auth.uid() or l.owner_id = auth.uid())
    )
  );

create policy "Guests and hosts read reservations"
  on public.reservations for select
  using (auth.uid() = guest_id or auth.uid() = host_id);

create policy "Guests create reservations"
  on public.reservations for insert
  with check (auth.uid() = guest_id);

create policy "Hosts update reservations"
  on public.reservations for update
  using (auth.uid() = host_id);

create policy "Hosts read own payouts"
  on public.host_payouts for select
  using (auth.uid() = host_id);

-- =============================================================================
-- TENANT PORTAL EXTENSIONS
-- =============================================================================

create table if not exists public.pms_tenant_users (
  id text primary key,
  pms_tenant_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  linked_at timestamptz not null default now(),
  unique (pms_tenant_id, user_id)
);

create table if not exists public.visitor_passes (
  id text primary key,
  tenant_user_id uuid not null references auth.users(id),
  property_id text not null,
  guest_name text not null,
  valid_from timestamptz not null,
  valid_to timestamptz not null,
  access_code text not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.community_announcements (
  id text primary key,
  property_id text,
  org_id text,
  title text not null,
  body text not null,
  published_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.tenant_documents (
  id text primary key,
  tenant_user_id uuid not null references auth.users(id),
  lease_id text,
  document_id text,
  doc_type text not null,
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.pms_tenant_users enable row level security;
alter table public.visitor_passes enable row level security;
alter table public.community_announcements enable row level security;
alter table public.tenant_documents enable row level security;

create policy "Tenants read own links"
  on public.pms_tenant_users for select
  using (auth.uid() = user_id);

create policy "Tenants manage visitor passes"
  on public.visitor_passes for all
  using (auth.uid() = tenant_user_id);

create policy "Tenants read announcements"
  on public.community_announcements for select
  using (true);

create policy "Tenants read own documents"
  on public.tenant_documents for select
  using (auth.uid() = tenant_user_id);

-- =============================================================================
-- INVESTMENT CENTER
-- =============================================================================

create table if not exists public.investment_portfolios (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency text not null default 'GHS',
  created_at timestamptz not null default now()
);

create table if not exists public.portfolio_holdings (
  id text primary key,
  portfolio_id text not null references public.investment_portfolios(id) on delete cascade,
  listing_id text,
  asset_ref text,
  acquired_at date,
  cost_basis numeric(14, 2),
  notes text
);

create table if not exists public.investment_scenarios (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text,
  assumptions jsonb not null default '{}'::jsonb,
  projections jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.investment_portfolios enable row level security;
alter table public.portfolio_holdings enable row level security;
alter table public.investment_scenarios enable row level security;

create policy "Users manage own portfolios"
  on public.investment_portfolios for all
  using (auth.uid() = user_id);

create policy "Users read own holdings"
  on public.portfolio_holdings for select
  using (
    exists (
      select 1 from public.investment_portfolios p
      where p.id = portfolio_id and p.user_id = auth.uid()
    )
  );

create policy "Users manage own scenarios"
  on public.investment_scenarios for all
  using (auth.uid() = user_id);

-- =============================================================================
-- SMART RESIDENT
-- =============================================================================

create table if not exists public.access_credentials (
  id text primary key,
  user_id uuid not null references auth.users(id),
  device_id text not null,
  credential_type text not null default 'door',
  valid_from timestamptz not null,
  valid_to timestamptz not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.visitor_access_logs (
  id text primary key,
  pass_id text references public.visitor_passes(id),
  device_id text not null,
  event_at timestamptz not null default now(),
  success boolean not null default true
);

create table if not exists public.energy_readings (
  id text primary key,
  property_id text not null,
  device_id text,
  period date not null,
  kwh numeric(10, 2) not null default 0,
  cost numeric(10, 2) not null default 0
);

alter table public.access_credentials enable row level security;
alter table public.visitor_access_logs enable row level security;
alter table public.energy_readings enable row level security;

create policy "Residents read own credentials"
  on public.access_credentials for select
  using (auth.uid() = user_id);

create policy "Residents read own energy"
  on public.energy_readings for select
  using (
    exists (
      select 1 from public.leases l
      where l.user_id = auth.uid() and l.status = 'active'
    )
  );

-- =============================================================================
-- ENTERPRISE ORGANIZATIONS
-- =============================================================================

create table if not exists public.organizations (
  id text primary key,
  name text not null,
  slug text not null unique,
  country text not null default 'GH',
  plan text not null default 'starter',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id text primary key,
  org_id text not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (org_id, user_id)
);

create table if not exists public.organization_permissions (
  id text primary key,
  org_id text not null references public.organizations(id) on delete cascade,
  role text not null,
  permission text not null,
  unique (org_id, role, permission)
);

create table if not exists public.organization_entities (
  id text primary key,
  org_id text not null references public.organizations(id) on delete cascade,
  parent_id text references public.organization_entities(id),
  name text not null,
  entity_type text not null default 'subsidiary'
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_permissions enable row level security;
alter table public.organization_entities enable row level security;

create policy "Members read own orgs"
  on public.organizations for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = id and m.user_id = auth.uid()
    )
  );

create policy "Members read org membership"
  on public.organization_members for select
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = org_id and m.user_id = auth.uid()
    )
  );

create policy "Org admins manage members"
  on public.organization_members for all
  using (
    exists (
      select 1 from public.organization_members m
      where m.org_id = org_id and m.user_id = auth.uid() and m.role in ('owner', 'admin')
    )
  );

create policy "Org admins read org wallets"
  on public.wallets for select
  using (
    owner_type = 'organization'
    and exists (
      select 1 from public.organization_members m
      where m.org_id = owner_id and m.user_id = auth.uid() and m.role in ('owner', 'admin')
    )
  );

-- =============================================================================
-- RLS HARDENING (existing tables)
-- =============================================================================

alter table public.escrow_accounts enable row level security;
alter table public.commission_settlements enable row level security;
alter table public.agencies enable row level security;
alter table public.audit_events enable row level security;
alter table public.moderation_queue enable row level security;
alter table public.neighborhoods enable row level security;
alter table public.market_zones enable row level security;
alter table public.mortgage_partners enable row level security;

drop policy if exists "Users read own escrow" on public.escrow_accounts;
create policy "Users read own escrow"
  on public.escrow_accounts for select
  using (auth.uid() = buyer_id);

drop policy if exists "Agents read commissions" on public.commission_settlements;
create policy "Agents read commissions"
  on public.commission_settlements for select
  using (
    auth.uid() = agent_id
    or exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid() and p.role in ('platform_admin', 'agency_owner')
    )
  );

drop policy if exists "Public read neighborhoods" on public.neighborhoods;
create policy "Public read neighborhoods"
  on public.neighborhoods for select
  using (true);

drop policy if exists "Public read market zones" on public.market_zones;
create policy "Public read market zones"
  on public.market_zones for select
  using (true);

drop policy if exists "Public read mortgage partners" on public.mortgage_partners;
create policy "Public read mortgage partners"
  on public.mortgage_partners for select
  using (true);

drop policy if exists "Staff read audit" on public.audit_events;
create policy "Staff read audit"
  on public.audit_events for select
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid() and p.role in ('platform_admin', 'platform_moderator')
    )
  );

drop policy if exists "Staff read moderation queue" on public.moderation_queue;
create policy "Staff read moderation queue"
  on public.moderation_queue for select
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in ('platform_admin', 'platform_moderator', 'agency_owner', 'agency_manager')
    )
  );
