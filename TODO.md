# TODO

## In progress / next up

1. Move uploads to server-side proxy (most robust for multi-tenant custom domains).
   Browser uploads to app endpoint, server uploads to R2.
   Then R2 CORS no longer depends on tenant domains at all.

4. Add creator plan-limit UX:
   Show upgrade CTA when board limit is reached.

5. Add plan management UI for creator tier upgrades (free/growth/scale).

---

## Ingestion pipeline

### API sources (already wired)
- ✅ Reed.co.uk — key set, fetching. Add pagination (`resultsToSkip` in steps of 100) to get full volume.
- ✅ Adzuna — key set, fetching. Add `category=it-jobs` filter to pre-filter results.
- ✅ Remotive, Arbeitnow, Himalayas, We Work Remotely, Working Nomads — free, no key.
- ✅ CryptoJobsList, HireWeb3, RemoteOK, Jobicy — free RSS/JSON.

### To add
- GOV.UK Find a Job — free Atom feed, no auth.
  URL: `https://findajob.dwp.gov.uk/jobs.atom?cat=4`
  Category 4 = IT/Computer. Good for GDS, NHS Digital, HMRC tech roles.

- Reed pagination — currently only fetches page 1 per keyword.
  Add `resultsToSkip` loop (steps of 100) until results array empty.
  Reed has 200k+ live listings — pagination could 10x our volume.

- Adzuna `category=it-jobs` filter — add to all Adzuna API calls.

### Scrape pipeline (CV-Library, Totaljobs, CWJobs)
Three-stage pipeline using Groq AI (llama-3.3-70b-versatile) for HTML extraction.
Scripts: `scrape-html.mjs` → `extract-jobs.mjs` → `ingest-scraped.mjs`
Orchestrator: `scrape-pipeline.mjs`

**To set up:**
1. Get Groq API key from `console.groq.com` (free tier available).
2. Add `GROQ_API_KEY` to Railway cron service env vars.
3. Create a second Railway Cron Job service for the scrape pipeline:
   - Command: `node apps/web-app/scripts/scrape-pipeline.mjs`
   - Schedule: `0 */6 * * *` (every 6 hours)
   - Env vars: `GROQ_API_KEY`, `APP_URL` (use internal Railway URL), `INGEST_SECRET`
4. Note: Totaljobs/CWJobs may be blocked by anti-bot — if scrape returns 0 jobs,
   fall back to Apify (`santamaria-automations/reed-uk-scraper` Actor, ~$5–10/month).

### Main ingest cron (all API sources)
- Script: `ingest-cron.mjs`
- Railway Cron Job command: `node apps/web-app/scripts/ingest-cron.mjs`
- Schedule: `0 */4 * * *` (every 4 hours)
- Env vars: `APP_URL` (internal Railway URL), `INGEST_SECRET`, `INGEST_LIMIT=500`
- Use Railway private networking: `APP_URL=http://<service>.railway.internal:3000`

### Phase 2 — Apify multi-board scraper
- Actor: `santamaria-automations/reed-uk-scraper`
- Covers: Totaljobs, CWJobs, CV-Library, CWJobs, Indeed UK, GOV.UK in one run
- Cost: ~$5–10/month at daily runs ($0.2/compute unit)
- Use if scrape pipeline is blocked on Totaljobs/CWJobs

---

## Candidate hub

- ✅ Saved jobs (`/candidate/saved`)
- ✅ Applications list (`/candidate/applications`)
- ✅ Profile (`/candidate/profile`)
- ✅ Apply prep page (`/apply/:jobId`) with AI tips + cover letter
- ✅ Post-apply advisory (`/apply/:jobId/success`) with interview tips + follow-up advice

11. Job alerts (email digest) for candidates — phase 2.
    Needs a background job/cron, alert preferences table, and email templates.
    Trigger: new job posted matching candidate's saved categories/location.

12. CV file upload for candidates — phase 2.
    Currently candidates enter a CV URL manually (apply form + profile).
    Switch to direct file upload to R2 (depends on TODO #1 server-side proxy first).

---

## Admin / platform

6. Improve platform admin audit log UX:
   Show richer metadata in the activity feed, including changed roles/features.

7. Extend audit logging beyond /admin:
   Capture board publish/unpublish and domain-management changes too.

8. Add filters to the admin activity feed:
   Filter by actor, action type, and target.

9. Replace more hardcoded permission checks with DB-backed feature checks.

10. Keep Drizzle migration journal ordering stable automatically after generation.
    Root cause: modifying already-applied migration files changes their hash.
    Fix: never edit a migration after it has been applied. Always generate new ones.

---

## Deferred (pick up later)

1. Reset DB migration history for fresh database baseline.
   - Delete old files in `packages/db/migrations/*.sql` and `packages/db/migrations/meta/*`.
   - Run `pnpm --filter @jobuki/db db:generate` to create one new baseline migration from current schema.
   - Run `pnpm --filter @jobuki/db db:migrate` against new DB only.

2. Egress hardening follow-up.
   - Verify board-level pages are not selecting large text/json fields unless required.
   - Add/confirm sitemap caching behavior and monitor crawler hit rate.
   - Review any remaining admin list pages for full-row selects and narrow columns.
   - Add query/response-size logging for top read endpoints to catch regressions.

---

## Image moderation (deferred)
- OpenAI moderation API already wired into image upload (`/api/upload-image`).
- NSFW detection via `omni-moderation-latest` — free, no extra dependency.
- CV file upload moderation to add when TODO #12 is implemented.
