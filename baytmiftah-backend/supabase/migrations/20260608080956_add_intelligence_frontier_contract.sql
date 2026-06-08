create table if not exists public.ai_concierge_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  intent_profile jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.owner_portal_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  property_id uuid references public.properties(id) on delete cascade,
  period_start date,
  period_end date,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.neighborhood_metrics (
  id uuid primary key default gen_random_uuid(),
  country_code text not null default 'GH',
  city text not null,
  neighborhood text not null,
  metrics jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique (country_code, city, neighborhood)
);

create table if not exists public.developer_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  location text,
  launch_status text not null default 'planning',
  unit_mix jsonb not null default '[]'::jsonb,
  reservation_deposit numeric not null default 0,
  waitlist_count integer not null default 0,
  construction_progress integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inspection_reports (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  inspector_id uuid references auth.users(id) on delete set null,
  status text not null default 'draft',
  score integer not null default 0,
  checklist jsonb not null default '[]'::jsonb,
  media jsonb not null default '[]'::jsonb,
  geotag jsonb not null default '{}'::jsonb,
  signature jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.revenue_ops_snapshots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  snapshot_date date not null default current_date,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (organization_id, snapshot_date)
);

create table if not exists public.partner_api_keys (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  token_hash text not null,
  scopes text[] not null default '{}',
  status text not null default 'active',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create table if not exists public.partner_api_events (
  id uuid primary key default gen_random_uuid(),
  api_key_id uuid references public.partner_api_keys(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.ai_concierge_sessions enable row level security;
alter table public.owner_portal_reports enable row level security;
alter table public.neighborhood_metrics enable row level security;
alter table public.developer_projects enable row level security;
alter table public.inspection_reports enable row level security;
alter table public.revenue_ops_snapshots enable row level security;
alter table public.partner_api_keys enable row level security;
alter table public.partner_api_events enable row level security;

grant select, insert, update, delete on public.ai_concierge_sessions to authenticated;
grant select on public.owner_portal_reports to authenticated;
grant select on public.neighborhood_metrics to anon, authenticated;
grant select, insert, update, delete on public.developer_projects to authenticated;
grant select, insert, update, delete on public.inspection_reports to authenticated;
grant select on public.revenue_ops_snapshots to authenticated;
grant select, insert, update, delete on public.partner_api_keys to authenticated;
grant select, insert on public.partner_api_events to authenticated;

create policy "Users manage own concierge sessions"
  on public.ai_concierge_sessions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Owners read own portal reports"
  on public.owner_portal_reports for select
  to authenticated
  using (owner_id = auth.uid());

create policy "Public reads neighborhood metrics"
  on public.neighborhood_metrics for select
  using (true);

create policy "Organization owners manage developer projects"
  on public.developer_projects for all
  to authenticated
  using (
    exists (
      select 1 from public.organizations
      where organizations.id = developer_projects.organization_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations
      where organizations.id = developer_projects.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "Inspectors manage own inspection reports"
  on public.inspection_reports for all
  to authenticated
  using (inspector_id = auth.uid())
  with check (inspector_id = auth.uid());

create policy "Organization owners read revenue snapshots"
  on public.revenue_ops_snapshots for select
  to authenticated
  using (
    exists (
      select 1 from public.organizations
      where organizations.id = revenue_ops_snapshots.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "Organization owners manage partner keys"
  on public.partner_api_keys for all
  to authenticated
  using (
    exists (
      select 1 from public.organizations
      where organizations.id = partner_api_keys.organization_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations
      where organizations.id = partner_api_keys.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "Organization owners read partner events"
  on public.partner_api_events for select
  to authenticated
  using (
    exists (
      select 1 from public.organizations
      where organizations.id = partner_api_events.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

create index if not exists ai_concierge_sessions_user_id_idx on public.ai_concierge_sessions(user_id);
create index if not exists neighborhood_metrics_lookup_idx on public.neighborhood_metrics(city, neighborhood);
create index if not exists developer_projects_org_idx on public.developer_projects(organization_id);
create index if not exists inspection_reports_inspector_idx on public.inspection_reports(inspector_id);
create index if not exists partner_api_events_org_idx on public.partner_api_events(organization_id, created_at desc);
