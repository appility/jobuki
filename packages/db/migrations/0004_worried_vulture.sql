DO $$ BEGIN
 CREATE TYPE "public"."account_type" AS ENUM('board_creator', 'job_seeker');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "boards" ADD COLUMN "board_config" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_type" "account_type" DEFAULT 'board_creator' NOT NULL;