-- Add shared_links table for read-only public sharing (AC-13)
-- This enables sharing projects with non-authenticated users via token-based access

-- Create shared_links table
CREATE TABLE IF NOT EXISTS shared_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  -- Optional: restrict sharing to specific sections/tasks
  allowed_sections TEXT[] DEFAULT ARRAY['all']::TEXT[]
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_links_project_id ON shared_links(project_id);
CREATE INDEX IF NOT EXISTS idx_shared_links_token ON shared_links(token) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_shared_links_created_by ON shared_links(created_by);

-- Enable RLS
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shared_links
CREATE POLICY "Users can view shared links for their projects"
  ON shared_links FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = shared_links.project_id
        AND (
          projects.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = projects.id
            AND project_members.user_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Users can create shared links for their projects"
  ON shared_links FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = shared_links.project_id
      AND (
        projects.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
          AND project_members.role IN ('owner', 'editor')
        )
      )
    )
  );

CREATE POLICY "Users can update shared links they created"
  ON shared_links FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND created_by = auth.uid()
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND created_by = auth.uid()
  );

CREATE POLICY "Users can delete shared links they created"
  ON shared_links FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND created_by = auth.uid()
  );

-- Create function to validate shared link token
CREATE OR REPLACE FUNCTION validate_shared_link(p_token TEXT)
RETURNS TABLE(project_id UUID, is_valid BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sl.project_id,
    (sl.is_active = true AND (sl.expires_at IS NULL OR sl.expires_at > NOW()))::BOOLEAN AS is_valid
  FROM shared_links sl
  WHERE sl.token = p_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on validation function
GRANT EXECUTE ON FUNCTION validate_shared_link(TEXT) TO anon, authenticated;
