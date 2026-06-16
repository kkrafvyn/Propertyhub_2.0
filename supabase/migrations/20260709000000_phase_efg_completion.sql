-- Phase E: Agent & Agency operating loops
-- Phase F: Smart buildings + unified consumer activity
-- Phase G: Developer + Enterprise institutional

-- Phase E
alter table public.user_profiles add column if not exists agency_id text;

alter table public.agent_leads add column if not exists listing_id text;
alter table public.agent_leads add column if not exists buyer_user_id uuid references auth.users(id) on delete set null;
alter table public.agent_leads add column if not exists offer_id text;
alter table public.agent_leads add column if not exists transaction_id text;
alter table public.agent_leads add column if not exists agency_id text;
alter table public.agent_leads add column if not exists source text default 'manual';
alter table public.agent_leads add column if not exists viewing_request_id uuid;

alter table public.agent_calendar add column if not exists listing_id text;
alter table public.agent_calendar add column if not exists lead_id text;
alter table public.agent_calendar add column if not exists viewing_request_id uuid;

alter table public.agent_tasks add column if not exists lead_id text;
alter table public.agent_tasks add column if not exists transaction_id text;
alter table public.agent_tasks add column if not exists listing_id text;

alter table public.commission_settlements add column if not exists agency_id text;
alter table public.commission_settlements add column if not exists listing_id text;
alter table public.commission_settlements add column if not exists offer_id text;

alter table public.viewing_requests add column if not exists agent_id uuid references auth.users(id) on delete set null;

create table if not exists public.lead_stage_history (
  id text primary key,
  lead_id text not null,
  agent_id uuid not null references auth.users(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  created_at timestamptz not null default now()
);

alter table public.lead_stage_history enable row level security;
drop policy if exists "Agents read own lead history" on public.lead_stage_history;
create policy "Agents read own lead history"
  on public.lead_stage_history for select using (auth.uid() = agent_id);

-- Phase F
alter table public.smart_devices add column if not exists property_id text;
alter table public.smart_devices add column if not exists unit_id text;

alter table public.iot_webhook_events add column if not exists property_id text;
alter table public.iot_webhook_events add column if not exists processed_at timestamptz;

create table if not exists public.user_activity_events (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'system',
  title text not null,
  body text,
  link text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_user_activity_user_created
  on public.user_activity_events (user_id, created_at desc);

alter table public.user_activity_events enable row level security;
drop policy if exists "Users read own activity" on public.user_activity_events;
create policy "Users read own activity"
  on public.user_activity_events for select using (auth.uid() = user_id);

insert into public.event_automation_rules (id, event_type, action_type, title_template, body_template, link_template, condition, enabled, priority)
values
  ('iot-motion', 'iot.motion_detected', 'notify_user', 'Motion detected', 'Motion on device {{device_id}} at {{property_id}}.', '/my-home', '{}'::jsonb, true, 10),
  ('iot-offline', 'iot.device_offline', 'notify_user', 'Device offline', 'Device {{device_id}} went offline.', '/my-home', '{}'::jsonb, true, 5),
  ('iot-leak', 'iot.leak_detected', 'notify_user', 'Water leak alert', 'Possible leak detected on {{device_id}}.', '/my-home', '{}'::jsonb, true, 20)
on conflict (id) do nothing;

-- Phase G
alter table public.developer_buyers add column if not exists buyer_user_id uuid references auth.users(id) on delete set null;
alter table public.developer_buyers add column if not exists offer_id text;
alter table public.developer_buyers add column if not exists transaction_id text;
alter table public.developer_buyers add column if not exists paid_pct numeric default 0;

alter table public.developer_milestones add column if not exists buyer_notified_at timestamptz;
alter table public.developer_milestones add column if not exists sort_order integer default 0;

alter table public.developer_projects add column if not exists listing_id text;
alter table public.developer_projects add column if not exists completion_target date;

alter table public.enterprise_portfolios add column if not exists organization_id text references public.organizations(id) on delete set null;
alter table public.enterprise_portfolios add column if not exists yield_pct numeric;
alter table public.enterprise_portfolios add column if not exists risk_band text default 'medium';
alter table public.enterprise_portfolios add column if not exists occupancy_pct numeric;
