-- save_cpm_results RPC: FOR 루프 → 단일 배치 UPDATE (M-4)
--
-- 기존 구현은 태스크 N개에 대해 N회 개별 UPDATE를 수행했음.
-- 단일 UPDATE ... FROM (SELECT jsonb_array_elements) 로 교체하여
-- 왕복 횟수를 1회로 줄이고, version = version + 1 도 추가함.

CREATE OR REPLACE FUNCTION save_cpm_results(p_results JSONB)
RETURNS JSONB AS $$
DECLARE
  v_updated_count INTEGER;
BEGIN
  UPDATE tasks
  SET
    early_start  = (v.data->>'early_start')::TIMESTAMPTZ,
    early_finish = (v.data->>'early_finish')::TIMESTAMPTZ,
    late_start   = (v.data->>'late_start')::TIMESTAMPTZ,
    late_finish  = (v.data->>'late_finish')::TIMESTAMPTZ,
    total_float  = (v.data->>'total_float')::INTEGER,
    is_critical  = (v.data->>'is_critical')::BOOLEAN,
    version      = tasks.version + 1,
    updated_at   = NOW()
  FROM (
    SELECT jsonb_array_elements(p_results) AS data
  ) AS v
  WHERE tasks.id = (v.data->>'id')::UUID;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

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
