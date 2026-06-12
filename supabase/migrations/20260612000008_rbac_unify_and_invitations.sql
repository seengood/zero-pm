-- Unify RBAC role system and add project_invitations table
-- This migration standardizes role naming: owner/editor/viewer
-- and adds invitation system for team collaboration (AC-17)

-- Note: We keep TEXT type for role columns to avoid RLS policy dependency issues
-- Instead, we use CHECK constraints and update data to new role values

-- Update user_profiles.role data to new role values
UPDATE user_profiles SET role =
  CASE role
    WHEN 'admin' THEN 'owner'
    WHEN 'member' THEN 'editor'
    WHEN 'observer' THEN 'viewer'
    ELSE 'editor'
  END WHERE role IN ('admin', 'member', 'observer');

-- Add CHECK constraint for user_profiles.role
ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('owner', 'editor', 'viewer'));

-- Update project_members.role data to new role values
UPDATE project_members SET role =
  CASE role
    WHEN 'admin' THEN 'owner'
    WHEN 'member' THEN 'editor'
    WHEN 'observer' THEN 'viewer'
    ELSE 'editor'
  END WHERE role IN ('admin', 'member', 'observer');

-- Add CHECK constraint for project_members.role
ALTER TABLE project_members ADD CONSTRAINT project_members_role_check 
  CHECK (role IN ('owner', 'editor', 'viewer'));

-- Add unique constraint to project_members if not exists
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_project_id_user_id_key;
ALTER TABLE project_members ADD CONSTRAINT project_members_project_id_user_id_key 
  UNIQUE (project_id, user_id);

-- Create project_invitations table
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  accepted_at TIMESTAMPTZ
);

-- Create indexes for project_invitations
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status);

-- Enable RLS for project_invitations
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for project_invitations
CREATE POLICY "Users can view invitations for their projects"
  ON project_invitations FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      invited_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = project_invitations.project_id
        AND (
          projects.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM project_members
            WHERE project_members.project_id = projects.id
            AND project_members.user_id = auth.uid()
            AND project_members.role = 'owner'
          )
        )
      )
    )
  );

CREATE POLICY "Users can create invitations for their projects"
  ON project_invitations FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
    AND invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_invitations.project_id
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

CREATE POLICY "Users can update invitations they created"
  ON project_invitations FOR UPDATE
  USING (
    auth.role() = 'authenticated'
    AND invited_by = auth.uid()
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND invited_by = auth.uid()
  );

CREATE POLICY "Users can delete invitations they created"
  ON project_invitations FOR DELETE
  USING (
    auth.role() = 'authenticated'
    AND invited_by = auth.uid()
  );

-- Create function to accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(p_token UUID)
RETURNS JSONB AS $$
DECLARE
  v_invitation project_invitations;
  v_project_id UUID;
  v_role TEXT;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation
  FROM project_invitations
  WHERE token = p_token AND status = 'pending' AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invitation');
  END IF;

  -- Check if user already exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = v_invitation.email) THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found. Please sign up first.');
  END IF;

  -- Get user ID from email
  SELECT id INTO v_invitation.invited_by FROM auth.users WHERE email = v_invitation.email;

  -- Add user to project_members
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (v_invitation.project_id, v_invitation.invited_by, v_invitation.role)
  ON CONFLICT (project_id, user_id) DO NOTHING;

  -- Update invitation status
  UPDATE project_invitations
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = v_invitation.id;

  RETURN jsonb_build_object('success', true, 'project_id', v_invitation.project_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on accept_invitation function
GRANT EXECUTE ON FUNCTION accept_invitation(UUID) TO authenticated;

-- Update sync_role_from_auth function to use new role values
CREATE OR REPLACE FUNCTION sync_role_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET role =
    CASE NEW.raw_app_meta_data->>'role'
      WHEN 'owner' THEN 'owner'
      WHEN 'editor' THEN 'editor'
      WHEN 'viewer' THEN 'viewer'
      WHEN 'admin' THEN 'owner'
      WHEN 'member' THEN 'editor'
      WHEN 'observer' THEN 'viewer'
      ELSE 'editor'
    END
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update handle_new_user function to use new role values
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    'editor'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
