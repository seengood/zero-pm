-- Add soft delete support for core tables
-- This migration adds deleted_at column to tasks, links, and projects tables
-- and updates RLS policies to filter out soft-deleted records

-- Add deleted_at column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at column to links table
ALTER TABLE links ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_at column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Create index on deleted_at for performance
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_links_deleted_at ON links(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NOT NULL;

-- Drop existing RLS policies for tasks
DROP POLICY IF EXISTS "Users can view tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their projects" ON tasks;

-- Recreate tasks RLS policies with soft delete filter
CREATE POLICY "Users can view tasks in their projects"
  ON tasks FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can create tasks in their projects"
  ON tasks FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can update tasks in their projects"
  ON tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role != 'observer'
        )
      )
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role != 'observer'
        )
      )
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can delete tasks in their projects"
  ON tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tasks.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role != 'observer'
        )
      )
    )
    AND deleted_at IS NULL
  );

-- Drop existing RLS policies for links
DROP POLICY IF EXISTS "Users can view links in their projects" ON links;
DROP POLICY IF EXISTS "Users can create links in their projects" ON links;
DROP POLICY IF EXISTS "Users can update links in their projects" ON links;
DROP POLICY IF EXISTS "Users can delete links in their projects" ON links;

-- Recreate links RLS policies with soft delete filter
CREATE POLICY "Users can view links in their projects"
  ON links FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can create links in their projects"
  ON links FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can update links in their projects"
  ON links FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = links.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role != 'observer'
        )
      )
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = links.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role != 'observer'
        )
      )
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can delete links in their projects"
  ON links FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = links.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role != 'observer'
        )
      )
    )
    AND deleted_at IS NULL
  );

-- Drop existing RLS policies for projects
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Recreate projects RLS policies with soft delete filter
CREATE POLICY "Users can view their own projects"
  ON projects FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      owner_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
      )
    )
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can update their own projects"
  ON projects FOR UPDATE
  USING (
    owner_id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    owner_id = auth.uid()
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can delete their own projects"
  ON projects FOR DELETE
  USING (
    owner_id = auth.uid()
    AND deleted_at IS NULL
  );
