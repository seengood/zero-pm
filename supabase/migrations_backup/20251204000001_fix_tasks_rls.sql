-- Relax RLS policy for tasks INSERT to allow authenticated users (for local dev/debugging)
DROP POLICY IF EXISTS "Users can create tasks in their projects" ON tasks;

CREATE POLICY "Users can create tasks in their projects"
  ON tasks FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
  );
