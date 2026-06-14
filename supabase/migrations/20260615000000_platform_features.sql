-- Platform features: reviews, notifications, price alerts, referrals, listing extras

alter table public.listings add column if not exists virtual_tour_url text;
alter table public.listings add column if not exists instant_book boolean not null default false;
alter table public.listings add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.listings add column if not exists lat numeric;
alter table public.listings add column if not exists lng numeric;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id text not null references public.listings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating >= 1 and rating <= 5),
  body text,
  viewing_id uuid references public.viewing_requests(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.price_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null references public.listings(id) on delete cascade,
  target_price numeric,
  notify_on_drop boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  code text not null unique,
  uses integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_reviews_listing on public.reviews(listing_id);
create index if not exists idx_notifications_user on public.notifications(user_id, read);
create index if not exists idx_price_alerts_user on public.price_alerts(user_id);

alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.price_alerts enable row level security;
alter table public.referrals enable row level security;

drop policy if exists "Public read reviews" on public.reviews;
create policy "Public read reviews" on public.reviews for select using (true);

drop policy if exists "Users create own reviews" on public.reviews;
create policy "Users create own reviews" on public.reviews for insert with check (auth.uid() = user_id);

drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications" on public.notifications for select using (auth.uid() = user_id);

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);

drop policy if exists "Users read own price alerts" on public.price_alerts;
create policy "Users read own price alerts" on public.price_alerts for select using (auth.uid() = user_id);

drop policy if exists "Users manage own price alerts" on public.price_alerts;
create policy "Users manage own price alerts" on public.price_alerts for all using (auth.uid() = user_id);

drop policy if exists "Users read own referrals" on public.referrals;
create policy "Users read own referrals" on public.referrals for select using (auth.uid() = referrer_id);

drop policy if exists "Users create own referrals" on public.referrals;
create policy "Users create own referrals" on public.referrals for insert with check (auth.uid() = referrer_id);

-- Allow users to insert offers/transactions (may exist from earlier migration)
drop policy if exists "Users can update own offers" on public.offers;
create policy "Users can update own offers" on public.offers for update using (auth.uid() = user_id);

drop policy if exists "Users can update own transactions" on public.transactions;
create policy "Users can update own transactions" on public.transactions for update using (auth.uid() = user_id);

drop policy if exists "Users can create own transactions" on public.transactions;
create policy "Users can create own transactions" on public.transactions for insert with check (auth.uid() = user_id);

-- Realtime for notifications
alter publication supabase_realtime add table public.notifications;
