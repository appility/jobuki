ALTER TABLE "candidate_profiles" ADD COLUMN "cv_extracted_text" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tier" text DEFAULT 'free' NOT NULL;