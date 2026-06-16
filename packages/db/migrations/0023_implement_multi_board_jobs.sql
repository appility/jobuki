-- Multi-Board Jobs Implementation
-- Model: Jobs are global. Listings determine which boards display them.
-- - Jobs can be created natively by a board or imported from external sources
-- - job_board_listings creates the many-to-many relationship
-- - A job can appear on multiple boards via multiple listings
-- - Each listing tracks: which job, which board, publication status, and whether imported

-- Step 1: Create job_board_listings table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_board_listings (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  board_id TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  status job_status NOT NULL DEFAULT 'draft',
  imported BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (job_id, board_id)
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS job_board_listings_board_idx ON job_board_listings(board_id);
CREATE INDEX IF NOT EXISTS job_board_listings_job_idx ON job_board_listings(job_id);

-- Step 3: For existing jobs, create listings that preserve current 1-to-1 relationship
-- Each existing job gets a listing on its current board
INSERT INTO job_board_listings (id, job_id, board_id, status, imported, created_at, updated_at)
SELECT
  gen_random_uuid()::text,
  jobs.id,
  jobs.board_id,
  jobs.status,
  CASE WHEN jobs.external_source IS NOT NULL THEN true ELSE false END as imported,
  jobs.created_at,
  jobs.updated_at
FROM jobs
WHERE jobs.board_id IS NOT NULL
ON CONFLICT (job_id, board_id) DO NOTHING;

-- Step 4: Drop boardId and status columns from jobs table
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_board_id_fk;
ALTER TABLE jobs DROP COLUMN IF EXISTS board_id;
ALTER TABLE jobs DROP COLUMN IF EXISTS status;

-- Step 5: Add/ensure foreign key constraints on job_board_listings
DO $$ BEGIN
  ALTER TABLE job_board_listings ADD CONSTRAINT job_board_listings_job_id_fk
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE job_board_listings ADD CONSTRAINT job_board_listings_board_id_fk
    FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
