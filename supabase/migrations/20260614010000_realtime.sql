-- Enable Realtime for live messages and smart alerts

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.smart_alerts;
exception when duplicate_object then null;
end $$;
