-- Phase 5 & 6: Payment records + smart property tables

create table if not exists public.payment_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null,
  amount numeric not null default 0,
  currency text not null default 'GHS',
  provider text not null default 'paystack',
  provider_ref text,
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.escrow_accounts (
  id text primary key,
  property text not null,
  buyer_id uuid references auth.users(id),
  amount numeric not null default 0,
  funded numeric not null default 0,
  status text not null default 'partial',
  provider text default 'paystack',
  created_at timestamptz not null default now()
);

create table if not exists public.smart_devices (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  location text,
  status text not null default 'offline',
  battery integer,
  last_seen timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.smart_automations (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  trigger_config text,
  action_config text,
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.smart_alerts (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'info',
  title text not null,
  device text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.payment_records enable row level security;
alter table public.smart_devices enable row level security;
alter table public.smart_automations enable row level security;
alter table public.smart_alerts enable row level security;

create policy "Users can read own payments"
  on public.payment_records for select using (auth.uid() = user_id);

create policy "Users can read own smart devices"
  on public.smart_devices for select using (auth.uid() = owner_id);

create policy "Users can read own automations"
  on public.smart_automations for select using (auth.uid() = owner_id);

create policy "Users can read own alerts"
  on public.smart_alerts for select using (auth.uid() = owner_id);
