-- Project Table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  calendar_settings JSONB DEFAULT '{"weekends": [0, 6], "holidays": []}', -- Store calendar settings
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles Table (Extended User Information)
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member', 'observer'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Task Table (Adjacency List Model)
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES tasks(id), -- Hierarchy
  text TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL, -- Recommended to store in minutes or hours
  progress FLOAT DEFAULT 0,
  type TEXT DEFAULT 'task', -- 'task', 'milestone', 'summary'
  sort_order INTEGER, -- Order among siblings
  constraint_type TEXT, -- CPM Constraint Type ('MSO', 'SNET', etc.)
  constraint_date TIMESTAMPTZ,
  
  -- CPM Calculation Results
  early_start TIMESTAMPTZ, -- ES (Early Start)
  early_finish TIMESTAMPTZ, -- EF (Early Finish)
  late_start TIMESTAMPTZ, -- LS (Late Start)
  late_finish TIMESTAMPTZ, -- LF (Late Finish)
  total_float INTEGER, -- Total Float in minutes/hours
  is_critical BOOLEAN DEFAULT FALSE, -- Critical Path indicator
  
  -- Optimistic Locking
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dependency Table (Normalized)
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source UUID REFERENCES tasks(id) ON DELETE CASCADE,
  target UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'e2s', -- 'e2s': FS, 's2s': SS, 'e2e': FF, 's2e': SF
  lag INTEGER DEFAULT 0, -- Lag time
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE
);

-- Project Members Table (RBAC)
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member', 'observer'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Resources Table (Renewable Resources)
CREATE TABLE resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'people', 'equipment', 'material'
  capacity FLOAT NOT NULL, -- Maximum available units (e.g., 8 hours/day, 2 units)
  unit TEXT DEFAULT 'hours', -- 'hours', 'units', 'percentage'
  cost_per_unit DECIMAL(10, 2) DEFAULT 0, -- Hourly rate or unit cost
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resource Assignments Table (Task-Resource Mapping)
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES resources(id) ON DELETE CASCADE,
  required_units FLOAT NOT NULL, -- e.g., 0.5 (50%), 1.0 (100%), 2.0 (200%)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_id, resource_id)
);

-- Costs Table (Task-level Cost Tracking)
CREATE TABLE costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL, -- 'fixed', 'hourly'
  amount DECIMAL(10, 2) DEFAULT 0, -- Fixed cost amount
  rate DECIMAL(10, 2) DEFAULT 0, -- Hourly rate
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Baselines Table (Project Baseline Management)
CREATE TABLE baselines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- 'Baseline 1', 'Baseline 2', etc.
  description TEXT,
  baseline_number INTEGER NOT NULL, -- 1-11
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, baseline_number)
);

-- Baseline Tasks Table (Snapshot of Task Data)
CREATE TABLE baseline_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  baseline_id UUID REFERENCES baselines(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  -- Snapshot of task data at baseline creation
  text TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  finish_date TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL,
  cost DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interim Plans Table (Intermediate Schedule Snapshots)
CREATE TABLE interim_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  plan_number INTEGER NOT NULL, -- 1-10
  start_date TIMESTAMPTZ NOT NULL,
  finish_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, task_id, plan_number)
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE baseline_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE interim_plans ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- HELPER FUNCTIONS (To avoid RLS recursion)
-- ==========================================

CREATE OR REPLACE FUNCTION is_project_owner(check_project_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM projects
    WHERE id = check_project_id
    AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- RLS POLICIES
-- ==========================================

-- RLS Policies for Projects
CREATE POLICY "Users can view projects they own or are members of"
  ON projects FOR SELECT
  USING (
    auth.uid() = owner_id OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own projects"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Project owners can update their projects"
  ON projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Project owners can delete their projects"
  ON projects FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for User Profiles
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- RLS Policies for Tasks
CREATE POLICY "Users can view tasks in their projects"
  ON tasks FOR SELECT
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
        )
      )
    )
  );

CREATE POLICY "Users can create tasks in their projects"
  ON tasks FOR INSERT
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
          AND project_members.role != 'observer' -- observer는 생성 불가
        )
      )
    )
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
          AND project_members.role != 'observer' -- observer는 수정 불가
        )
      )
    )
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
          AND project_members.role != 'observer' -- observer는 삭제 불가
        )
      )
    )
  );

-- RLS Policies for Links
CREATE POLICY "Users can view links in their projects"
  ON links FOR SELECT
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
        )
      )
    )
  );

CREATE POLICY "Users can create links in their projects"
  ON links FOR INSERT
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
  );

-- RLS Policies for Project Members (FIXED RECURSION WITH FUNCTION)
CREATE POLICY "Users can view members of their projects"
  ON project_members FOR SELECT
  USING (
    is_project_owner(project_id)
    OR
    user_id = auth.uid()
  );

CREATE POLICY "Project owners can add members"
  ON project_members FOR INSERT
  WITH CHECK (
    is_project_owner(project_id)
  );

CREATE POLICY "Project owners can remove members"
  ON project_members FOR DELETE
  USING (
    is_project_owner(project_id)
  );

-- RLS Policies for Resources
CREATE POLICY "Users can view resources in their projects"
  ON resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = resources.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create resources in their projects"
  ON resources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = resources.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update resources in their projects"
  ON resources FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = resources.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete resources in their projects"
  ON resources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = resources.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

-- RLS Policies for Assignments (inherit from tasks)
CREATE POLICY "Users can view assignments in their projects"
  ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = assignments.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create assignments in their projects"
  ON assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = assignments.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can update assignments in their projects"
  ON assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = assignments.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can delete assignments in their projects"
  ON assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = assignments.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

-- Similar policies for costs, baselines, baseline_tasks, interim_plans
-- (Following same pattern as assignments)

CREATE POLICY "Users can view costs in their projects"
  ON costs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = costs.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage costs in their projects"
  ON costs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = costs.task_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can view baselines in their projects"
  ON baselines FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = baselines.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage baselines in their projects"
  ON baselines FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = baselines.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can view baseline_tasks in their projects"
  ON baseline_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM baselines
      JOIN projects ON projects.id = baselines.project_id
      WHERE baselines.id = baseline_tasks.baseline_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage baseline_tasks in their projects"
  ON baseline_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM baselines
      JOIN projects ON projects.id = baselines.project_id
      WHERE baselines.id = baseline_tasks.baseline_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can view interim_plans in their projects"
  ON interim_plans FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = interim_plans.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can manage interim_plans in their projects"
  ON interim_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = interim_plans.project_id
      AND (
        projects.owner_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

-- ==========================================
-- OPTIMISTIC LOCKING & TRANSACTION FUNCTIONS
-- ==========================================

-- Function: Update task with version check (Optimistic Locking)
CREATE OR REPLACE FUNCTION update_task_with_version(
  p_task_id UUID,
  p_expected_version INTEGER,
  p_updates JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_current_version INTEGER;
  v_result JSONB;
BEGIN
  -- Get current version
  SELECT version INTO v_current_version
  FROM tasks
  WHERE id = p_task_id;

  -- Check if task exists
  IF v_current_version IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Task not found'
    );
  END IF;

  -- Check version conflict
  IF v_current_version != p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Version conflict',
      'current_version', v_current_version,
      'expected_version', p_expected_version
    );
  END IF;

  -- Update task with incremented version
  UPDATE tasks
  SET
    text = COALESCE((p_updates->>'text')::TEXT, text),
    start_date = COALESCE((p_updates->>'start_date')::TIMESTAMPTZ, start_date),
    duration = COALESCE((p_updates->>'duration')::INTEGER, duration),
    progress = COALESCE((p_updates->>'progress')::FLOAT, progress),
    type = COALESCE((p_updates->>'type')::TEXT, type),
    version = version + 1,
    updated_at = NOW()
  WHERE id = p_task_id;

  -- Return success with new version
  RETURN jsonb_build_object(
    'success', true,
    'new_version', v_current_version + 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Save CPM calculation results (Transaction)
CREATE OR REPLACE FUNCTION save_cpm_results(
  p_results JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_task JSONB;
  v_task_id UUID;
  v_updated_count INTEGER := 0;
BEGIN
  -- Loop through all tasks in results
  FOR v_task IN SELECT * FROM jsonb_array_elements(p_results)
  LOOP
    v_task_id := (v_task->>'id')::UUID;
    
    -- Update CPM fields for each task
    UPDATE tasks
    SET
      early_start = (v_task->>'early_start')::TIMESTAMPTZ,
      early_finish = (v_task->>'early_finish')::TIMESTAMPTZ,
      late_start = (v_task->>'late_start')::TIMESTAMPTZ,
      late_finish = (v_task->>'late_finish')::TIMESTAMPTZ,
      total_float = (v_task->>'total_float')::INTEGER,
      is_critical = (v_task->>'is_critical')::BOOLEAN,
      updated_at = NOW()
    WHERE id = v_task_id;
    
    v_updated_count := v_updated_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'updated_count', v_updated_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create baseline (Transaction)
CREATE OR REPLACE FUNCTION create_baseline(
  p_project_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_baseline_number INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_baseline_id UUID;
  v_task RECORD;
  v_snapshot_count INTEGER := 0;
BEGIN
  -- Create baseline record
  INSERT INTO baselines (project_id, name, description, baseline_number)
  VALUES (p_project_id, p_name, p_description, p_baseline_number)
  RETURNING id INTO v_baseline_id;

  -- Snapshot all tasks in the project
  FOR v_task IN 
    SELECT 
      id,
      text,
      start_date,
      start_date + (duration || ' minutes')::INTERVAL AS finish_date,
      duration
    FROM tasks
    WHERE project_id = p_project_id
  LOOP
    INSERT INTO baseline_tasks (
      baseline_id,
      task_id,
      text,
      start_date,
      finish_date,
      duration,
      cost
    ) VALUES (
      v_baseline_id,
      v_task.id,
      v_task.text,
      v_task.start_date,
      v_task.finish_date,
      v_task.duration,
      0 -- Cost calculation can be added later
    );
    
    v_snapshot_count := v_snapshot_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'baseline_id', v_baseline_id,
    'snapshot_count', v_snapshot_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ==========================================
-- AUTH & SECURITY ENHANCEMENTS
-- ==========================================

-- 1. Handle New User Creation (Automated Profile Creation)
-- This ensures every authenticated user has a corresponding profile in public.user_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, display_name, avatar_url, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_app_meta_data->>'role', 'member') -- Default to 'member'
  )
  ON CONFLICT (id) DO NOTHING; -- Handle potential race conditions
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Run on every new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. Sync Role from Auth Metadata (Source of Truth)
-- This ensures that the 'role' in user_profiles is always in sync with auth.users.raw_app_meta_data
CREATE OR REPLACE FUNCTION public.sync_role_from_auth()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.user_profiles
  SET role = COALESCE(NEW.raw_app_meta_data->>'role', 'member')
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Run when auth.users is updated (specifically metadata)
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.raw_app_meta_data->>'role' IS DISTINCT FROM NEW.raw_app_meta_data->>'role')
  EXECUTE PROCEDURE public.sync_role_from_auth();


-- 3. Protect Profile Role Column
-- Prevent users from manually updating their own role in user_profiles
CREATE OR REPLACE FUNCTION public.protect_role_column()
RETURNS TRIGGER AS $$
BEGIN
  -- If the role is being changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow if it's a system update (we can't easily detect this, but we can check if it matches metadata)
    -- Ideally, we just block it for normal users.
    -- Since we have the sync trigger, any change here will be overwritten eventually if we sync back,
    -- but to be safe, we block it.
    
    -- However, the sync_role_from_auth function performs an UPDATE on this table.
    -- We need to make sure that function doesn't fail.
    -- SECURITY DEFINER functions run with owner privileges.
    
    -- We can check if the current user is the owner of the row (the user themselves)
    IF auth.uid() = NEW.id THEN
        RAISE EXCEPTION 'You cannot update your own role directly. Contact an administrator.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_role_update ON public.user_profiles;
CREATE TRIGGER on_profile_role_update
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_role_column();
