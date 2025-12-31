-- Create batches table
CREATE TABLE IF NOT EXISTS batches (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  name text NOT NULL,
  description text NULL,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Modify candidates table to decouple from tests
ALTER TABLE candidates ALTER COLUMN test_id DROP NOT NULL;
ALTER TABLE candidates ADD COLUMN batch_id uuid REFERENCES batches(id);

-- Add index for performance
CREATE INDEX idx_candidates_batch_id ON candidates(batch_id);
CREATE INDEX idx_batches_org_id ON batches(org_id);
