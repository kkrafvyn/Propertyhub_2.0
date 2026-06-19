-- Viewing & open house slots: host/agent scheduling + consumer booking

alter table public.viewing_slots
  add column if not exists slot_type text not null default 'viewing',
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists notes text;

alter table public.viewing_requests
  add column if not exists slot_id text references public.viewing_slots(id) on delete set null,
  add column if not exists preferred_time text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'viewing_slots_slot_type_check'
  ) then
    alter table public.viewing_slots
      add constraint viewing_slots_slot_type_check
      check (slot_type in ('viewing', 'open_house'));
  end if;
end $$;

create index if not exists idx_viewing_slots_listing_date on public.viewing_slots(listing_id, slot_date);

-- Hosts/agents manage slots on listings they own (edge functions use service role)
drop policy if exists "Owners read own listing slots" on public.viewing_slots;
create policy "Owners read own listing slots"
  on public.viewing_slots for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.submitted_by = auth.uid() or l.owner_id = auth.uid())
    )
  );
