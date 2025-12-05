-- Add scheduling constraint columns to tasks table
-- Migration: 20251205000000_add_task_constraints.sql

-- Add constraint_type column (default: 'asap')
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS constraint_type VARCHAR(10) DEFAULT 'asap';

-- Add constraint_date column (nullable)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS constraint_date TIMESTAMP;

-- Add index for constraint queries
CREATE INDEX IF NOT EXISTS idx_tasks_constraint 
ON tasks(constraint_type, constraint_date);

-- Add comment for documentation
COMMENT ON COLUMN tasks.constraint_type IS 'Scheduling constraint type: asap, alap, mso, mfo, snet, fnlt';
COMMENT ON COLUMN tasks.constraint_date IS 'Date for constraint (required for mso, mfo, snet, fnlt)';
