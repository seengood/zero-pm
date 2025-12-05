drop table if exists baseline_tasks;
drop table if exists baselines;

create table baselines (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  name text not null,
  description text,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table baselines enable row level security;

create policy "Users can view baselines of projects they view"
  on baselines for select
  using (
    exists (
      select 1 from projects
      where projects.id = baselines.project_id
      and projects.owner_id = auth.uid()
    )
  );

create policy "Users can create baselines for their projects"
  on baselines for insert
  with check (
    exists (
      select 1 from projects
      where projects.id = baselines.project_id
      and projects.owner_id = auth.uid()
    )
  );

create policy "Users can delete baselines of their projects"
  on baselines for delete
  using (
    exists (
      select 1 from projects
      where projects.id = baselines.project_id
      and projects.owner_id = auth.uid()
    )
  );
