# Geo-Ranking & Home Loader

## What it does

When a visitor hits a public job board, the server detects their country via Cloudflare's `CF-IPCountry` header and floats region-relevant jobs to the top of the listing. This improves relevance without hiding any jobs.

## Data flow

```
Request (CF-IPCountry header)
  ↓
geo-ranking.server.ts: getGeoRegions()   — loads geo_regions table (cached 10 min)
  ↓
visitorRegion()   — maps CF country code → GeoRegion (e.g. "GB" → { slug: "gb", label: "United Kingdom", ... })
  ↓
rankJobs()        — stable-sorts publishedJobs by scoreJob() descending
  ↓
home.tsx loader   — filters ranked jobs by q / location / category, returns to client
```

## Scoring (scoreJob)

Each job gets a score 1–4 based on how well it matches the visitor's region:

| Score | Condition |
|-------|-----------|
| 4 | Job's region exactly matches visitor's region |
| 3 | Job is remote (always relevant), OR visitor has no geo and job is GB |
| 2 | Job is remote fallback, OR GB job for a US visitor (English cross-appeal) |
| 1 | Unknown region or no match |

Jobs with equal scores preserve their original `createdAt` order (stable sort).

## GeoRegion table (geo_regions)

Each row controls one region. Key columns:

- `slug` — identifier used in `/jobs/country/:slug` URLs (e.g. `gb`, `us`, `remote`)
- `cf_country_codes` — comma-separated Cloudflare country codes (e.g. `GB,IE`)
- `location_keywords` — comma-separated lowercase substrings matched against `job.location`
- `source_keys` — comma-separated `externalSource` values that belong to this region (e.g. `findajob.dwp.gov.uk`)
- `sort_order` — display order on the country page

Rows are cached for 10 minutes in the in-process cache (`board-cache.server.ts`).

## Home loader (marketing/home.tsx)

The loader runs in this order:

1. Resolve the board from `x-board-slug` / `x-board-hostname` headers (set by the reverse proxy)
2. Load `publishedJobs` from DB (cached per board)
3. **Geo-rank** `publishedJobs` → `rankedJobs`
4. Filter `rankedJobs` by search params (`q`, `location`, `category`) → `filteredJobs`
5. Return ranked+filtered jobs plus geo metadata (`geoRegions`, `visitorRegionSlug`) for the client

If no board slug/hostname header is present the loader returns `{ mode: 'marketing' }` and renders the marketing home page instead.

## Country pages (/jobs/country/:slug)

`routes/board/country.tsx` renders a dedicated page for each `GeoRegion`. It filters jobs using `scoreJob(job, region, regions) >= 3` — meaning exact-region matches and remote jobs. The route must be registered in `routes.ts` under the board layout.
