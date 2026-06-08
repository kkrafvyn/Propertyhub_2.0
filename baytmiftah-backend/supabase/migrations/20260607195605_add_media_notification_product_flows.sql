insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-media',
  'property-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'application/pdf'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.property_media add column if not exists uploaded_by uuid references auth.users(id) on delete set null;
alter table public.listings add column if not exists workflow_status text not null default 'published';
alter table public.listings add column if not exists submitted_for_review_at timestamptz;
alter table public.listings add column if not exists published_by uuid references auth.users(id) on delete set null;
alter table public.properties add column if not exists verification_checklist jsonb not null default '{}'::jsonb;

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  category text not null default 'system',
  title text not null,
  body text,
  action_url text,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;

grant select, insert, update, delete on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant insert, update on public.property_media to authenticated;

drop policy if exists "Authenticated users can upload property media" on storage.objects;
drop policy if exists "Public can read property media objects" on storage.objects;
drop policy if exists "Authenticated users can manage uploaded property media" on storage.objects;
drop policy if exists "Authenticated users can remove uploaded property media" on storage.objects;
drop policy if exists "Users can manage notification preferences" on public.notification_preferences;
drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;

create policy "Public can read property media objects"
  on storage.objects for select
  using (bucket_id = 'property-media');

create policy "Authenticated users can upload property media"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'property-media');

create policy "Authenticated users can manage uploaded property media"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'property-media' and owner = auth.uid())
  with check (bucket_id = 'property-media' and owner = auth.uid());

create policy "Authenticated users can remove uploaded property media"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'property-media' and owner = auth.uid());

drop policy if exists "Organization owners can add property media" on public.property_media;
create policy "Organization owners can add property media"
  on public.property_media for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.properties
      join public.organizations on organizations.id = properties.organization_id
      where properties.id = property_media.property_id
        and organizations.owner_id = auth.uid()
    )
  );

create policy "Users can manage notification preferences"
  on public.notification_preferences for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Users can view own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "Users can update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
