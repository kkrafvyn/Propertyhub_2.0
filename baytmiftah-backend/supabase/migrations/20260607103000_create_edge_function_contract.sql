-- BaytMiftah Edge Function contract schema.
-- This migration matches the tables queried by supabase/functions/*.

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  slug text unique not null,
  description text,
  website text,
  email text,
  phone text,
  logo_url text,
  banner_url text,
  verified boolean not null default false,
  suspended boolean not null default false,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  ghana_business_registration_number text,
  ghana_tax_identification_number text,
  verification_submitted_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'buyer',
  agency_id uuid references public.organizations(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  role text not null default 'agency_agent',
  status text not null default 'invited',
  invited_by uuid references auth.users(id) on delete set null,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id),
  unique (organization_id, email)
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  owner_id uuid references auth.users(id) on delete set null,
  agent_id uuid references auth.users(id) on delete set null,
  title text not null,
  description text,
  address text,
  city text,
  region text,
  country text not null default 'Ghana',
  neighborhood text,
  category text,
  latitude numeric,
  longitude numeric,
  property_type text,
  bedrooms integer,
  bathrooms integer,
  square_meters numeric,
  sqft numeric,
  address_verified boolean not null default false,
  location_confidence numeric not null default 0,
  flood_risk_level text not null default 'unknown',
  ghana_post_gps text,
  amenities text[] not null default '{}',
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  listing_type text not null default 'sale',
  title text,
  price numeric,
  currency text not null default 'GHS',
  price_label text,
  quality_score integer not null default 72,
  whatsapp_enabled boolean not null default true,
  status text not null default 'listed',
  visibility text not null default 'public',
  featured boolean not null default false,
  verification_status text not null default 'submitted',
  published_at timestamptz,
  expires_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_media (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  url text,
  public_url text,
  media_type text not null default 'image',
  alt text,
  alt_text text,
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.organizations(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  name text not null,
  email text,
  phone text,
  property_interest text,
  status text not null default 'new',
  assigned_to uuid references auth.users(id) on delete set null,
  notes text,
  pipeline_stage_id uuid,
  intent_score integer not null default 50,
  follow_up_status text,
  next_follow_up_at timestamptz,
  lead_source text,
  estimated_budget numeric,
  preferred_area text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agency_analytics (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.organizations(id) on delete cascade,
  snapshot_date date not null default current_date,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (agency_id, snapshot_date)
);

create table if not exists public.agency_invitations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'agency_agent',
  status text not null default 'pending',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.agency_verification_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.organizations(id) on delete cascade,
  documents jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_devices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  type text not null,
  brand text,
  model text,
  serial_number text,
  mac_address text,
  pairing_code text,
  status text not null default 'offline',
  battery_level integer,
  signal_strength integer,
  last_seen timestamptz,
  last_command_at timestamptz,
  paired_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_automation_rules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  name text not null,
  trigger text,
  action text,
  trigger_device_id uuid references public.smart_devices(id) on delete set null,
  action_device_id uuid references public.smart_devices(id) on delete set null,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_device_logs (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.smart_devices(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.smart_alerts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  title text not null,
  message text,
  alert_type text,
  severity text not null default 'info',
  dismissed boolean not null default false,
  dismissed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.alert_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  channels text[] not null default array['email'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.device_sharing (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.smart_devices(id) on delete cascade,
  shared_with uuid not null references auth.users(id) on delete cascade,
  permissions text not null default 'view',
  created_at timestamptz not null default now(),
  unique (device_id, shared_with)
);

create table if not exists public.crm_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  probability integer not null default 0,
  color text,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

-- Compatibility for databases created from the older README schema.
alter table public.properties add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.properties add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.properties add column if not exists region text;
alter table public.properties add column if not exists neighborhood text;
alter table public.properties add column if not exists category text;
alter table public.properties add column if not exists latitude numeric;
alter table public.properties add column if not exists longitude numeric;
alter table public.properties add column if not exists property_type text;
alter table public.properties add column if not exists square_meters numeric;
alter table public.properties add column if not exists sqft numeric;
alter table public.properties add column if not exists address_verified boolean not null default false;
alter table public.properties add column if not exists location_confidence numeric not null default 0;
alter table public.properties add column if not exists flood_risk_level text not null default 'unknown';
alter table public.properties add column if not exists ghana_post_gps text;
alter table public.properties add column if not exists amenities text[] not null default '{}';
alter table public.properties add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.listings add column if not exists quality_score integer not null default 72;
alter table public.listings add column if not exists whatsapp_enabled boolean not null default true;

alter table public.property_media add column if not exists public_url text;
alter table public.property_media add column if not exists alt_text text;
alter table public.property_media add column if not exists is_primary boolean not null default false;

alter table public.leads add column if not exists organization_id uuid references public.organizations(id) on delete cascade;
alter table public.leads add column if not exists listing_id uuid references public.listings(id) on delete set null;
alter table public.leads add column if not exists property_id uuid references public.properties(id) on delete set null;
alter table public.leads add column if not exists assigned_to uuid references auth.users(id) on delete set null;
alter table public.leads add column if not exists pipeline_stage_id uuid;
alter table public.leads add column if not exists intent_score integer not null default 50;
alter table public.leads add column if not exists follow_up_status text;
alter table public.leads add column if not exists next_follow_up_at timestamptz;
alter table public.leads add column if not exists lead_source text;
alter table public.leads add column if not exists estimated_budget numeric;
alter table public.leads add column if not exists preferred_area text;
alter table public.leads add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.smart_devices add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.smart_devices add column if not exists last_command_at timestamptz;
alter table public.smart_devices add column if not exists paired_at timestamptz;
alter table public.smart_devices add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.smart_automation_rules add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.smart_automation_rules add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.smart_device_logs add column if not exists property_id uuid references public.properties(id) on delete cascade;
alter table public.smart_device_logs add column if not exists event_data jsonb not null default '{}'::jsonb;

alter table public.smart_alerts add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.smart_alerts add column if not exists dismissed boolean not null default false;
alter table public.smart_alerts add column if not exists dismissed_at timestamptz;
alter table public.smart_alerts add column if not exists metadata jsonb not null default '{}'::jsonb;

do $$
begin
  if to_regclass('public.agencies') is not null then
    insert into public.organizations (
      id,
      owner_id,
      name,
      slug,
      description,
      website,
      email,
      phone,
      verification_status,
      ghana_business_registration_number,
      verified,
      verified_at,
      created_at,
      updated_at
    )
    select
      id,
      user_id,
      company_name,
      trim(both '-' from regexp_replace(lower(company_name), '[^a-z0-9]+', '-', 'g')) || '-' || left(id::text, 8),
      description,
      website,
      email,
      phone,
      verification_status,
      license_number,
      verification_status = 'verified',
      verified_at,
      created_at,
      updated_at
    from public.agencies
    on conflict (id) do nothing;

    insert into public.user_roles (user_id, role, agency_id, status)
    select user_id, 'agency_owner', id, 'active'
    from public.agencies
    where user_id is not null
    on conflict (user_id) do update set
      role = excluded.role,
      agency_id = excluded.agency_id,
      status = excluded.status,
      updated_at = now();
  end if;

  if to_regclass('public.properties') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'properties'
        and column_name = 'agency_id'
    )
  then
    update public.properties
    set organization_id = agency_id
    where organization_id is null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'agency_id'
  ) then
    alter table public.properties alter column agency_id drop not null;
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'properties'
      and column_name = 'location'
  ) then
    alter table public.properties alter column location drop not null;
  end if;

  if to_regclass('public.smart_devices') is not null
    and exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'smart_devices'
        and column_name = 'user_id'
    )
  then
    update public.smart_devices
    set owner_id = user_id
    where owner_id is null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_pipeline_stage_id_fkey'
  ) then
    alter table public.leads
      add constraint leads_pipeline_stage_id_fkey
      foreign key (pipeline_stage_id)
      references public.crm_pipeline_stages(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  activity_type text not null default 'note',
  title text not null,
  notes text,
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.listing_compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  country_code text not null default 'GH',
  status text not null,
  score integer not null default 0,
  required_documents text[] not null default '{}',
  missing_documents text[] not null default '{}',
  risk_flags text[] not null default '{}',
  reviewer_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.trust_scores (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  score integer not null default 0,
  tier text not null default 'standard',
  factors jsonb not null default '[]'::jsonb,
  calculated_by text,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_type, subject_id)
);

create table if not exists public.fraud_signals (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null default 'listing',
  subject_id uuid not null,
  organization_id uuid references public.organizations(id) on delete set null,
  signal_type text not null default 'manual_review',
  severity text not null default 'medium',
  status text not null default 'open',
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  audience text not null default 'agency',
  code text unique not null,
  name text not null,
  price_monthly numeric not null default 0,
  currency text not null default 'GHS',
  featured_listing_credits integer not null default 0,
  seat_limit integer,
  listing_limit integer,
  capabilities text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  status text not null default 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.featured_listing_campaigns (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'scheduled',
  placement text not null default 'search_top',
  budget numeric not null default 0,
  currency text not null default 'GHS',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organizations_owner_id_idx on public.organizations(owner_id);
create index if not exists organizations_slug_idx on public.organizations(slug);
create index if not exists user_roles_user_id_idx on public.user_roles(user_id);
create index if not exists organization_members_org_idx on public.organization_members(organization_id);
create index if not exists organization_members_user_idx on public.organization_members(user_id);
create index if not exists properties_org_idx on public.properties(organization_id);
create index if not exists listings_property_idx on public.listings(property_id);
create index if not exists listings_org_idx on public.listings(organization_id);
create index if not exists listings_public_idx on public.listings(visibility, featured, published_at);
create index if not exists property_media_property_idx on public.property_media(property_id, sort_order);
create index if not exists leads_agency_idx on public.leads(agency_id);
create index if not exists leads_org_idx on public.leads(organization_id);
create index if not exists smart_devices_property_idx on public.smart_devices(property_id);
create index if not exists smart_devices_owner_idx on public.smart_devices(owner_id);
create index if not exists smart_logs_device_idx on public.smart_device_logs(device_id, created_at desc);
create index if not exists smart_alerts_property_idx on public.smart_alerts(property_id, created_at desc);
create index if not exists crm_activities_org_idx on public.crm_activities(organization_id, created_at desc);
create index if not exists compliance_reviews_listing_idx on public.listing_compliance_reviews(listing_id, created_at desc);
create index if not exists fraud_signals_org_idx on public.fraud_signals(organization_id, created_at desc);

insert into public.subscription_plans (
  audience,
  code,
  name,
  price_monthly,
  currency,
  featured_listing_credits,
  seat_limit,
  listing_limit,
  capabilities
) values
  ('agency', 'agency_starter', 'Agency Starter', 0, 'GHS', 1, 3, 25,
    array['Verified agency profile', 'Lead inbox', 'Basic analytics']),
  ('agency', 'agency_professional', 'Agency Professional', 650, 'GHS', 10, 15, 250,
    array['Advanced CRM', 'Featured listings', 'Team permissions', 'Market analytics']),
  ('agency', 'agency_enterprise', 'Agency Enterprise', 2500, 'GHS', 50, null, null,
    array['Unlimited listings', 'Priority verification', 'Fraud review queue', 'Dedicated support'])
on conflict (code) do update set
  name = excluded.name,
  price_monthly = excluded.price_monthly,
  currency = excluded.currency,
  featured_listing_credits = excluded.featured_listing_credits,
  seat_limit = excluded.seat_limit,
  listing_limit = excluded.listing_limit,
  capabilities = excluded.capabilities,
  active = true,
  updated_at = now();

alter table public.organizations enable row level security;
alter table public.user_roles enable row level security;
alter table public.organization_members enable row level security;
alter table public.properties enable row level security;
alter table public.listings enable row level security;
alter table public.property_media enable row level security;
alter table public.leads enable row level security;
alter table public.agency_analytics enable row level security;
alter table public.agency_invitations enable row level security;
alter table public.agency_verification_requests enable row level security;
alter table public.smart_devices enable row level security;
alter table public.smart_automation_rules enable row level security;
alter table public.smart_device_logs enable row level security;
alter table public.smart_alerts enable row level security;
alter table public.alert_preferences enable row level security;
alter table public.device_sharing enable row level security;
alter table public.crm_pipeline_stages enable row level security;
alter table public.crm_activities enable row level security;
alter table public.listing_compliance_reviews enable row level security;
alter table public.trust_scores enable row level security;
alter table public.fraud_signals enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.featured_listing_campaigns enable row level security;

grant usage on schema public to anon, authenticated;
grant select on public.subscription_plans to anon, authenticated;
grant select on public.organizations, public.properties, public.listings, public.property_media to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;

drop policy if exists "Public can view verified organizations" on public.organizations;
drop policy if exists "Organization owners can manage organizations" on public.organizations;
drop policy if exists "Users can view own role" on public.user_roles;
drop policy if exists "Users can create own role" on public.user_roles;
drop policy if exists "Users can view own memberships" on public.organization_members;
drop policy if exists "Organization owners can manage members" on public.organization_members;
drop policy if exists "Public can view public listings" on public.listings;
drop policy if exists "Public can view listed properties" on public.properties;
drop policy if exists "Public can view listed property media" on public.property_media;
drop policy if exists "Owners can manage properties" on public.properties;
drop policy if exists "Organization owners can manage listings" on public.listings;
drop policy if exists "Users can manage own alert preferences" on public.alert_preferences;
drop policy if exists "Users can view shared devices" on public.device_sharing;
drop policy if exists "Users can manage own devices" on public.smart_devices;
drop policy if exists "Anyone can view active plans" on public.subscription_plans;

create policy "Public can view verified organizations"
  on public.organizations for select
  using (verified = true and suspended = false);

create policy "Organization owners can manage organizations"
  on public.organizations for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Users can view own role"
  on public.user_roles for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can create own role"
  on public.user_roles for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can view own memberships"
  on public.organization_members for select
  to authenticated
  using (user_id = auth.uid());

create policy "Organization owners can manage members"
  on public.organization_members for all
  to authenticated
  using (exists (
    select 1 from public.organizations
    where organizations.id = organization_members.organization_id
      and organizations.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.organizations
    where organizations.id = organization_members.organization_id
      and organizations.owner_id = auth.uid()
  ));

create policy "Public can view public listings"
  on public.listings for select
  using (visibility = 'public');

create policy "Public can view listed properties"
  on public.properties for select
  using (exists (
    select 1 from public.listings
    where listings.property_id = properties.id
      and listings.visibility = 'public'
  ));

create policy "Public can view listed property media"
  on public.property_media for select
  using (exists (
    select 1
    from public.listings
    where listings.property_id = property_media.property_id
      and listings.visibility = 'public'
  ));

create policy "Owners can manage properties"
  on public.properties for all
  to authenticated
  using (owner_id = auth.uid() or exists (
    select 1 from public.organizations
    where organizations.id = properties.organization_id
      and organizations.owner_id = auth.uid()
  ))
  with check (owner_id = auth.uid() or exists (
    select 1 from public.organizations
    where organizations.id = properties.organization_id
      and organizations.owner_id = auth.uid()
  ));

create policy "Organization owners can manage listings"
  on public.listings for all
  to authenticated
  using (exists (
    select 1 from public.organizations
    where organizations.id = listings.organization_id
      and organizations.owner_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.organizations
    where organizations.id = listings.organization_id
      and organizations.owner_id = auth.uid()
  ));

create policy "Users can manage own alert preferences"
  on public.alert_preferences for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can view shared devices"
  on public.device_sharing for select
  to authenticated
  using (shared_with = auth.uid());

create policy "Users can manage own devices"
  on public.smart_devices for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Anyone can view active plans"
  on public.subscription_plans for select
  using (active = true);
