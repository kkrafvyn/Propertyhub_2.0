-- Enterprise ops: units, quotes, push, comms, IoT, DocuSign, fraud rules

create table if not exists public.developer_units (
  id text primary key,
  project_id text not null references public.developer_projects(id) on delete cascade,
  unit_number text not null,
  floor integer,
  bedrooms integer default 0,
  sqft integer,
  price numeric not null default 0,
  status text not null default 'available',
  buyer_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.insurance_quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  property_value numeric,
  coverage_type text,
  premium_estimate numeric,
  status text not null default 'pending',
  partner_response jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null,
  platform text not null default 'web',
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

create table if not exists public.lead_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null,
  agent_id uuid not null references auth.users(id) on delete cascade,
  channel text not null check (channel in ('sms', 'whatsapp', 'email')),
  body text not null,
  phone text,
  status text not null default 'queued',
  created_at timestamptz not null default now()
);

create table if not exists public.iot_webhook_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete set null,
  device_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.lease_envelopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  document_id text not null,
  envelope_id text,
  signing_url text,
  status text not null default 'created',
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.fraud_rules (
  id text primary key,
  name text not null,
  rule_type text not null,
  threshold numeric not null default 0,
  enabled boolean not null default true,
  description text
);

alter table public.agent_leads add column if not exists phone text;
alter table public.agent_leads add column if not exists email text;

alter table public.developer_units enable row level security;
alter table public.insurance_quotes enable row level security;
alter table public.push_tokens enable row level security;
alter table public.lead_messages enable row level security;
alter table public.iot_webhook_events enable row level security;
alter table public.lease_envelopes enable row level security;
alter table public.fraud_rules enable row level security;

drop policy if exists "Developers read own units" on public.developer_units;
create policy "Developers read own units" on public.developer_units for select using (
  exists (select 1 from public.developer_projects p where p.id = project_id and p.owner_id = auth.uid())
);

drop policy if exists "Developers manage own units" on public.developer_units;
create policy "Developers manage own units" on public.developer_units for all using (
  exists (select 1 from public.developer_projects p where p.id = project_id and p.owner_id = auth.uid())
);

drop policy if exists "Users read own insurance quotes" on public.insurance_quotes;
create policy "Users read own insurance quotes" on public.insurance_quotes for select using (auth.uid() = user_id);

drop policy if exists "Users create own insurance quotes" on public.insurance_quotes;
create policy "Users create own insurance quotes" on public.insurance_quotes for insert with check (auth.uid() = user_id);

drop policy if exists "Users manage own push tokens" on public.push_tokens;
create policy "Users manage own push tokens" on public.push_tokens for all using (auth.uid() = user_id);

drop policy if exists "Agents manage own lead messages" on public.lead_messages;
create policy "Agents manage own lead messages" on public.lead_messages for all using (auth.uid() = agent_id);

drop policy if exists "Owners read own iot events" on public.iot_webhook_events;
create policy "Owners read own iot events" on public.iot_webhook_events for select using (auth.uid() = owner_id);

drop policy if exists "Users read own lease envelopes" on public.lease_envelopes;
create policy "Users read own lease envelopes" on public.lease_envelopes for select using (auth.uid() = user_id);

drop policy if exists "Users create own lease envelopes" on public.lease_envelopes;
create policy "Users create own lease envelopes" on public.lease_envelopes for insert with check (auth.uid() = user_id);

drop policy if exists "Admins read fraud rules" on public.fraud_rules;
create policy "Admins read fraud rules" on public.fraud_rules for select using (true);

insert into public.fraud_rules (id, name, rule_type, threshold, description) values
  ('velocity_listings', 'Listing velocity', 'listings_per_day', 5, 'Flag users posting more than N listings per day'),
  ('price_anomaly', 'Price anomaly', 'price_deviation_pct', 40, 'Flag listings priced far below neighborhood median'),
  ('duplicate_phone', 'Duplicate contact', 'duplicate_phone', 1, 'Flag leads sharing the same phone across agents')
on conflict (id) do nothing;

insert into public.developer_units (id, project_id, unit_number, floor, bedrooms, sqft, price, status) values
  ('u-a101', 'proj-legon-heights', 'A-101', 1, 2, 950, 850000, 'available'),
  ('u-a102', 'proj-legon-heights', 'A-102', 1, 3, 1200, 1100000, 'reserved'),
  ('u-b201', 'proj-legon-heights', 'B-201', 2, 2, 980, 920000, 'sold')
on conflict (id) do nothing;
