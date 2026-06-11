-- Migration: update_task_with_version RPC 필드 확장
-- Created: 20260612075725
-- Context: DBObserver가 전송하는 description, constraint_type, constraint_date,
--          parent_id, sort_order 필드가 기존 RPC에 누락되어 낙관적 잠금 전환 시
--          해당 필드들이 저장되지 않는 문제를 방지.

BEGIN;

CREATE OR REPLACE FUNCTION update_task_with_version(
  p_task_id UUID,
  p_expected_version INTEGER,
  p_updates JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_current_version INTEGER;
BEGIN
  SELECT version INTO v_current_version
  FROM tasks
  WHERE id = p_task_id;

  IF v_current_version IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Task not found'
    );
  END IF;

  IF v_current_version != p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Version conflict',
      'current_version', v_current_version,
      'expected_version', p_expected_version
    );
  END IF;

  UPDATE tasks
  SET
    text            = COALESCE((p_updates->>'text')::TEXT, text),
    start_date      = COALESCE((p_updates->>'start_date')::TIMESTAMPTZ, start_date),
    duration        = COALESCE((p_updates->>'duration')::INTEGER, duration),
    progress        = COALESCE((p_updates->>'progress')::FLOAT, progress),
    type            = COALESCE((p_updates->>'type')::TEXT, type),
    description     = COALESCE((p_updates->>'description')::TEXT, description),
    constraint_type = COALESCE((p_updates->>'constraint_type')::TEXT, constraint_type),
    constraint_date = COALESCE((p_updates->>'constraint_date')::TIMESTAMPTZ, constraint_date),
    -- parent_id는 NULL 명시 세팅이 가능해야 하므로 CASE로 처리
    parent_id       = CASE
                        WHEN p_updates ? 'parent_id'
                        THEN (p_updates->>'parent_id')::UUID
                        ELSE parent_id
                      END,
    sort_order      = COALESCE((p_updates->>'sort_order')::INTEGER, sort_order),
    version         = version + 1,
    updated_at      = NOW()
  WHERE id = p_task_id;

  RETURN jsonb_build_object(
    'success', true,
    'new_version', v_current_version + 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;
