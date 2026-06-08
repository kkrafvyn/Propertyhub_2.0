create table if not exists public.viewing_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  listing_id uuid references public.listings(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  requested_date date,
  requested_time text,
  contact_name text,
  contact_email text,
  contact_phone text,
  status text not null default 'requested',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_comparison_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null default 'Property comparison',
  listing_ids uuid[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listing_compliance_reviews add column if not exists ai_review jsonb not null default '{}'::jsonb;
alter table public.listing_compliance_reviews add column if not exists priority text not null default 'normal';
alter table public.fraud_signals add column if not exists surfaced_in_admin_queue boolean not null default true;

alter table public.viewing_requests enable row level security;
alter table public.property_comparison_sets enable row level security;

grant select, insert, update on public.viewing_requests to authenticated;
grant select, insert, update, delete on public.property_comparison_sets to authenticated;

drop policy if exists "Users can manage own viewing requests" on public.viewing_requests;
drop policy if exists "Organization owners can review viewing requests" on public.viewing_requests;
drop policy if exists "Users can manage own comparison sets" on public.property_comparison_sets;

create policy "Users can manage own viewing requests"
  on public.viewing_requests for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Organization owners can review viewing requests"
  on public.viewing_requests for select
  to authenticated
  using (
    exists (
      select 1
      from public.organizations
      where organizations.id = viewing_requests.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "Users can manage own comparison sets"
  on public.property_comparison_sets for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.viewing_requests;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.leads;
exception
  when duplicate_object then null;
end $$;
