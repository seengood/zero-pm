-- constraint_date TIMESTAMP → TIMESTAMPTZ 통일 (M-5)
--
-- init_schema(20251203)에서 TIMESTAMPTZ로 생성되었으나
-- add_task_constraints(20251205)에서 TIMESTAMP로 ADD COLUMN을 시도했음.
-- IF NOT EXISTS로 인해 no-op 처리됐을 가능성이 높으나,
-- 실제 타입이 TIMESTAMP인 환경을 위해 방어적으로 처리함.
-- 이미 TIMESTAMPTZ이면 조건 불충족으로 no-op.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tasks'
      AND column_name  = 'constraint_date'
      AND data_type    = 'timestamp without time zone'
  ) THEN
    ALTER TABLE tasks
      ALTER COLUMN constraint_date TYPE TIMESTAMPTZ
      USING constraint_date AT TIME ZONE 'UTC';

    -- 타입 변경 후 idx_tasks_constraint 인덱스 재생성
    DROP INDEX IF EXISTS idx_tasks_constraint;
    CREATE INDEX idx_tasks_constraint ON tasks(constraint_type, constraint_date);
  END IF;
END $$;
