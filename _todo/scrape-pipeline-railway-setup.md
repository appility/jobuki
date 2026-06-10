# Scrape Pipeline — Railway Setup

Sets up CV-Library, Totaljobs, and CWJobs scraping as a separate Railway Cron Job service.
The pipeline runs on a schedule, scrapes HTML, extracts jobs via Groq AI, and posts them
to the existing `/api/ingest-jobs` endpoint.

---

## Prerequisites

- Groq API key — free tier at https://console.groq.com
- The main web app already deployed on Railway (need its internal URL)
- `INGEST_SECRET` already set on the web app service

---

## Step 1 — Get a Groq API key

1. Sign up / log in at https://console.groq.com
2. Go to **API Keys** → **Create API Key**
3. Copy the key — you'll add it as an env var in step 3

---

## Step 2 — Create a new Railway Cron Job service

1. Open your Railway project
2. Click **+ New** → **Cron Job**
3. Connect the same GitHub repo
4. Set the **root directory** to `apps/web-app`
5. Set the **command** to:
   ```
   node scripts/scrape-pipeline.mjs
   ```
6. Set the **schedule** to:
   ```
   0 */6 * * *
   ```
   (runs every 6 hours — adjust to taste)

---

## Step 3 — Add env vars to the Cron Job service

| Variable | Value | Notes |
|---|---|---|
| `GROQ_API_KEY` | `gsk_...` | From console.groq.com |
| `APP_URL` | `http://<service>.railway.internal:3000` | Internal Railway URL of the web app — use private networking to avoid egress costs |
| `INGEST_SECRET` | same value as web app | Must match exactly |

To find the internal URL: open the web app service → **Settings** → **Networking** → copy the private domain (ends in `.railway.internal`).

---

## Step 4 — Verify it works

Run the cron job manually from the Railway dashboard (**Trigger Run**) and check the logs.

A successful run looks like:

```
──────────────────────────────────────────────────
Running: scrape-html.mjs
──────────────────────────────────────────────────
[scrape] Fetching CV-Library IT & Web jobs…
[scrape] cv-library-tech: saved cv-library-tech-2026-06-10T....html (142KB)
[scrape] Fetching Totaljobs IT jobs…
[scrape] totaljobs-tech: Blocked by anti-bot — skipped
...
[scrape] 2/4 sites saved successfully

──────────────────────────────────────────────────
Running: extract-jobs.mjs
──────────────────────────────────────────────────
[extract] cv-library-tech-....html: extracted 28 jobs → cv-library-tech-....json
...
[extract] Done — 28 jobs extracted across 1 file(s)

──────────────────────────────────────────────────
Running: ingest-scraped.mjs
──────────────────────────────────────────────────
[ingest-scraped] cv-library-tech-....json: posting 28 jobs…
[ingest-scraped] cv-library-tech-....json: inserted=22 skipped=6
[ingest-scraped] Done — inserted=22 skipped=6

✓ Pipeline complete
```

---

## If Totaljobs / CWJobs are blocked

These sites use Cloudflare anti-bot. If scrape-html returns 0 files from them:

- CV-Library usually works fine with a plain HTTP fetch
- Totaljobs and CWJobs may need Apify as a fallback

**Apify fallback (Phase 2):**
- Actor: `santamaria-automations/reed-uk-scraper`
- Covers Totaljobs, CWJobs, CV-Library, Indeed UK, GOV.UK in one run
- Cost: ~$5–10/month at daily runs
- Trigger via `POST https://api.apify.com/v2/acts/{actorId}/runs?token={APIFY_TOKEN}`
- Poll run status then fetch JSON dataset results

---

## Endpoint reference

The scrape pipeline posts to the existing ingest endpoint on the web app:

```
POST /api/ingest-jobs
Authorization: Bearer <INGEST_SECRET>
Content-Type: application/json

{ "jobs": [...] }
```

The endpoint accepts a raw `jobs` array — no `source` param needed when posting scraped jobs directly. See `docs/ingest.md` for full request/response reference.
