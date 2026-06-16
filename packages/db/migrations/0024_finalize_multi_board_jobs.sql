-- Finalize Multi-Board Jobs: Drop old columns from jobs table
-- Jobs are now only linked to boards through job_board_listings
-- The status is now stored in job_board_listings, not jobs

-- Drop the old board_id column from jobs (FK no longer needed)
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_board_id_fk;
ALTER TABLE jobs DROP COLUMN IF EXISTS board_id;

-- Drop the old status column from jobs (now in job_board_listings)
ALTER TABLE jobs DROP COLUMN IF EXISTS status;
