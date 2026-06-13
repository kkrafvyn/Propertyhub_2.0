-- Offers and transactions for buyer workspace
-- Seed featured listings for marketplace

create table if not exists public.offers (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  property text not null,
  amount numeric not null default 0,
  counter_amount numeric,
  status text not null default 'pending',
  notes text,
  updated text,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  property text not null,
  stage text not null default 'viewing',
  offer text,
  counter text,
  closing_date date,
  checklist jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.offers enable row level security;
alter table public.transactions enable row level security;

create policy "Users can read own offers"
  on public.offers for select
  using (auth.uid() = user_id);

create policy "Users can create own offers"
  on public.offers for insert
  with check (auth.uid() = user_id);

create policy "Users can read own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

-- Seed listings (upsert)
insert into public.listings (
  id, title, location, type, listing_type, price, price_label, rating,
  bedrooms, bathrooms, sqft, featured, verified, image, photos, host, description, amenities, status
) values
(
  'cantonments-sky-villa',
  'Cantonments Sky Villa',
  'Cantonments, Accra',
  'apartment',
  'rent',
  125000,
  'GHS 125,000 / month',
  4.98,
  5, 4, 4200,
  true, true,
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Gold Coast Realty',
  'Premium residence in Cantonments with concierge access and verified documentation.',
  '["Concierge","City view","Parking","24/7 security"]'::jsonb,
  'active'
),
(
  'east-legon-family-home',
  'East Legon Family Home',
  'East Legon, Accra',
  'house',
  'rent',
  58000,
  'GHS 58,000 / month',
  4.86,
  4, 3, 3000,
  true, true,
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Miftah Homes',
  'Family-ready East Legon home with strong security and backup utilities.',
  '["Family lounge","Security post","Solar backup"]'::jsonb,
  'active'
),
(
  'labone-penthouse',
  'Labone Penthouse',
  'Labone, Accra',
  'apartment',
  'sale',
  4200000,
  'GHS 4,200,000',
  4.94,
  4, 4, 3800,
  true, true,
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Anchorstone Properties',
  'Luxury penthouse with panoramic views and verified title documents.',
  '["Rooftop terrace","Smart home","Parking"]'::jsonb,
  'active'
)
on conflict (id) do update set
  featured = excluded.featured,
  updated_at = now();
