-- Phase A: Transaction engine, escrow milestones, wallet holds
-- Phase B: Rental applications, vendors, maintenance linkage

-- Offers
alter table public.offers add column if not exists listing_id text;
alter table public.offers add column if not exists transaction_id text;
alter table public.offers add column if not exists counter_notes text;

drop policy if exists "Users can update own offers" on public.offers;
drop policy if exists "Users can update own offers" on public.offers;
create policy "Users can update own offers"
  on public.offers for update using (auth.uid() = user_id);

-- Transactions
alter table public.transactions add column if not exists offer_id text;
alter table public.transactions add column if not exists listing_id text;
alter table public.transactions add column if not exists escrow_id text;
alter table public.transactions add column if not exists agent_id uuid;
alter table public.transactions add column if not exists commission_settled boolean not null default false;

drop policy if exists "Users can update own transactions" on public.transactions;
drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions"
  on public.transactions for update using (auth.uid() = user_id);

-- Escrow
alter table public.escrow_accounts add column if not exists transaction_id text;
alter table public.escrow_accounts add column if not exists listing_id text;

create table if not exists public.escrow_milestones (
  id text primary key,
  escrow_id text not null references public.escrow_accounts(id) on delete cascade,
  label text not null,
  amount numeric not null default 0,
  status text not null default 'pending',
  sort_order integer not null default 0,
  released_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.escrow_milestones enable row level security;

drop policy if exists "Buyers read own escrow milestones" on public.escrow_milestones;
create policy "Buyers read own escrow milestones"
  on public.escrow_milestones for select
  using (
    exists (
      select 1 from public.escrow_accounts e
      where e.id = escrow_milestones.escrow_id and e.buyer_id = auth.uid()
    )
  );

create table if not exists public.transaction_events (
  id text primary key,
  transaction_id text not null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid,
  created_at timestamptz not null default now()
);

alter table public.transaction_events enable row level security;

drop policy if exists "Users read own transaction events" on public.transaction_events;
create policy "Users read own transaction events"
  on public.transaction_events for select
  using (
    exists (
      select 1 from public.transactions t
      where t.id = transaction_events.transaction_id and t.user_id = auth.uid()
    )
  );

-- Reservations payment
alter table public.reservations add column if not exists payment_id text;
alter table public.reservations add column if not exists paid_at timestamptz;

-- Maintenance → work order link
alter table public.maintenance_requests add column if not exists work_order_id text;
alter table public.maintenance_requests add column if not exists listing_id text;
alter table public.maintenance_requests add column if not exists unit text;

-- Vendors
create table if not exists public.vendors (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  trade text not null default 'general',
  phone text,
  email text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.vendors enable row level security;

drop policy if exists "Owners manage own vendors" on public.vendors;
create policy "Owners manage own vendors"
  on public.vendors for all using (auth.uid() = owner_id);

alter table public.work_orders add column if not exists maintenance_request_id text;
alter table public.work_orders add column if not exists vendor_id text;

-- Rental applications (Phase B)
create table if not exists public.rental_applications (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null,
  property text not null,
  landlord_id uuid,
  status text not null default 'submitted',
  move_in_date date,
  income numeric,
  occupants integer default 1,
  notes text,
  lease_id text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.rental_applications enable row level security;

drop policy if exists "Users read own rental applications" on public.rental_applications;
create policy "Users read own rental applications"
  on public.rental_applications for select using (auth.uid() = user_id);

drop policy if exists "Users create own rental applications" on public.rental_applications;
create policy "Users create own rental applications"
  on public.rental_applications for insert with check (auth.uid() = user_id);

drop policy if exists "Landlords read applications for their listings" on public.rental_applications;
create policy "Landlords read applications for their listings"
  on public.rental_applications for select
  using (
    auth.uid() = landlord_id
    or exists (
      select 1 from public.listings l
      where l.id = rental_applications.listing_id
        and (l.submitted_by = auth.uid() or l.owner_id = auth.uid())
    )
  );

-- Reviews: link to reservation/viewing
alter table public.reviews add column if not exists reservation_id text;
alter table public.reviews add column if not exists eligible_type text;

-- Payout accounts RLS
drop policy if exists "Users manage own payout accounts" on public.payout_accounts;
drop policy if exists "Users manage own payout accounts" on public.payout_accounts;
create policy "Users manage own payout accounts"
  on public.payout_accounts for all using (auth.uid() = user_id);

alter table public.commission_settlements add column if not exists transaction_id text;
