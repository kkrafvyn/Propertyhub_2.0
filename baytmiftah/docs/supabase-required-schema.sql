-- BaytMiftah live-app schema additions.
-- Run in Supabase SQL Editor, or create a proper migration with:
-- supabase migration new add_live_app_missing_tables
-- then copy this SQL into the generated file.

create extension if not exists pgcrypto;

create table if not exists public.user_roles (
  user_id uuid primary key,
  role text not null default 'buyer',
  agency_id uuid references public.organizations(id) on delete set null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_roles_role_check check (
    role in (
      'buyer',
      'renter',
      'property_owner',
      'independent_agent',
      'agency_owner',
      'agency_manager',
      'agency_agent',
      'agency_support',
      'property_developer',
      'property_manager',
      'platform_admin',
      'super_admin'
    )
  ),
  constraint user_roles_status_check check (status in ('active', 'suspended', 'pending'))
);

alter table if exists public.organizations enable row level security;
alter table if exists public.organization_members enable row level security;
alter table if exists public.properties enable row level security;
alter table if exists public.listings enable row level security;
alter table if exists public.property_media enable row level security;

alter table if exists public.organization_members
  add column if not exists status text not null default 'active',
  add column if not exists invited_by uuid,
  add column if not exists joined_at timestamptz;

alter table if exists public.organization_members
  drop constraint if exists organization_members_role_check;

alter table if exists public.organization_members
  add constraint organization_members_role_check
  check (role in ('agency_owner', 'agency_manager', 'agency_agent', 'agency_support'));

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.organizations(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  property_id uuid references public.properties(id) on delete set null,
  assigned_to uuid,
  name text not null,
  email text,
  phone text,
  message text,
  status text not null default 'new',
  source text default 'marketplace',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agency_analytics (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid unique references public.organizations(id) on delete cascade,
  total_listings integer not null default 0,
  active_listings integer not null default 0,
  total_leads integer not null default 0,
  conversion_rate numeric not null default 0,
  generated_at timestamptz not null default now()
);

create table if not exists public.agency_invitations (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'agency_agent',
  status text not null default 'pending',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.agency_invitations
  drop constraint if exists agency_invitations_role_check;

alter table public.agency_invitations
  add constraint agency_invitations_role_check
  check (role in ('agency_manager', 'agency_agent', 'agency_support'));

create table if not exists public.agency_verification_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.organizations(id) on delete cascade,
  documents jsonb not null default '[]'::jsonb,
  status text not null default 'pending',
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_devices (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  owner_id uuid,
  name text not null,
  type text not null,
  brand text,
  model text,
  serial_number text,
  mac_address text,
  status text not null default 'offline',
  battery_level integer,
  signal_strength integer,
  last_seen timestamptz,
  last_command_at timestamptz,
  paired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_automation_rules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  owner_id uuid,
  name text not null,
  trigger text not null,
  action text not null,
  trigger_device_id uuid references public.smart_devices(id) on delete set null,
  action_device_id uuid references public.smart_devices(id) on delete set null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.smart_alerts (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  device_id uuid references public.smart_devices(id) on delete set null,
  title text not null,
  message text,
  alert_type text,
  severity text not null default 'info',
  dismissed boolean not null default false,
  dismissed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.smart_device_logs (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  device_id uuid references public.smart_devices(id) on delete cascade,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.alert_preferences (
  user_id uuid primary key,
  email_enabled boolean not null default true,
  push_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.device_sharing (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.smart_devices(id) on delete cascade,
  shared_with uuid not null,
  permissions text not null default 'view',
  created_at timestamptz not null default now()
);

create or replace function public.generate_agency_analytics(p_agency_id uuid)
returns public.agency_analytics
language plpgsql
security invoker
set search_path = public
as $$
declare
  result public.agency_analytics;
begin
  insert into public.agency_analytics (
    agency_id,
    total_listings,
    active_listings,
    total_leads,
    conversion_rate,
    generated_at
  )
  values (
    p_agency_id,
    (select count(*) from public.listings where organization_id = p_agency_id),
    (select count(*) from public.listings where organization_id = p_agency_id and status = 'listed'),
    (select count(*) from public.leads where leads.agency_id = p_agency_id),
    0,
    now()
  )
  on conflict (agency_id) do update set
    total_listings = excluded.total_listings,
    active_listings = excluded.active_listings,
    total_leads = excluded.total_leads,
    generated_at = now()
  returning * into result;

  return result;
end;
$$;

create or replace function public.execute_device_command(device_id uuid, command_data jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.smart_devices
  set last_command_at = now(), updated_at = now()
  where id = device_id;

  insert into public.smart_device_logs (device_id, event_type, event_data)
  values (device_id, 'command', command_data);

  return jsonb_build_object('ok', true, 'device_id', device_id, 'command', command_data);
end;
$$;

create or replace function public.generate_device_pairing_code(device_type text)
returns text
language sql
as $$
  select upper(left(device_type, 2)) || '-' || upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8));
$$;

create or replace function public.validate_pairing_code(pairing_code text)
returns jsonb
language sql
as $$
  select jsonb_build_object('valid', pairing_code is not null and length(pairing_code) >= 6);
$$;

alter table public.leads enable row level security;
alter table public.agency_analytics enable row level security;
alter table public.agency_invitations enable row level security;
alter table public.agency_verification_requests enable row level security;
alter table public.user_roles enable row level security;
alter table public.smart_devices enable row level security;
alter table public.smart_automation_rules enable row level security;
alter table public.smart_alerts enable row level security;
alter table public.smart_device_logs enable row level security;
alter table public.alert_preferences enable row level security;
alter table public.device_sharing enable row level security;

drop policy if exists "public listings are readable" on public.listings;
drop policy if exists "public properties are readable through listings" on public.properties;
drop policy if exists "public property media is readable through listings" on public.property_media;
drop policy if exists "users can read their own role" on public.user_roles;
drop policy if exists "organization owners can manage their organizations" on public.organizations;
drop policy if exists "organization members can read their organization" on public.organizations;
drop policy if exists "organization owners can manage members" on public.organization_members;
drop policy if exists "organization owners can manage properties" on public.properties;
drop policy if exists "organization members can read properties" on public.properties;
drop policy if exists "organization owners can manage listings" on public.listings;
drop policy if exists "organization members can read listings" on public.listings;
drop policy if exists "organization members can manage leads" on public.leads;
drop policy if exists "organization members can read analytics" on public.agency_analytics;
drop policy if exists "organization admins can manage invitations" on public.agency_invitations;
drop policy if exists "organization members can manage verification requests" on public.agency_verification_requests;
drop policy if exists "property operators can manage devices" on public.smart_devices;
drop policy if exists "property operators can manage automation" on public.smart_automation_rules;
drop policy if exists "property operators can manage alerts" on public.smart_alerts;
drop policy if exists "property operators can manage logs" on public.smart_device_logs;
drop policy if exists "users can manage alert preferences" on public.alert_preferences;
drop policy if exists "device owners can manage sharing" on public.device_sharing;
drop policy if exists "shared users can read device shares" on public.device_sharing;

create policy "public listings are readable"
  on public.listings for select
  using (visibility = 'public');

create policy "public properties are readable through listings"
  on public.properties for select
  using (
    exists (
      select 1 from public.listings
      where listings.property_id = properties.id
        and listings.visibility = 'public'
    )
  );

create policy "public property media is readable through listings"
  on public.property_media for select
  using (
    exists (
      select 1 from public.listings
      where listings.property_id = property_media.property_id
        and listings.visibility = 'public'
    )
  );

create policy "users can read their own role"
  on public.user_roles for select
  using (user_id = auth.uid());

create policy "organization owners can manage their organizations"
  on public.organizations for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "organization members can read their organization"
  on public.organizations for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = organizations.id
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
    )
  );

create policy "organization owners can manage members"
  on public.organization_members for all
  using (
    exists (
      select 1 from public.organizations
      where organizations.id = organization_members.organization_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations
      where organizations.id = organization_members.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "organization owners can manage properties"
  on public.properties for all
  using (
    exists (
      select 1 from public.organizations
      where organizations.id = properties.organization_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations
      where organizations.id = properties.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "organization members can read properties"
  on public.properties for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = properties.organization_id
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
    )
  );

create policy "organization owners can manage listings"
  on public.listings for all
  using (
    exists (
      select 1 from public.organizations
      where organizations.id = listings.organization_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations
      where organizations.id = listings.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "organization members can read listings"
  on public.listings for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = listings.organization_id
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
    )
  );

create policy "organization members can manage leads"
  on public.leads for all
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = leads.agency_id
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
    )
    or exists (
      select 1 from public.organizations
      where organizations.id = leads.agency_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = leads.agency_id
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
    )
    or exists (
      select 1 from public.organizations
      where organizations.id = leads.agency_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "organization members can read analytics"
  on public.agency_analytics for select
  using (
    exists (
      select 1 from public.organization_members
      where organization_members.organization_id = agency_analytics.agency_id
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
    )
    or exists (
      select 1 from public.organizations
      where organizations.id = agency_analytics.agency_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "organization admins can manage invitations"
  on public.agency_invitations for all
  using (
    exists (
      select 1 from public.organizations
      where organizations.id = agency_invitations.agency_id
        and organizations.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.organization_members
      where organization_members.organization_id = agency_invitations.agency_id
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
        and organization_members.role in ('agency_owner', 'agency_manager')
    )
  )
  with check (
    exists (
      select 1 from public.organizations
      where organizations.id = agency_invitations.agency_id
        and organizations.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.organization_members
      where organization_members.organization_id = agency_invitations.agency_id
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
        and organization_members.role in ('agency_owner', 'agency_manager')
    )
  );

create policy "organization members can manage verification requests"
  on public.agency_verification_requests for all
  using (
    exists (
      select 1 from public.organizations
      where organizations.id = agency_verification_requests.agency_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations
      where organizations.id = agency_verification_requests.agency_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "property operators can manage devices"
  on public.smart_devices for all
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.properties
      join public.organizations on organizations.id = properties.organization_id
      where properties.id = smart_devices.property_id
        and organizations.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.properties
      join public.organization_members on organization_members.organization_id = properties.organization_id
      where properties.id = smart_devices.property_id
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
    )
  )
  with check (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.properties
      join public.organizations on organizations.id = properties.organization_id
      where properties.id = smart_devices.property_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "property operators can manage automation"
  on public.smart_automation_rules for all
  using (
    owner_id = auth.uid()
    or exists (
      select 1
      from public.properties
      join public.organizations on organizations.id = properties.organization_id
      where properties.id = smart_automation_rules.property_id
        and organizations.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.properties
      join public.organization_members on organization_members.organization_id = properties.organization_id
      where properties.id = smart_automation_rules.property_id
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
    )
  )
  with check (owner_id = auth.uid());

create policy "property operators can manage alerts"
  on public.smart_alerts for all
  using (
    exists (
      select 1
      from public.properties
      join public.organizations on organizations.id = properties.organization_id
      where properties.id = smart_alerts.property_id
        and organizations.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.properties
      join public.organization_members on organization_members.organization_id = properties.organization_id
      where properties.id = smart_alerts.property_id
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
    )
  )
  with check (
    exists (
      select 1
      from public.properties
      join public.organizations on organizations.id = properties.organization_id
      where properties.id = smart_alerts.property_id
        and organizations.owner_id = auth.uid()
    )
    or exists (
      select 1
      from public.properties
      join public.organization_members on organization_members.organization_id = properties.organization_id
      where properties.id = smart_alerts.property_id
        and organization_members.user_id = auth.uid()
        and organization_members.status = 'active'
    )
  );

create policy "property operators can manage logs"
  on public.smart_device_logs for all
  using (
    exists (
      select 1
      from public.smart_devices
      where smart_devices.id = smart_device_logs.device_id
        and smart_devices.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.smart_devices
      where smart_devices.id = smart_device_logs.device_id
        and smart_devices.owner_id = auth.uid()
    )
  );

create policy "users can manage alert preferences"
  on public.alert_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "device owners can manage sharing"
  on public.device_sharing for all
  using (
    exists (
      select 1 from public.smart_devices
      where smart_devices.id = device_sharing.device_id
        and smart_devices.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.smart_devices
      where smart_devices.id = device_sharing.device_id
        and smart_devices.owner_id = auth.uid()
    )
  );

create policy "shared users can read device shares"
  on public.device_sharing for select
  using (shared_with = auth.uid());

create index if not exists user_roles_agency_id_idx on public.user_roles(agency_id);
create index if not exists organization_members_org_user_idx on public.organization_members(organization_id, user_id);
create index if not exists properties_organization_id_idx on public.properties(organization_id);
create index if not exists listings_organization_id_idx on public.listings(organization_id);
create index if not exists listings_property_id_idx on public.listings(property_id);
create index if not exists property_media_property_id_idx on public.property_media(property_id);
create index if not exists leads_agency_id_idx on public.leads(agency_id);
create index if not exists smart_devices_property_id_idx on public.smart_devices(property_id);
create index if not exists smart_automation_rules_property_id_idx on public.smart_automation_rules(property_id);
create index if not exists smart_alerts_property_id_idx on public.smart_alerts(property_id);
create index if not exists smart_device_logs_device_id_idx on public.smart_device_logs(device_id);

grant usage on schema public to anon, authenticated;
grant select on public.organizations, public.properties, public.listings, public.property_media to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
