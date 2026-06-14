-- Conversation updates for direct client messaging + profile reads

drop policy if exists "Users update own conversations" on public.conversations;
create policy "Users update own conversations"
  on public.conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users read own profile" on public.user_profiles;
create policy "Users read own profile"
  on public.user_profiles for select
  using (auth.uid() = id);
