-- Reputation factors, AI lead scoring, services marketplace

alter table public.agent_leads
  add column if not exists lead_score int,
  add column if not exists score_factors jsonb default '{}'::jsonb,
  add column if not exists scored_at timestamptz;

create table if not exists public.marketplace_services (
  id text primary key,
  name text not null,
  category text not null,
  provider text not null,
  price_label text not null,
  rating numeric(3,2) default 4.5,
  verified boolean default false,
  active boolean default true,
  description text,
  created_at timestamptz default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  service_id text references public.marketplace_services(id) on delete set null,
  message text,
  status text default 'open' check (status in ('open', 'assigned', 'completed', 'cancelled')),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.directory_profiles (
  id text primary key,
  profile_type text not null check (profile_type in ('agency', 'agent')),
  name text not null,
  location text,
  bio text,
  agency_id text,
  agency_name text,
  verified boolean default false,
  specialties jsonb default '[]'::jsonb,
  active_listings int default 0,
  deals_closed int default 0,
  rating numeric(3,2),
  phone text,
  user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

create index if not exists idx_service_requests_user on public.service_requests(user_id);
create index if not exists idx_directory_profiles_type on public.directory_profiles(profile_type);

alter table public.marketplace_services enable row level security;
alter table public.service_requests enable row level security;
alter table public.directory_profiles enable row level security;

drop policy if exists "Public read marketplace services" on public.marketplace_services;
create policy "Public read marketplace services"
  on public.marketplace_services for select using (active = true);

drop policy if exists "Users read own service requests" on public.service_requests;
create policy "Users read own service requests"
  on public.service_requests for select using (auth.uid() = user_id);

drop policy if exists "Users create service requests" on public.service_requests;
create policy "Users create service requests"
  on public.service_requests for insert with check (auth.uid() = user_id);

drop policy if exists "Public read directory profiles" on public.directory_profiles;
create policy "Public read directory profiles"
  on public.directory_profiles for select using (true);

insert into public.marketplace_services (id, name, category, provider, price_label, rating, verified, description)
values
  ('legal', 'Property legal review', 'Legal', 'Gold Coast Legal', 'From GHS 800', 4.9, true, 'Title search and purchase agreement review.'),
  ('valuation', 'Certified valuation', 'Valuation', 'BaytMiftah Intelligence', 'From GHS 450', 4.8, true, 'RICS-aligned residential valuation report.'),
  ('moving', 'Moving & relocation', 'Logistics', 'Accra Movers Co.', 'From GHS 1,200', 4.6, true, 'Local and inter-city moves with insurance.'),
  ('staging', 'Home staging', 'Marketing', 'StageRight GH', 'From GHS 2,500', 4.7, false, 'Furnish and style listings for faster closes.'),
  ('inspection', 'Pre-purchase inspection', 'Inspection', 'BuildCheck Ghana', 'From GHS 600', 4.8, true, 'Structural and systems inspection before offer.'),
  ('mortgage', 'Mortgage pre-qualification', 'Finance', 'Partner banks', 'Free', 4.5, true, 'Pre-qual letter from partner lenders.')
on conflict (id) do nothing;

insert into public.directory_profiles (id, profile_type, name, location, bio, verified, specialties, active_listings, rating, user_id)
values
  ('agency-gold-coast', 'agency', 'Gold Coast Realty', 'Cantonments, Accra',
   'Full-service agency serving Accra and Kumasi with verified listings and in-house legal support.',
   true, '["Luxury","Commercial","Rentals"]'::jsonb, 24, 4.8, null),
  ('agency-east-legon', 'agency', 'East Legon Properties', 'East Legon, Accra',
   'Neighborhood specialists for East Legon, Airport Residential, and Labone.',
   true, '["Family homes","Rentals"]'::jsonb, 16, 4.6, null)
on conflict (id) do nothing;

insert into public.directory_profiles (id, profile_type, name, agency_id, agency_name, bio, verified, specialties, deals_closed, rating, phone)
values
  ('agent-kwame', 'agent', 'Kwame Osei', 'agency-gold-coast', 'Gold Coast Realty',
   'Senior agent with 8+ years in Accra luxury residential.', true, '["Sales","Luxury"]'::jsonb, 42, 4.9, '0555123456'),
  ('agent-efua', 'agent', 'Efua Mensah', 'agency-gold-coast', 'Gold Coast Realty',
   'Focused on corporate leases and executive rentals.', true, '["Rentals","Commercial"]'::jsonb, 28, 4.7, '0244987654')
on conflict (id) do nothing;
