-- Enable Realtime for live messages and smart alerts

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.smart_alerts;
