alter table public.listings
  add column if not exists lat double precision,
  add column if not exists lng double precision;

create table if not exists public.conversations (
  id text primary key,
  participant text not null,
  listing_title text,
  last_message text,
  unread integer not null default 0,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null,
  property text,
  status text not null default 'draft',
  updated_at timestamptz not null default now()
);

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  license text,
  verification_status text not null default 'pending',
  trust_score integer default 0,
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
alter table public.documents enable row level security;

create policy "Users read own conversations"
  on public.conversations for select
  using (auth.uid() = user_id);

create policy "Users read own documents"
  on public.documents for select
  using (auth.uid() = user_id);

create policy "Users insert own documents"
  on public.documents for insert
  with check (auth.uid() = user_id);
