-- KYC provider (Smile Identity) fields + admin document access

alter table public.kyc_records
  add column if not exists provider text,
  add column if not exists provider_job_id text,
  add column if not exists provider_ref_id text,
  add column if not exists provider_status text,
  add column if not exists rejection_reason text,
  add column if not exists reviewed_at timestamptz;

create index if not exists kyc_records_provider_job_id_idx
  on public.kyc_records (provider_job_id)
  where provider_job_id is not null;

-- Staff can read KYC bucket objects for review (edge uses service role; this supports direct admin tools)
create policy "Staff read kyc files"
  on storage.objects for select
  using (
    bucket_id = 'kyc'
    and exists (
      select 1 from public.user_profiles p
      where p.id = auth.uid()
        and p.role in ('platform_admin', 'platform_moderator')
    )
  );
