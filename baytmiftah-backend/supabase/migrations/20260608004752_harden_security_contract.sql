create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Saved search',
  query text,
  filters jsonb not null default '{}'::jsonb,
  alert_frequency text not null default 'instant',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.offer_packets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  status text not null default 'drafted',
  signature_status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.e_sign_packets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  offer_packet_id text,
  provider text not null default 'manual',
  status text not null default 'pending',
  signed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  actor text not null default 'System',
  action text not null,
  entity text not null default 'System',
  severity text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.saved_searches enable row level security;
alter table public.offer_packets enable row level security;
alter table public.e_sign_packets enable row level security;
alter table public.audit_events enable row level security;
alter table public.agency_invitations enable row level security;

grant select, insert, update, delete on public.saved_searches to authenticated;
grant select, insert, update, delete on public.offer_packets to authenticated;
grant select, insert, update, delete on public.e_sign_packets to authenticated;
grant select, insert on public.audit_events to authenticated;
grant select, insert, update on public.agency_invitations to authenticated;

drop policy if exists "Users can manage own saved searches" on public.saved_searches;
drop policy if exists "Users can manage own offer packets" on public.offer_packets;
drop policy if exists "Users can manage own e-sign packets" on public.e_sign_packets;
drop policy if exists "Platform admins can read audit events" on public.audit_events;
drop policy if exists "Platform admins can insert audit events" on public.audit_events;
drop policy if exists "Organization owners can manage agency invitations" on public.agency_invitations;

create policy "Users can manage own saved searches"
  on public.saved_searches for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can manage own offer packets"
  on public.offer_packets for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can manage own e-sign packets"
  on public.e_sign_packets for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Platform admins can read audit events"
  on public.audit_events for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
        and user_roles.status = 'active'
    )
  );

create policy "Platform admins can insert audit events"
  on public.audit_events for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
        and user_roles.status = 'active'
    )
  );

create policy "Organization owners can manage agency invitations"
  on public.agency_invitations for all
  to authenticated
  using (
    exists (
      select 1
      from public.organizations
      where organizations.id = agency_invitations.agency_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.organizations
      where organizations.id = agency_invitations.agency_id
        and organizations.owner_id = auth.uid()
    )
  );

create index if not exists saved_searches_user_id_idx on public.saved_searches(user_id);
create index if not exists offer_packets_user_id_idx on public.offer_packets(user_id);
create index if not exists offer_packets_listing_id_idx on public.offer_packets(listing_id);
create index if not exists e_sign_packets_user_id_idx on public.e_sign_packets(user_id);
create index if not exists audit_events_created_at_idx on public.audit_events(created_at desc);
