-- Keep the legacy table explicitly deny-all through browser roles. Provider
-- credentials now live only in Edge Function environment secrets.
drop policy if exists mls_credentials_deny_direct on public.mls_credentials;
create policy mls_credentials_deny_direct
on public.mls_credentials
as restrictive
for all
to authenticated
using (false)
with check (false);
