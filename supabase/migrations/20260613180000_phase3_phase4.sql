-- Phase 3 & 4: Agency ERP, Renter, PMS tables

create table if not exists public.agency_branches (
  id text primary key,
  agency_id text not null,
  name text not null,
  location text not null,
  manager text,
  agents integer default 0,
  listings integer default 0,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists public.agency_payroll (
  id text primary key,
  agency_id text not null,
  name text not null,
  role text not null,
  base numeric not null default 0,
  commission numeric not null default 0,
  status text not null default 'pending',
  period text,
  created_at timestamptz not null default now()
);

create table if not exists public.leases (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  property text not null,
  landlord text,
  start_date date,
  end_date date,
  rent numeric not null default 0,
  status text not null default 'active',
  signed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.rent_payments (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lease_id text references public.leases(id) on delete set null,
  period text not null,
  amount numeric not null default 0,
  due_date date,
  status text not null default 'due',
  method text,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_requests (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  category text,
  priority text default 'medium',
  status text not null default 'open',
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.pms_tenants (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  unit text not null,
  rent numeric not null default 0,
  lease_end date,
  status text not null default 'current',
  balance numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.work_orders (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  unit text not null,
  issue text not null,
  vendor text,
  priority text default 'medium',
  status text not null default 'open',
  cost numeric default 0,
  created_at timestamptz not null default now()
);

alter table public.agency_branches enable row level security;
alter table public.leases enable row level security;
alter table public.rent_payments enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.pms_tenants enable row level security;
alter table public.work_orders enable row level security;

create policy "Users can read own leases"
  on public.leases for select using (auth.uid() = user_id);

create policy "Users can read own rent payments"
  on public.rent_payments for select using (auth.uid() = user_id);

create policy "Users can read own maintenance requests"
  on public.maintenance_requests for select using (auth.uid() = user_id);

create policy "Users can create maintenance requests"
  on public.maintenance_requests for insert with check (auth.uid() = user_id);

create policy "Owners can read own tenants"
  on public.pms_tenants for select using (auth.uid() = owner_id);

create policy "Owners can read own work orders"
  on public.work_orders for select using (auth.uid() = owner_id);
