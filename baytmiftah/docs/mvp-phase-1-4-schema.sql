-- Property Hub MVP phase 1-4 schema
-- Covers: Ghana compliance baseline, trust/fraud, agency CRM depth, monetization.
-- Apply after supabase-required-schema.sql and global-readiness-schema.sql.

create table if not exists public.listing_compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  property_id uuid references public.properties(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete cascade,
  country_code text not null default 'GH',
  status text not null default 'needs_review'
    check (status in ('draft', 'needs_review', 'blocked', 'approved')),
  score integer not null default 0 check (score between 0 and 100),
  required_documents text[] not null default '{}',
  missing_documents text[] not null default '{}',
  risk_flags text[] not null default '{}',
  reviewer_notes text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trust_scores (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('user', 'organization', 'listing', 'property')),
  subject_id uuid not null,
  score integer not null default 50 check (score between 0 and 100),
  tier text not null default 'standard' check (tier in ('low', 'standard', 'trusted', 'verified')),
  factors jsonb not null default '[]'::jsonb,
  calculated_by text not null default 'edge_function',
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (subject_type, subject_id)
);

create table if not exists public.fraud_signals (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('user', 'organization', 'listing', 'property', 'lead')),
  subject_id uuid not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  signal_type text not null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'reviewing', 'dismissed', 'confirmed', 'resolved')),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  slug text not null,
  sort_order integer not null default 0,
  probability integer not null default 0 check (probability between 0 and 100),
  color text not null default '#007a52',
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, slug)
);

create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  activity_type text not null default 'note'
    check (activity_type in ('note', 'call', 'email', 'message', 'viewing', 'offer', 'task', 'status_change')),
  title text not null,
  notes text,
  due_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.leads
  add column if not exists pipeline_stage_id uuid references public.crm_pipeline_stages(id) on delete set null,
  add column if not exists intent_score integer not null default 50 check (intent_score between 0 and 100),
  add column if not exists follow_up_status text not null default 'new'
    check (follow_up_status in ('new', 'contacted', 'qualified', 'viewing', 'offer', 'won', 'lost')),
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists lead_source text,
  add column if not exists estimated_budget numeric(14,2),
  add column if not exists preferred_area text;

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('agency', 'developer', 'owner', 'investor')),
  code text not null unique,
  name text not null,
  price_monthly numeric(12,2) not null default 0,
  currency text not null default 'GHS',
  featured_listing_credits integer not null default 0,
  seat_limit integer,
  listing_limit integer,
  capabilities text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_subscriptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  plan_id uuid references public.subscription_plans(id) on delete restrict,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'paused', 'canceled')),
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz,
  external_provider text,
  external_subscription_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

create table if not exists public.featured_listing_campaigns (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'active', 'paused', 'completed', 'canceled')),
  placement text not null default 'search_top',
  budget numeric(12,2) not null default 0,
  currency text not null default 'GHS',
  starts_at timestamptz,
  ends_at timestamptz,
  impressions integer not null default 0,
  clicks integer not null default 0,
  leads integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monetization_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete set null,
  event_type text not null,
  amount numeric(12,2) not null default 0,
  currency text not null default 'GHS',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

insert into public.subscription_plans
  (audience, code, name, price_monthly, currency, featured_listing_credits, seat_limit, listing_limit, capabilities)
values
  ('agency', 'agency_starter', 'Agency Starter', 0, 'GHS', 1, 3, 25, array['Verified agency profile', 'Lead inbox', 'Basic analytics']),
  ('agency', 'agency_professional', 'Agency Professional', 650, 'GHS', 10, 15, 250, array['Advanced CRM', 'Featured listings', 'Team permissions', 'Market analytics']),
  ('agency', 'agency_enterprise', 'Agency Enterprise', 2500, 'GHS', 50, null, null, array['Unlimited listings', 'Priority verification', 'Fraud review queue', 'Dedicated support']),
  ('developer', 'developer_growth', 'Developer Growth', 1200, 'GHS', 20, 20, null, array['Project marketing', 'Construction updates', 'Investor leads'])
on conflict (code) do update set
  name = excluded.name,
  price_monthly = excluded.price_monthly,
  featured_listing_credits = excluded.featured_listing_credits,
  seat_limit = excluded.seat_limit,
  listing_limit = excluded.listing_limit,
  capabilities = excluded.capabilities,
  active = true,
  updated_at = now();

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'country_document_requirements') then
    insert into public.country_document_requirements
      (country_code, workflow, document_type, required_for_roles, required, metadata)
    values
      ('GH', 'sale_listing', 'land_title_certificate', array['property_owner', 'agency_owner', 'agency_manager'], true, '{"label":"Land title certificate or registered indenture"}'::jsonb),
      ('GH', 'sale_listing', 'site_plan', array['property_owner', 'agency_owner', 'agency_manager'], true, '{"label":"Stamped site plan"}'::jsonb),
      ('GH', 'sale_listing', 'ghana_card_or_company_docs', array['property_owner', 'agency_owner', 'agency_manager'], true, '{"label":"Owner Ghana Card or company registration documents"}'::jsonb),
      ('GH', 'rent_listing', 'tenancy_agreement_template', array['property_owner', 'agency_owner', 'agency_manager'], true, '{"label":"Approved tenancy agreement template"}'::jsonb),
      ('GH', 'rent_listing', 'agent_authority_letter', array['agency_owner', 'agency_manager', 'independent_agent'], true, '{"label":"Agent authority letter from property owner"}'::jsonb)
    on conflict do nothing;
  end if;
end $$;

alter table public.listing_compliance_reviews enable row level security;
alter table public.trust_scores enable row level security;
alter table public.fraud_signals enable row level security;
alter table public.crm_pipeline_stages enable row level security;
alter table public.crm_activities enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.organization_subscriptions enable row level security;
alter table public.featured_listing_campaigns enable row level security;
alter table public.monetization_events enable row level security;

grant select on public.subscription_plans to anon, authenticated;
grant select, insert, update, delete on
  public.listing_compliance_reviews,
  public.trust_scores,
  public.fraud_signals,
  public.crm_pipeline_stages,
  public.crm_activities,
  public.organization_subscriptions,
  public.featured_listing_campaigns,
  public.monetization_events
to authenticated;

create policy "subscription plans are public"
  on public.subscription_plans for select
  using (active = true);

create policy "organization members can read compliance reviews"
  on public.listing_compliance_reviews for select
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  );

create policy "organization members can manage compliance reviews"
  on public.listing_compliance_reviews for all
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  )
  with check (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  );

create policy "organization members can manage fraud signals"
  on public.fraud_signals for all
  using (
    organization_id is null or exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  )
  with check (
    organization_id is null or exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  );

create policy "trust scores are readable to authenticated users"
  on public.trust_scores for select
  to authenticated
  using (true);

create policy "admins can manage trust scores"
  on public.trust_scores for all
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and r.role in ('platform_admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and r.role in ('platform_admin', 'super_admin')
    )
  );

create policy "organization members can manage CRM"
  on public.crm_pipeline_stages for all
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  )
  with check (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  );

create policy "organization members can manage CRM activities"
  on public.crm_activities for all
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  )
  with check (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  );

create policy "organization members can manage subscriptions"
  on public.organization_subscriptions for all
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  )
  with check (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  );

create policy "organization members can manage featured campaigns"
  on public.featured_listing_campaigns for all
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  )
  with check (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  );

create policy "organization members can read monetization events"
  on public.monetization_events for select
  using (
    exists (
      select 1 from public.user_roles r
      where r.user_id = auth.uid()
        and r.status = 'active'
        and (r.agency_id = organization_id or r.role in ('platform_admin', 'super_admin'))
    )
  );
