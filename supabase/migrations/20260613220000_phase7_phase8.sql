-- Phase 7 & 8: Intelligence, developer, enterprise, trust tables

create table if not exists public.valuations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  address text not null,
  estimated numeric not null,
  confidence integer default 0,
  currency text not null default 'GHS',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.developer_projects (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  location text,
  units integer default 0,
  sold integer default 0,
  status text not null default 'pre_sale',
  progress integer default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.kyc_records (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  entity_name text not null,
  entity_type text not null default 'buyer',
  status text not null default 'pending_review',
  documents integer default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.fraud_alerts (
  id text primary key,
  target text not null,
  alert_type text not null,
  risk_score integer not null default 0,
  status text not null default 'investigating',
  created_at timestamptz not null default now()
);

alter table public.valuations enable row level security;
alter table public.developer_projects enable row level security;
alter table public.kyc_records enable row level security;

create policy "Users can read own valuations"
  on public.valuations for select using (auth.uid() = user_id);

create policy "Developers can read own projects"
  on public.developer_projects for select using (auth.uid() = owner_id);
