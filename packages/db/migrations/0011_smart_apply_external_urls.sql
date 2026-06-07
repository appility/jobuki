ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "external_apply_url" text;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "external_listing_url" text;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "external_source" text;
