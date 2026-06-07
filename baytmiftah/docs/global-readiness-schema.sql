-- Property Hub global readiness schema starter.
-- Run after the core Supabase schema when preparing worldwide launch.

create table if not exists public.countries (
  code text primary key,
  name text not null,
  default_currency text not null,
  default_locale text not null,
  default_measurement_system text not null default 'metric',
  default_data_region text not null default 'global',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.country_rule_profiles (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries(code) on delete cascade,
  profile_name text not null,
  privacy_regime text not null default 'baseline',
  foreign_ownership_rules jsonb not null default '{}'::jsonb,
  tax_rules jsonb not null default '{}'::jsonb,
  payment_rules jsonb not null default '{}'::jsonb,
  legal_rules jsonb not null default '{}'::jsonb,
  localization_rules jsonb not null default '{}'::jsonb,
  data_residency_rules jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.country_document_requirements (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries(code) on delete cascade,
  workflow text not null,
  document_type text not null,
  required_for_roles text[] not null default '{}',
  required boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.compliance_checks (
  id uuid primary key default gen_random_uuid(),
  country_code text references public.countries(code) on delete set null,
  subject_type text not null,
  subject_id uuid,
  user_id uuid,
  status text not null default 'pending',
  failures jsonb not null default '[]'::jsonb,
  warnings jsonb not null default '[]'::jsonb,
  checked_at timestamptz not null default now(),
  constraint compliance_checks_status_check check (status in ('pending', 'passed', 'failed', 'warning'))
);

create table if not exists public.compliance_audit_events (
  id uuid primary key default gen_random_uuid(),
  country_code text references public.countries(code) on delete set null,
  actor_id uuid,
  event_type text not null,
  subject_type text not null,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  country_code text references public.countries(code) on delete set null,
  purpose text not null,
  granted boolean not null,
  source text not null default 'app',
  granted_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.data_privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  country_code text references public.countries(code) on delete set null,
  request_type text not null,
  status text not null default 'submitted',
  due_at timestamptz,
  fulfilled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint data_privacy_requests_type_check check (request_type in ('export', 'delete', 'rectify', 'consent_review')),
  constraint data_privacy_requests_status_check check (status in ('submitted', 'reviewing', 'fulfilled', 'rejected'))
);

create table if not exists public.payment_provider_country_rules (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries(code) on delete cascade,
  provider text not null,
  payment_methods text[] not null default '{}',
  currencies text[] not null default '{}',
  supports_escrow boolean not null default false,
  active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.legal_templates (
  id uuid primary key default gen_random_uuid(),
  country_code text not null references public.countries(code) on delete cascade,
  workflow text not null,
  template_name text not null,
  language text not null default 'en',
  version text not null default '1.0',
  content text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.locale_profiles (
  country_code text primary key references public.countries(code) on delete cascade,
  language text not null,
  direction text not null default 'ltr',
  measurement_system text not null default 'metric',
  terms jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint locale_profiles_direction_check check (direction in ('ltr', 'rtl'))
);

alter table public.countries enable row level security;
alter table public.country_rule_profiles enable row level security;
alter table public.country_document_requirements enable row level security;
alter table public.compliance_checks enable row level security;
alter table public.compliance_audit_events enable row level security;
alter table public.user_consents enable row level security;
alter table public.data_privacy_requests enable row level security;
alter table public.payment_provider_country_rules enable row level security;
alter table public.legal_templates enable row level security;
alter table public.locale_profiles enable row level security;

create policy "country metadata is public"
  on public.countries for select
  using (active = true);

create policy "active country rules are readable"
  on public.country_rule_profiles for select
  using (active = true);

create policy "document requirements are readable"
  on public.country_document_requirements for select
  using (true);

create policy "payment provider rules are readable"
  on public.payment_provider_country_rules for select
  using (active = true);

create policy "locale profiles are readable"
  on public.locale_profiles for select
  using (true);

create policy "users can read their own consents"
  on public.user_consents for select
  using (user_id = auth.uid());

create policy "users can create their own consents"
  on public.user_consents for insert
  with check (user_id = auth.uid());

create policy "users can manage their privacy requests"
  on public.data_privacy_requests for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists country_rule_profiles_country_idx on public.country_rule_profiles(country_code);
create index if not exists country_document_requirements_country_workflow_idx on public.country_document_requirements(country_code, workflow);
create index if not exists compliance_checks_subject_idx on public.compliance_checks(subject_type, subject_id);
create index if not exists compliance_audit_events_subject_idx on public.compliance_audit_events(subject_type, subject_id);
create index if not exists user_consents_user_purpose_idx on public.user_consents(user_id, purpose);
create index if not exists data_privacy_requests_user_idx on public.data_privacy_requests(user_id);

insert into public.countries (code, name, default_currency, default_locale, default_measurement_system, default_data_region)
values
  ('GH', 'Ghana', 'GHS', 'en-GH', 'metric', 'africa'),
  ('NG', 'Nigeria', 'NGN', 'en-NG', 'metric', 'africa'),
  ('ZA', 'South Africa', 'ZAR', 'en-ZA', 'metric', 'africa'),
  ('GB', 'United Kingdom', 'GBP', 'en-GB', 'metric', 'eu'),
  ('US', 'United States', 'USD', 'en-US', 'imperial', 'us'),
  ('AE', 'United Arab Emirates', 'AED', 'en-AE', 'metric', 'asia')
on conflict (code) do nothing;

insert into public.locale_profiles (country_code, language, direction, measurement_system, terms)
values
  ('GH', 'en-GH', 'ltr', 'metric', '{"land_document": "Land title"}'::jsonb),
  ('GB', 'en-GB', 'ltr', 'metric', '{"energy_certificate": "EPC certificate", "local_tax": "Council tax"}'::jsonb),
  ('US', 'en-US', 'ltr', 'imperial', '{"local_fee": "HOA fees", "listing_network": "MLS"}'::jsonb),
  ('AE', 'en-AE', 'ltr', 'metric', '{"local_fee": "Service charges", "ownership_zone": "Freehold zone"}'::jsonb)
on conflict (country_code) do update set
  language = excluded.language,
  direction = excluded.direction,
  measurement_system = excluded.measurement_system,
  terms = excluded.terms;
