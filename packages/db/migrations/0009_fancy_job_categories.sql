ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "primary_category" text;
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "category_tags" text[];
