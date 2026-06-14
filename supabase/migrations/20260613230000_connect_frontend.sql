-- Connect frontend to Postgres: geo columns, saved homes, messaging, profile sync, full listing seed

alter table public.listings
  add column if not exists lat double precision,
  add column if not exists lng double precision;

create table if not exists public.saved_listings (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- enterprise_features creates conversations.id as text; messaging requires uuid
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'conversations'
      and column_name = 'id' and data_type = 'text'
  ) then
    drop table if exists public.messages;
    drop table if exists public.conversations cascade;
  end if;
end $$;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  participant_name text not null,
  listing_id text references public.listings(id) on delete set null,
  listing_title text,
  last_message text,
  unread integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.saved_listings enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

create policy "Users manage own saved listings"
  on public.saved_listings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read own conversations"
  on public.conversations for select using (auth.uid() = user_id);

create policy "Users create own conversations"
  on public.conversations for insert with check (auth.uid() = user_id);

create policy "Users read messages in own conversations"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users send messages in own conversations"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.user_id = auth.uid()
    )
  );

create policy "Users can upsert own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, display_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'buyer')
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, user_profiles.display_name),
    role = coalesce(excluded.role, user_profiles.role),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Full listing seed (all marketplace properties)
insert into public.listings (
  id, title, location, type, listing_type, price, price_label, rating,
  bedrooms, bathrooms, sqft, featured, verified, image, photos, host, description, amenities, lat, lng, status
) values
(
  'cantonments-sky-villa', 'Cantonments Sky Villa', 'Cantonments, Accra', 'apartment', 'rent',
  125000, 'GHS 125,000 / month', 4.98, 5, 4, 4200, true, true,
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80","https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Gold Coast Realty', 'Premium residence in Cantonments with concierge access and verified documentation.',
  '["Concierge","City view","Parking","24/7 security"]'::jsonb, 5.556, -0.182, 'active'
),
(
  'airport-residential-townhouse', 'Airport Residential Townhouse', 'Airport Residential, Accra', 'house', 'sale',
  6850000, 'GHS 6,850,000', 4.91, 4, 4, 3450, false, true,
  'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Anchorstone Properties', 'Secure townhouse near airport corridors with full ownership packet.',
  '["Private parking","Staff quarters","Garden"]'::jsonb, 5.605, -0.168, 'active'
),
(
  'east-legon-family-home', 'East Legon Family Home', 'East Legon, Accra', 'house', 'rent',
  58000, 'GHS 58,000 / month', 4.86, 4, 3, 3000, true, true,
  'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Miftah Homes', 'Family-ready East Legon home with strong security and backup utilities.',
  '["Family lounge","Security post","Solar backup"]'::jsonb, 5.635, -0.15, 'active'
),
(
  'osu-office-suite', 'Osu Arc Office Suite', 'Osu, Accra', 'office', 'lease',
  42000, 'GHS 42,000 / month', 4.79, 0, 2, 2150, false, true,
  'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Cedar Commercial', 'Central office suite with verified commercial lease terms.',
  '["Fiber ready","Reception","Parking"]'::jsonb, 5.555, -0.176, 'active'
),
(
  'labone-penthouse', 'Labone Penthouse', 'Labone, Accra', 'apartment', 'sale',
  4200000, 'GHS 4,200,000', 4.94, 3, 3, 2800, true, true,
  'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Prime Accra Estates', 'Top-floor penthouse with panoramic views and verified title.',
  '["Rooftop access","Smart locks","Elevator"]'::jsonb, 5.565, -0.175, 'active'
),
(
  'ridge-commercial-block', 'Ridge Commercial Block', 'Ridge, Accra', 'office', 'lease',
  95000, 'GHS 95,000 / month', 4.82, 0, 4, 4800, false, false,
  'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
  '["https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80"]'::jsonb,
  'Ridge Capital', 'Multi-floor commercial block for corporate HQ or institutional tenants.',
  '["Multiple floors","Backup power","Elevator"]'::jsonb, 5.57, -0.195, 'active'
)
on conflict (id) do update set
  title = excluded.title,
  location = excluded.location,
  price = excluded.price,
  price_label = excluded.price_label,
  featured = excluded.featured,
  verified = excluded.verified,
  lat = excluded.lat,
  lng = excluded.lng,
  photos = excluded.photos,
  amenities = excluded.amenities,
  updated_at = now();
