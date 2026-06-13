-- Production-complete schema: seeds, agent CRM, documents, compare, neighborhoods,
-- moderation, audit, commissions, intelligence zones, developer/enterprise extras,
-- storage buckets, expanded RLS

-- ─── Agent CRM ───────────────────────────────────────────────────────────────
create table if not exists public.agent_leads (
  id text primary key,
  agent_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  property text not null,
  stage text not null default 'lead',
  value numeric not null default 0,
  updated_label text,
  created_at timestamptz not null default now()
);

create table if not exists public.agent_calendar (
  id text primary key,
  agent_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  event_date date not null,
  event_time text,
  event_type text default 'viewing',
  created_at timestamptz not null default now()
);

create table if not exists public.agent_tasks (
  id text primary key,
  agent_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  due_date date,
  priority text default 'medium',
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.commission_settlements (
  id text primary key,
  agent_id uuid references auth.users(id) on delete set null,
  agent_name text not null,
  property text not null,
  amount numeric not null default 0,
  status text not null default 'pending',
  provider text default 'paystack',
  closed_date date,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- ─── Documents & compare ─────────────────────────────────────────────────────
create table if not exists public.user_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text default 'general',
  storage_path text,
  status text not null default 'uploaded',
  signed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.compare_listings (
  user_id uuid not null references auth.users(id) on delete cascade,
  listing_id text not null references public.listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create table if not exists public.lease_documents (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lease_id text references public.leases(id) on delete cascade,
  name text not null,
  status text not null default 'pending_signature',
  signed_at date,
  created_at timestamptz not null default now()
);

-- ─── Neighborhoods & market intelligence ───────────────────────────────────────
create table if not exists public.neighborhoods (
  id text primary key,
  name text not null,
  city text not null default 'Accra',
  summary text,
  median_price numeric,
  growth_pct text,
  lat double precision,
  lng double precision,
  highlights jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.market_zones (
  id text primary key,
  name text not null,
  lat double precision not null,
  lng double precision not null,
  median numeric not null default 0,
  change_pct text,
  volume integer default 0,
  region text default 'Greater Accra'
);

create table if not exists public.market_trends (
  id text primary key,
  period text not null,
  metric text not null,
  value numeric not null,
  region text default 'Greater Accra'
);

-- ─── Moderation & audit ────────────────────────────────────────────────────────
create table if not exists public.moderation_queue (
  id uuid primary key default gen_random_uuid(),
  listing_id text references public.listings(id) on delete cascade,
  submitter_id uuid references auth.users(id) on delete set null,
  status text not null default 'pending',
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  target text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ─── Agency team ───────────────────────────────────────────────────────────────
create table if not exists public.agency_team (
  id text primary key,
  agency_id text not null default 'gold-coast-realty',
  name text not null,
  role text not null,
  email text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

-- ─── Developer extras ──────────────────────────────────────────────────────────
create table if not exists public.developer_milestones (
  id text primary key,
  project_id text not null references public.developer_projects(id) on delete cascade,
  title text not null,
  status text not null default 'pending',
  due_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.developer_buyers (
  id text primary key,
  project_id text not null references public.developer_projects(id) on delete cascade,
  name text not null,
  unit text,
  status text not null default 'reserved',
  amount numeric default 0,
  created_at timestamptz not null default now()
);

-- ─── Enterprise extras ─────────────────────────────────────────────────────────
create table if not exists public.enterprise_portfolios (
  id text primary key,
  org_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  country text not null,
  assets integer default 0,
  aum numeric default 0,
  occupancy text,
  created_at timestamptz not null default now()
);

create table if not exists public.enterprise_esg (
  id text primary key,
  org_id uuid not null references auth.users(id) on delete cascade,
  metric text not null,
  value text not null,
  year integer default 2026
);

create table if not exists public.enterprise_forecasts (
  id text primary key,
  org_id uuid not null references auth.users(id) on delete cascade,
  year integer not null,
  revenue numeric not null default 0,
  noi numeric not null default 0
);

-- ─── PMS inspections ───────────────────────────────────────────────────────────
create table if not exists public.pms_inspections (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  unit text not null,
  inspector text,
  scheduled date,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

-- ─── Finance extras ────────────────────────────────────────────────────────────
create table if not exists public.mortgage_partners (
  id text primary key,
  name text not null,
  rate text not null,
  max_ltv text,
  regions text[] default '{}'
);

create table if not exists public.ai_modules (
  id text primary key,
  name text not null,
  status text not null default 'active',
  model text default 'gpt-4o-mini',
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

alter table public.listings add column if not exists submitted_by uuid references auth.users(id);

-- ─── RLS ───────────────────────────────────────────────────────────────────────
alter table public.agent_leads enable row level security;
alter table public.agent_calendar enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.user_documents enable row level security;
alter table public.compare_listings enable row level security;
alter table public.lease_documents enable row level security;
alter table public.developer_milestones enable row level security;
alter table public.developer_buyers enable row level security;
alter table public.enterprise_portfolios enable row level security;
alter table public.enterprise_esg enable row level security;
alter table public.enterprise_forecasts enable row level security;
alter table public.pms_inspections enable row level security;

create policy "Agents manage own leads" on public.agent_leads for all using (auth.uid() = agent_id) with check (auth.uid() = agent_id);
create policy "Agents manage own calendar" on public.agent_calendar for all using (auth.uid() = agent_id) with check (auth.uid() = agent_id);
create policy "Agents manage own tasks" on public.agent_tasks for all using (auth.uid() = agent_id) with check (auth.uid() = agent_id);
create policy "Users manage own documents" on public.user_documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own compare list" on public.compare_listings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users read own lease docs" on public.lease_documents for select using (auth.uid() = user_id);
create policy "Developers read own milestones" on public.developer_milestones for select using (
  exists (select 1 from public.developer_projects p where p.id = project_id and p.owner_id = auth.uid())
);
create policy "Developers read own buyers" on public.developer_buyers for select using (
  exists (select 1 from public.developer_projects p where p.id = project_id and p.owner_id = auth.uid())
);
create policy "Enterprise read own portfolios" on public.enterprise_portfolios for select using (auth.uid() = org_id);
create policy "Enterprise read own esg" on public.enterprise_esg for select using (auth.uid() = org_id);
create policy "Enterprise read own forecasts" on public.enterprise_forecasts for select using (auth.uid() = org_id);
create policy "Owners read own inspections" on public.pms_inspections for select using (auth.uid() = owner_id);

create policy "Anyone can read neighborhoods" on public.neighborhoods for select using (true);
create policy "Anyone can read market zones" on public.market_zones for select using (true);
create policy "Anyone can read market trends" on public.market_trends for select using (true);
create policy "Anyone can read mortgage partners" on public.mortgage_partners for select using (true);

create policy "Users can update own offers" on public.offers for update using (auth.uid() = user_id);
create policy "Users can insert own transactions" on public.transactions for insert with check (auth.uid() = user_id);

-- ─── Storage buckets ───────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listings', 'listings', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('documents', 'documents', false, 20971520, array['application/pdf','image/jpeg','image/png']),
  ('kyc', 'kyc', false, 20971520, array['application/pdf','image/jpeg','image/png'])
on conflict (id) do nothing;

create policy "Public read listing images" on storage.objects for select using (bucket_id = 'listings');
create policy "Auth users upload listing images" on storage.objects for insert with check (
  bucket_id = 'listings' and auth.role() = 'authenticated'
);
create policy "Users upload own documents" on storage.objects for insert with check (
  bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "Users read own documents" on storage.objects for select using (
  bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
);

-- ─── Global seeds ──────────────────────────────────────────────────────────────
insert into public.agency_branches (id, agency_id, name, location, manager, agents, listings, status) values
  ('b1', 'gold-coast-realty', 'Accra HQ', 'Cantonments, Accra', 'Ama Serwaa', 5, 14, 'active'),
  ('b2', 'gold-coast-realty', 'East Legon', 'East Legon, Accra', 'Kofi Mensah', 3, 8, 'active')
on conflict (id) do nothing;

insert into public.agency_payroll (id, agency_id, name, role, base, commission, status, period) values
  ('p1', 'gold-coast-realty', 'Kwame Osei', 'Senior Agent', 4500, 12400, 'paid', 'May 2026'),
  ('p2', 'gold-coast-realty', 'Efua Mensah', 'Agent', 3800, 8200, 'pending', 'May 2026')
on conflict (id) do nothing;

insert into public.agency_team (id, agency_id, name, role, email, status) values
  ('t1', 'gold-coast-realty', 'Ama Serwaa', 'Managing Director', 'ama@goldcoast.realty', 'active'),
  ('t2', 'gold-coast-realty', 'Kwame Osei', 'Senior Agent', 'kwame@goldcoast.realty', 'active'),
  ('t3', 'gold-coast-realty', 'Efua Mensah', 'Agent', 'efua@goldcoast.realty', 'active')
on conflict (id) do nothing;

insert into public.escrow_accounts (id, property, amount, funded, status, provider) values
  ('e1', 'Labone Penthouse', 4200000, 2100000, 'partial', 'paystack')
on conflict (id) do nothing;

insert into public.commission_settlements (id, agent_name, property, amount, status, provider) values
  ('cs1', 'Kwame Osei', 'Osu Office Suite', 8400, 'paid', 'paystack'),
  ('cs2', 'Efua Mensah', 'Labone Penthouse', 62000, 'pending', 'stripe')
on conflict (id) do nothing;

insert into public.kyc_records (id, entity_name, entity_type, status, documents) values
  ('kyc1', 'Daniel K.', 'buyer', 'pending_review', 2),
  ('kyc2', 'Gold Coast Realty', 'agency', 'verified', 5),
  ('kyc3', 'Anchorstone Properties', 'agency', 'pending_review', 3)
on conflict (id) do nothing;

insert into public.fraud_alerts (id, target, alert_type, risk_score, status) values
  ('f1', 'listing:ridge-commercial-block', 'duplicate_photos', 72, 'investigating'),
  ('f2', 'user:unknown-seller', 'price_anomaly', 85, 'investigating'),
  ('f3', 'agency:new-listing-co', 'unverified_docs', 45, 'resolved')
on conflict (id) do nothing;

insert into public.neighborhoods (id, name, city, summary, median_price, growth_pct, lat, lng, highlights) values
  ('cantonments', 'Cantonments', 'Accra', 'Diplomatic quarter with premium apartments and strong security.', 3200000, '+8.1%', 5.556, -0.182, '["Embassies","Premium rentals","Top schools"]'::jsonb),
  ('east-legon', 'East Legon', 'Accra', 'Family-friendly suburb with strong rental demand.', 1850000, '+7.4%', 5.635, -0.15, '["Shopping malls","International schools","Gated communities"]'::jsonb),
  ('airport-residential', 'Airport Residential', 'Accra', 'Executive homes near Kotoka International Airport.', 4100000, '+6.8%', 5.605, -0.168, '["Airport access","Corporate tenants","High security"]'::jsonb),
  ('labone', 'Labone', 'Accra', 'Central location mixing residential and lifestyle amenities.', 2800000, '+7.9%', 5.565, -0.175, '["Nightlife","Walkability","Mixed-use"]'::jsonb)
on conflict (id) do nothing;

insert into public.market_zones (id, name, lat, lng, median, change_pct, volume) values
  ('z1', 'Cantonments', 5.556, -0.182, 3200000, '+8.1%', 142),
  ('z2', 'East Legon', 5.635, -0.15, 1850000, '+7.4%', 218),
  ('z3', 'Airport Residential', 5.605, -0.168, 4100000, '+6.8%', 96),
  ('z4', 'Osu', 5.555, -0.176, 980000, '+9.2%', 164),
  ('z5', 'Ridge', 5.57, -0.195, 2400000, '+5.9%', 88)
on conflict (id) do nothing;

insert into public.market_trends (id, period, metric, value, region) values
  ('t1', '2026-Q1', 'median_price', 2850000, 'Greater Accra'),
  ('t2', '2026-Q2', 'median_price', 3050000, 'Greater Accra'),
  ('t3', '2026-Q1', 'transaction_volume', 1842, 'Greater Accra'),
  ('t4', '2026-Q2', 'transaction_volume', 2105, 'Greater Accra')
on conflict (id) do nothing;

insert into public.mortgage_partners (id, name, rate, max_ltv, regions) values
  ('mp1', 'GCB Bank', '22.5% p.a.', '80%', array['Greater Accra','Ashanti']),
  ('mp2', 'Ecobank Ghana', '21.9% p.a.', '75%', array['Greater Accra','Western']),
  ('mp3', 'Stanbic Bank', '23.1% p.a.', '85%', array['Greater Accra','Northern'])
on conflict (id) do nothing;

insert into public.ai_modules (id, name, status, model, description) values
  ('ai_search', 'Property search AI', 'active', 'gpt-4o-mini', 'Natural language listing search'),
  ('listing_coach', 'Listing coach', 'active', 'gpt-4o-mini', 'Listing quality scoring and tips'),
  ('buyer_advisor', 'Buyer advisor', 'active', 'gpt-4o-mini', 'Purchase guidance and negotiation'),
  ('valuation', 'Valuation engine', 'active', 'gpt-4o-mini', 'AI property valuations'),
  ('fraud_detection', 'Fraud detection', 'active', 'gpt-4o-mini', 'Risk scoring for listings and users')
on conflict (id) do nothing;

-- Realtime (ignore if already added)
do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.smart_alerts;
exception when duplicate_object then null;
end $$;
