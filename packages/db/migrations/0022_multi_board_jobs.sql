-- Multi-board job listings
-- Jobs can now be shared across multiple boards via job_board_listings junction table

-- Create the job_board_listings junction table
CREATE TABLE job_board_listings (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  status job_status NOT NULL DEFAULT 'draft',
  imported BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE UNIQUE INDEX job_board_listings_job_board_idx ON job_board_listings(job_id, board_id);
CREATE INDEX job_board_listings_board_idx ON job_board_listings(board_id);
CREATE INDEX job_board_listings_job_idx ON job_board_listings(job_id);

-- Migrate existing jobs to listings (native jobs with imported=false)
INSERT INTO job_board_listings (id, job_id, board_id, status, imported, created_at, updated_at)
SELECT
  SUBSTRING(MD5(jobs.id || RANDOM()::TEXT), 1, 20),
  jobs.id,
  jobs.board_id,
  jobs.status,
  false,
  jobs.created_at,
  jobs.updated_at
FROM jobs
WHERE jobs.board_id IS NOT NULL;

-- Drop board_id and status from jobs table
ALTER TABLE jobs DROP CONSTRAINT jobs_board_id_fk;
ALTER TABLE jobs DROP COLUMN board_id;
ALTER TABLE jobs DROP COLUMN status;
