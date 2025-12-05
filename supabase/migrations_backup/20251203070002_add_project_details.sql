-- Add project details fields
ALTER TABLE projects
  ADD COLUMN description TEXT,
  ADD COLUMN start_date DATE,
  ADD COLUMN target_end_date DATE,
  ADD COLUMN status TEXT DEFAULT 'planning' 
    CHECK (status IN ('planning', 'active', 'completed', 'on-hold', 'cancelled')),
  ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
