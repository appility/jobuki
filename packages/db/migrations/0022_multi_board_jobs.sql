-- Multi-board job listings
-- Jobs can now be shared across multiple boards via job_board_listings junction table
-- Imported jobs are read-only for regular users (platform admins can edit)

-- Create the job_board_listings junction table
CREATE TABLE "job_board_listings" (
  "id" text PRIMARY KEY NOT NULL,
  "job_id" text NOT NULL,
  "board_id" text NOT NULL,
  "status" "job_status" NOT NULL DEFAULT 'draft',
  "imported" boolean NOT NULL DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "job_board_listings_job_id_fk" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE cascade,
  CONSTRAINT "job_board_listings_board_id_fk" FOREIGN KEY ("board_id") REFERENCES "boards"("id") ON DELETE cascade
);

-- Create unique constraint (one listing per job per board)
CREATE UNIQUE INDEX "job_board_listings_job_board_idx" ON "job_board_listings"("job_id", "board_id");
CREATE INDEX "job_board_listings_board_idx" ON "job_board_listings"("board_id");
CREATE INDEX "job_board_listings_job_idx" ON "job_board_listings"("job_id");

-- Migrate existing jobs to listings
-- For each job, create a listing with imported=false (native job)
INSERT INTO "job_board_listings" ("id", "job_id", "board_id", "status", "imported", "created_at", "updated_at")
SELECT gen_random_uuid()::text, "id", "board_id", "status", false, "created_at", "updated_at"
FROM "jobs"
WHERE "board_id" IS NOT NULL;

-- Remove boardId and status from jobs table
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_board_id_fk";
ALTER TABLE "jobs" DROP COLUMN "board_id";
ALTER TABLE "jobs" DROP COLUMN "status";
