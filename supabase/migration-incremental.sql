-- ==========================================
-- ZeroPM 인증 및 보안 기능 추가 마이그레이션
-- 기존 테이블이 있는 경우 이 스크립트를 사용하세요
-- ==========================================

-- 1. user_profiles 테이블 추가 (새로운 테이블)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin', 'member', 'observer'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. user_profiles RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. user_profiles RLS 정책 추가
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 4. 기존 Tasks 테이블의 INSERT 정책 업데이트 (observer 제외)
DROP POLICY IF EXISTS "Users can create tasks in their projects" ON tasks;
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

-- 5. 기존 Tasks 테이블의 UPDATE 정책 업데이트 (observer 제외)
DROP POLICY IF EXISTS "Users can update tasks in their projects" ON tasks;
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

-- 6. 기존 Tasks 테이블의 DELETE 정책 업데이트 (observer 제외)
DROP POLICY IF EXISTS "Users can delete tasks in their projects" ON tasks;
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

-- 7. 기존 Links 테이블의 INSERT 정책 업데이트 (observer 제외)
DROP POLICY IF EXISTS "Users can create links in their projects" ON links;
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

-- 8. 기존 Links 테이블의 UPDATE 정책 업데이트 (observer 제외)
DROP POLICY IF EXISTS "Users can update links in their projects" ON links;
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

-- 9. 기존 Links 테이블의 DELETE 정책 업데이트 (observer 제외)
DROP POLICY IF EXISTS "Users can delete links in their projects" ON links;
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

-- 10. 낙관적 잠금 함수 추가
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

-- 11. CPM 결과 저장 함수 추가
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

-- 12. Baseline 생성 함수 추가
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

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '✅ 마이그레이션 완료!';
  RAISE NOTICE '추가된 항목:';
  RAISE NOTICE '  - user_profiles 테이블';
  RAISE NOTICE '  - observer 역할 지원';
  RAISE NOTICE '  - 낙관적 잠금 함수';
  RAISE NOTICE '  - CPM 결과 저장 함수';
  RAISE NOTICE '  - Baseline 생성 함수';
END $$;
