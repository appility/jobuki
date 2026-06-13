# TODO

## In progress / next up

### Shared header shell refactor (remove candidate nav blink)

Goal:
- Keep one persistent header/footer shell mounted while navigating between board pages and candidate hub pages.
- Remove remount flash caused by switching between separate layout trees.

Scope:
1. Add a parent shell route that wraps both board and candidate branches.
2. Move `BoardSharedHeader` and `BoardSharedFooter` rendering to that parent shell.
3. Move board theme/font injection (`fontImport`, CSS vars) to that parent shell so it is not re-injected on branch switches.
4. Keep candidate side-nav and candidate auth guard where they are (candidate layout), but remove duplicate top header/footer there.
5. Keep board route behavior identical (jobs/about/privacy/apply) with no URL or auth regressions.

Implementation steps:
1. Add new route layout file for shared shell and register it in `app/routes.ts`.
2. Centralize board context lookup in shell loader (slug/hostname/custom domain resolution).
3. Expose shell context to children via outlet context instead of recomputing in both layouts.
4. Refactor `routes/board/layout.tsx` to stop rendering shared header/footer and only render route outlet concerns.
5. Refactor `routes/candidate/layout.tsx` to stop rendering shared header/footer and only render candidate frame + outlet.
6. Ensure avatar dropdown links remain `Link` + prefetch and close menu without hard reload.

Risk checklist:
- Candidate pages currently require auth and board-themed shell. Preserve both.
- Root domain marketing pages should not accidentally render board shell.
- Board-not-found behavior must remain graceful.
- Theme CSS and font import must remain deterministic and not duplicate in head/body.

Verification:
1. Manual:
   - Open avatar menu on board job page, click My dashboard (`/candidate`) and confirm no top-nav blink.
   - Navigate back to jobs and confirm no shell remount flash.
2. Functional:
   - `/jobs`, `/jobs/:jobId/:jobTitle`, `/apply/:jobId`, `/candidate`, `/candidate/profile` all render correctly.
   - Candidate auth redirect still works when signed out.
3. Build:
   - `pnpm build` passes.

Estimate:
- 2-4 hours implementation + verification.

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

3. `/candidate` Lighthouse remediation (score was 43 in sampled run).
   Priority 1 (biggest paint wins):
   - Reduce initial document response time on `/candidate` (observed root doc ~1.41s).
   - Re-run with DB timing logs enabled to isolate app time vs DB time per request.
   - Add server timing headers for auth lookup, board lookup, and candidate page loader queries.

   Priority 2 (render-blocking path):
   - Reduce blocking font CSS on candidate pages.
   - Keep one font family for first paint; defer secondary display fonts.
   - Ensure `font-display: swap` and prefer self-hosted critical fonts where practical.

   Priority 3 (unused JS / third-party weight):
   - Defer non-critical Clerk/UI code on candidate pages until interaction.
   - Audit route-level code splitting for candidate routes to reduce initial JS.
   - Re-check unused JS after split/defer changes (target was ~970 KiB estimated unused JS).

   Verification checklist:
   - Run Lighthouse in Incognito with extensions disabled.
   - Capture 3 runs and compare median for FCP/LCP/TTI.
   - Keep a baseline in `_todo/` with timestamped HTML outputs.

---

## Image moderation (deferred)
- OpenAI moderation API already wired into image upload (`/api/upload-image`).
- NSFW detection via `omni-moderation-latest` — free, no extra dependency.
- CV file upload moderation to add when TODO #12 is implemented.
