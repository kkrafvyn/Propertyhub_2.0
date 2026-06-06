-- BaytMiftah live-app schema additions.
-- Run in Supabase SQL Editor, or create a proper migration with:
-- supabase migration new add_live_app_missing_tables
-- then copy this SQL into the generated file.

create extension if not exists pgcrypto;

alter table if exists public.organizations enable row level security;
alter table if exists public.organization_members enable row level security;
alter table if exists public.properties enable row level security;
alter table if exists public.listings enable row level security;
alter table if exists public.property_media enable row level security;

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
  role text not null default 'agent',
  status text not null default 'pending',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

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
security definer
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
security definer
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
alter table public.smart_devices enable row level security;
alter table public.smart_automation_rules enable row level security;
alter table public.smart_alerts enable row level security;
alter table public.smart_device_logs enable row level security;
alter table public.alert_preferences enable row level security;
alter table public.device_sharing enable row level security;

drop policy if exists "public listings are readable" on public.listings;
drop policy if exists "public properties are readable through listings" on public.properties;
drop policy if exists "organization owners can manage their organizations" on public.organizations;
drop policy if exists "organization owners can manage properties" on public.properties;
drop policy if exists "organization owners can manage listings" on public.listings;

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

create policy "organization owners can manage their organizations"
  on public.organizations for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

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
