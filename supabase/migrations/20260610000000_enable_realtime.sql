-- Enable Supabase Realtime postgres_changes for tasks and links.
-- Without this, cross-tab (and multi-user) change propagation does not work.
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.links;
