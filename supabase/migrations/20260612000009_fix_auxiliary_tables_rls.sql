-- Update RLS policies for auxiliary tables to use new role enum (owner/editor/viewer)
-- This ensures SELECT=viewer, INSERT/UPDATE/DELETE=editor pattern across all tables
-- This migration should be applied after RBAC unification (20260612000006)

-- Update links RLS policies to use new role enum
DROP POLICY IF EXISTS "Users can view links in their projects" ON links;
DROP POLICY IF EXISTS "Users can create links in their projects" ON links;
DROP POLICY IF EXISTS "Users can update links in their projects" ON links;
DROP POLICY IF EXISTS "Users can delete links in their projects" ON links;

CREATE POLICY "Users can view links in their projects"
  ON links FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = links.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor', 'viewer')
        )
      )
    )
  );

CREATE POLICY "Users can create links in their projects"
  ON links FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = links.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can update links in their projects"
  ON links FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = links.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = links.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can delete links in their projects"
  ON links FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = links.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Update resources RLS policies to use new role enum
DROP POLICY IF EXISTS "Users can view resources in their projects" ON resources;
DROP POLICY IF EXISTS "Users can create resources in their projects" ON resources;
DROP POLICY IF EXISTS "Users can update resources in their projects" ON resources;
DROP POLICY IF EXISTS "Users can delete resources in their projects" ON resources;

CREATE POLICY "Users can view resources in their projects"
  ON resources FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = resources.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor', 'viewer')
        )
      )
    )
  );

CREATE POLICY "Users can create resources in their projects"
  ON resources FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = resources.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can update resources in their projects"
  ON resources FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = resources.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = resources.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can delete resources in their projects"
  ON resources FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = resources.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Update assignments RLS policies to use new role enum
DROP POLICY IF EXISTS "Users can view assignments in their projects" ON assignments;
DROP POLICY IF EXISTS "Users can create assignments in their projects" ON assignments;
DROP POLICY IF EXISTS "Users can update assignments in their projects" ON assignments;
DROP POLICY IF EXISTS "Users can delete assignments in their projects" ON assignments;

CREATE POLICY "Users can view assignments in their projects"
  ON assignments FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = assignments.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor', 'viewer')
        )
      )
    )
  );

CREATE POLICY "Users can create assignments in their projects"
  ON assignments FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = assignments.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can update assignments in their projects"
  ON assignments FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = assignments.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = assignments.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can delete assignments in their projects"
  ON assignments FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = assignments.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Update costs RLS policies to use new role enum
DROP POLICY IF EXISTS "Users can view costs in their projects" ON costs;
DROP POLICY IF EXISTS "Users can manage costs in their projects" ON costs;

CREATE POLICY "Users can view costs in their projects"
  ON costs FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = costs.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor', 'viewer')
        )
      )
    )
  );

CREATE POLICY "Users can create costs in their projects"
  ON costs FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = costs.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can update costs in their projects"
  ON costs FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = costs.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = costs.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can delete costs in their projects"
  ON costs FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = costs.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

-- Update baselines RLS policies to use new role enum
DROP POLICY IF EXISTS "Users can view baselines of projects they view" ON baselines;
DROP POLICY IF EXISTS "Users can create baselines for their projects" ON baselines;
DROP POLICY IF EXISTS "Users can delete baselines of their projects" ON baselines;

CREATE POLICY "Users can view baselines of projects they view"
  ON baselines FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = baselines.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor', 'viewer')
        )
      )
    )
  );

CREATE POLICY "Users can create baselines for their projects"
  ON baselines FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = baselines.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can delete baselines of their projects"
  ON baselines FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = baselines.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );
