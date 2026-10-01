-- Listing provider credentials are server-managed Edge Function secrets.
-- Do not expose historical provider credentials through the browser data API.
drop policy if exists mls_credentials_select on public.mls_credentials;
drop policy if exists mls_credentials_update on public.mls_credentials;
drop policy if exists mls_credentials_insert on public.mls_credentials;
drop policy if exists mls_credentials_delete on public.mls_credentials;

revoke all on table public.mls_credentials from anon, authenticated;

drop policy if exists listing_sync_jobs_select on public.listing_sync_jobs;
create policy listing_sync_jobs_select
on public.listing_sync_jobs
for select
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.organization_id = listing_sync_jobs.organization_id
      and om.user_id = auth.uid()
  )
);

-- The original global uniqueness constraint could make one organization's row
-- overwrite another organization's listing with the same provider identifier.
alter table public.external_listings
  drop constraint if exists external_listings_provider_external_id_key;

create unique index if not exists external_listings_org_provider_external_id_key
  on public.external_listings (organization_id, provider, external_id);
