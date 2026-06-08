create table if not exists public.user_profile_completion (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'buyer',
  phone text,
  onboarding_status text not null default 'incomplete',
  mfa_status text not null default 'not_enabled',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.channel_connections (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  provider text not null,
  sync_type text not null default 'ical',
  import_url text,
  export_token text not null default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'active',
  last_synced_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.availability_blocks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete cascade,
  listing_id uuid references public.listings(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  source text not null default 'baytmiftah',
  source_reference text,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'occupied',
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  status text not null default 'received',
  listing_id uuid references public.listings(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  amount numeric,
  currency text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table if not exists public.billing_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  provider text not null,
  description text not null,
  amount numeric not null default 0,
  currency text not null default 'GHS',
  status text not null default 'pending',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  channel text not null,
  name text not null,
  subject text,
  body text not null,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.delivery_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  channel text not null,
  recipient text,
  status text not null default 'queued',
  provider_message_id text,
  title text,
  body text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  keys jsonb not null default '{}'::jsonb,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create table if not exists public.transaction_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  offer_packet_id uuid references public.offer_packets(id) on delete set null,
  document_type text not null,
  title text not null,
  storage_path text,
  status text not null default 'draft',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.negotiation_events (
  id uuid primary key default gen_random_uuid(),
  offer_packet_id uuid references public.offer_packets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null default 'note',
  amount numeric,
  message text,
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.closing_checklists (
  id uuid primary key default gen_random_uuid(),
  offer_packet_id uuid references public.offer_packets(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_moderation_queue (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  status text not null default 'queued',
  priority text not null default 'normal',
  assigned_to uuid references auth.users(id) on delete set null,
  decision text,
  reason_codes text[] not null default '{}',
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.property_valuation_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  estimated_value numeric,
  confidence numeric,
  comparable_listing_ids uuid[] not null default '{}',
  factors jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_profile_completion enable row level security;
alter table public.channel_connections enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.payment_events enable row level security;
alter table public.billing_history enable row level security;
alter table public.message_templates enable row level security;
alter table public.delivery_logs enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.transaction_documents enable row level security;
alter table public.negotiation_events enable row level security;
alter table public.closing_checklists enable row level security;
alter table public.listing_moderation_queue enable row level security;
alter table public.property_valuation_reports enable row level security;

grant select, insert, update, delete on public.user_profile_completion to authenticated;
grant select, insert, update, delete on public.channel_connections to authenticated;
grant select, insert, update, delete on public.availability_blocks to authenticated;
grant select on public.payment_events to authenticated;
grant select on public.billing_history to authenticated;
grant select, insert, update, delete on public.message_templates to authenticated;
grant select, insert on public.delivery_logs to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, insert, update, delete on public.transaction_documents to authenticated;
grant select, insert, update, delete on public.negotiation_events to authenticated;
grant select, insert, update, delete on public.closing_checklists to authenticated;
grant select, insert, update on public.listing_moderation_queue to authenticated;
grant select on public.property_valuation_reports to anon, authenticated;

create policy "Users manage own profile completion"
  on public.user_profile_completion for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users read own billing history"
  on public.billing_history for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users read own delivery logs"
  on public.delivery_logs for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users manage own transaction documents"
  on public.transaction_documents for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage own negotiation events"
  on public.negotiation_events for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users manage own closing checklists"
  on public.closing_checklists for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Public can read valuation reports"
  on public.property_valuation_reports for select
  using (true);

create policy "Organization owners manage channel connections"
  on public.channel_connections for all
  to authenticated
  using (
    exists (
      select 1 from public.organizations
      where organizations.id = channel_connections.organization_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations
      where organizations.id = channel_connections.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "Organization owners manage availability blocks"
  on public.availability_blocks for all
  to authenticated
  using (
    exists (
      select 1 from public.organizations
      where organizations.id = availability_blocks.organization_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations
      where organizations.id = availability_blocks.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "Organization owners manage message templates"
  on public.message_templates for all
  to authenticated
  using (
    exists (
      select 1 from public.organizations
      where organizations.id = message_templates.organization_id
        and organizations.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.organizations
      where organizations.id = message_templates.organization_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "Platform admins manage moderation queue"
  on public.listing_moderation_queue for all
  to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role in ('platform_admin', 'super_admin')
        and user_roles.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role in ('platform_admin', 'super_admin')
        and user_roles.status = 'active'
    )
  );

create index if not exists availability_blocks_listing_dates_idx on public.availability_blocks(listing_id, starts_on, ends_on);
create index if not exists channel_connections_export_token_idx on public.channel_connections(export_token);
create index if not exists billing_history_user_id_idx on public.billing_history(user_id);
create index if not exists delivery_logs_user_id_idx on public.delivery_logs(user_id);
create index if not exists listing_moderation_queue_status_idx on public.listing_moderation_queue(status, priority);
