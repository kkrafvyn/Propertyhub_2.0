-- User KYC submission: document paths + RLS + storage policies

alter table public.kyc_records
  add column if not exists document_paths jsonb not null default '[]'::jsonb;

create policy "Users read own kyc records"
  on public.kyc_records for select
  using (auth.uid() = user_id);

create policy "Users upload own kyc files"
  on storage.objects for insert
  with check (
    bucket_id = 'kyc'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users read own kyc files"
  on storage.objects for select
  using (
    bucket_id = 'kyc'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
