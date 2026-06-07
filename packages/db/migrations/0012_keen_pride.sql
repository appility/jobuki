ALTER TYPE "account_type" ADD VALUE 'job_poster';--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "external_apply_url" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "external_listing_url" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "external_source" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "primary_category" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "category_tags" text[];--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "company_logo_url" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "description_json" jsonb;