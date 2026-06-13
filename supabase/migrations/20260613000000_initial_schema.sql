-- Core tables for BaytMiftah Edge Functions

create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  role text not null default 'buyer',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id text primary key,
  title text not null,
  location text not null,
  type text not null default 'apartment',
  listing_type text not null default 'rent',
  price numeric not null default 0,
  price_label text,
  rating numeric default 0,
  bedrooms integer default 0,
  bathrooms integer default 0,
  sqft integer,
  featured boolean not null default false,
  verified boolean not null default false,
  image text,
  photos jsonb not null default '[]'::jsonb,
  host text,
  description text,
  amenities jsonb not null default '[]'::jsonb,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.viewing_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references public.listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  preferred_date date,
  guests integer not null default 1,
  notes text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.user_profiles enable row level security;
alter table public.listings enable row level security;
alter table public.viewing_requests enable row level security;

create policy "Public can read active listings"
  on public.listings for select
  using (status = 'active');

create policy "Users can read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can read own viewing requests"
  on public.viewing_requests for select
  using (auth.uid() = user_id);

create policy "Users can create viewing requests"
  on public.viewing_requests for insert
  with check (auth.uid() = user_id);
