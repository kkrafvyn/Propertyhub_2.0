-- Service request fulfillment + directory sync support

alter table public.service_requests
  add column if not exists provider_name text,
  add column if not exists assigned_by uuid references auth.users(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists updated_at timestamptz default now();

create index if not exists idx_service_requests_status on public.service_requests(status);

-- Staff read/update via edge functions (service role); users keep own-row policies
