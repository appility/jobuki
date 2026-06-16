# Multi-Board Jobs Implementation Plan

## Current Status - COMMITTED TO MULTI-BOARD SCHEMA ✅
- Schema fully updated: `jobBoardListings` table definition active and exported
- All code updated to use multi-board queries and relations
- `jobs` table retains `boardId` and `status` columns for backward compatibility
- Build passes successfully
- Migration files created: `0022_zippy_whiplash.sql` and `0023_implement_multi_board_jobs.sql`

## What's Ready Now
1. ✅ Schema: `jobBoardListings` table fully defined with relations
2. ✅ Code: All routes and queries use multi-board pattern
3. ✅ Exports: `jobBoardListings` exported from DB package
4. ✅ Build: App compiles successfully

## What's Needed Next
Database migration must be manually applied. The Drizzle migration system won't properly execute the SQL without direct database access.

## Solution Approach

### Phase 1: Stabilize (Get app working again)
1. **Restore jobs table schema** (DONE)
   - Add `boardId` back to jobs table definition
   - Add `status` back to jobs table definition
   - Keep `jobBoardListings` table in schema for future use
   - Rebuild app

2. **Manual DB fix** (TODO)
   - Check if `boardId` and `status` columns exist on jobs table
   - If not, add them back:
     ```sql
     ALTER TABLE jobs ADD COLUMN board_id TEXT;
     ALTER TABLE jobs ADD COLUMN status job_status;
     ```
   - Populate from `job_board_listings` if it exists
   - Add NOT NULL constraints
   - Add foreign key constraint

3. **Deploy** (TODO)
   - Push new build to production
   - Verify `/dashboard` loads without errors

### Phase 2: Implement Multi-Board Jobs Properly (TODO)
Once app is stable:

1. **Migrate existing data**
   - For each job with `boardId`, create a `job_board_listings` entry
   - Mark all existing listings as `imported: false` (native jobs)

2. **Update import pipeline**
   - Deduplicate jobs globally by title+company
   - For each imported job, create listings for all selected boards
   - Mark listings as `imported: true`

3. **Update routes** (Already done in code, just needs DB to work)
   - All routes already updated to use `jobBoardListings` joins
   - UI shows "Imported" badge for imported jobs
   - Regular users can't delete imported jobs (admins can)

4. **Test thoroughly**
   - Verify job import to multiple boards
   - Check that imported jobs appear on all selected boards
   - Verify permissions (imported job deletion)
   - Test job deletion logic

## Files to Update (When Stabilizing)

### Database
- Run manual SQL to restore `boardId` and `status` columns

### App Code (Already done, just needs DB)
- `apps/web-app/app/routes/dashboard/boards/jobs.tsx` - Board jobs list page
- `apps/web-app/app/lib/ingest-pipeline.server.ts` - Import logic
- All other routes already have join logic in place

## Next Step
Run the manual SQL fix to restore the columns and populate job_board_listings table
