-- Insurance products, viewing slots, agency leads seed

create table if not exists public.insurance_products (
  id text primary key,
  name text not null,
  provider text not null,
  premium text not null,
  coverage text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.viewing_slots (
  id text primary key,
  listing_id text not null references public.listings(id) on delete cascade,
  slot_date date not null,
  slot_time text not null,
  capacity integer not null default 1,
  booked integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.insurance_products enable row level security;
alter table public.viewing_slots enable row level security;

create policy "Anyone can read insurance products"
  on public.insurance_products for select using (true);

create policy "Anyone can read viewing slots"
  on public.viewing_slots for select using (true);

insert into public.insurance_products (id, name, provider, premium, coverage) values
  ('i1', 'Homeowners cover', 'SIC Insurance', 'From GHS 1,200/yr', 'Fire, theft, liability'),
  ('i2', 'Landlord protection', 'Enterprise Insurance', 'From GHS 2,400/yr', 'Rent default, damage'),
  ('i3', 'Tenant contents', 'BaytMiftah Shield', 'From GHS 480/yr', 'Personal property')
on conflict (id) do nothing;

insert into public.viewing_slots (id, listing_id, slot_date, slot_time, capacity, booked) values
  ('vs1', 'cantonments-sky-villa', '2026-06-15', '10:00', 2, 0),
  ('vs2', 'cantonments-sky-villa', '2026-06-15', '14:00', 2, 1),
  ('vs3', 'cantonments-sky-villa', '2026-06-16', '11:00', 2, 0),
  ('vs4', 'east-legon-family-home', '2026-06-17', '10:00', 3, 0),
  ('vs5', 'labone-penthouse', '2026-06-18', '15:00', 1, 0)
on conflict (id) do nothing;

-- Allow authenticated users to insert listings (list property flow)
create policy "Authenticated users can create listings"
  on public.listings for insert
  with check (auth.uid() = submitted_by);

create policy "Submitters can read own listings"
  on public.listings for select
  using (auth.uid() = submitted_by or status = 'active');
