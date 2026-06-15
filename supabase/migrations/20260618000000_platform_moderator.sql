-- Platform moderator role: limited admin staff for trust & safety

-- Extend listing moderation visibility to platform moderators
drop policy if exists "Submitters read own listings" on public.listings;
create policy "Submitters read own listings"
  on public.listings for select
  using (
    status = 'active'
    or submitted_by = auth.uid()
    or exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in ('agency_owner', 'agency_manager', 'platform_admin', 'platform_moderator')
    )
  );

-- Extend agent viewing reads to platform moderators
drop policy if exists "Agents read all viewing requests" on public.viewing_requests;
create policy "Agents read all viewing requests"
  on public.viewing_requests for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in (
        'independent_agent',
        'agency_agent',
        'agency_owner',
        'agency_manager',
        'platform_admin',
        'platform_moderator'
      )
    )
  );

drop policy if exists "Agents update viewing requests" on public.viewing_requests;
create policy "Agents update viewing requests"
  on public.viewing_requests for update
  using (
    exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
      and p.role in (
        'independent_agent',
        'agency_agent',
        'agency_owner',
        'agency_manager',
        'platform_admin',
        'platform_moderator'
      )
    )
  );
