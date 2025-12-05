-- Relax RLS policy for tasks SELECT to allow authenticated users (for local dev/debugging)
DROP POLICY IF EXISTS "Users can view tasks in their projects" ON tasks;

CREATE POLICY "Users can view tasks in their projects"
  ON tasks FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );
