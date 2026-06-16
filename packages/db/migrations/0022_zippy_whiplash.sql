ALTER TYPE "member_role" ADD VALUE 'editor';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "job_board_listings" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"board_id" text NOT NULL,
	"status" "job_status" DEFAULT 'draft' NOT NULL,
	"imported" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jobs" DROP CONSTRAINT "jobs_board_id_boards_id_fk";
--> statement-breakpoint
ALTER TABLE "workspace_members" ALTER COLUMN "role" SET DEFAULT 'editor';--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_board_listings" ADD CONSTRAINT "job_board_listings_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "job_board_listings" ADD CONSTRAINT "job_board_listings_board_id_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."boards"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "job_board_listings_job_board_idx" ON "job_board_listings" ("job_id","board_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_board_listings_board_idx" ON "job_board_listings" ("board_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "job_board_listings_job_idx" ON "job_board_listings" ("job_id");--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN IF EXISTS "board_id";--> statement-breakpoint
ALTER TABLE "jobs" DROP COLUMN IF EXISTS "status";