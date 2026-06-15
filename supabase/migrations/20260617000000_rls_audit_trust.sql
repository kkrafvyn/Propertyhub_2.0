-- RLS audit: viewing updates, saved listings merge, agent viewing reads

-- Users can cancel own pending viewings
drop policy if exists "Users can update own viewing requests" on public.viewing_requests;
create policy "Users can update own viewing requests"
  on public.viewing_requests for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Agents/moderators can update viewing status (service role used by edge; this supports direct client reads)
drop policy if exists "Agents read all viewing requests" on public.viewing_requests;
create policy "Agents read all viewing requests"
  on public.viewing_requests for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in ('agent', 'agency_owner', 'agency_manager', 'platform_admin')
    )
  );

drop policy if exists "Agents update viewing requests" on public.viewing_requests;
create policy "Agents update viewing requests"
  on public.viewing_requests for update
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in ('agent', 'agency_owner', 'agency_manager', 'platform_admin')
    )
  );

-- Saved listings: ensure upsert path works for merge on login
drop policy if exists "Users manage own saved listings" on public.saved_listings;
create policy "Users manage own saved listings"
  on public.saved_listings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Rent payments: user can read own rows only (already exists; reinforce)
drop policy if exists "Users read own rent payments" on public.rent_payments;
create policy "Users read own rent payments"
  on public.rent_payments for select
  using (auth.uid() = user_id);

-- Notifications: users read/update own
alter table if exists public.notifications enable row level security;
drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);
drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

-- Listings: submitters can read own pending listings
drop policy if exists "Submitters read own listings" on public.listings;
create policy "Submitters read own listings"
  on public.listings for select
  using (
    status = 'active'
    or submitted_by = auth.uid()
    or exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in ('agency_owner', 'agency_manager', 'platform_admin')
    )
  );

drop policy if exists "Public can read active listings" on public.listings;
