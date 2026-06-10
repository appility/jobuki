# Job Ingest Pipeline

## Overview

`POST /api/ingest-jobs` pulls jobs from external feeds, normalises them, deduplicates against existing rows, and inserts into every active board in one pass. It is designed to be called from a cron job or external scheduler — not by end users.

## Auth

Every request must include a bearer token matching the `INGEST_SECRET` environment variable:

```
Authorization: Bearer <INGEST_SECRET>
```

Requests without a valid token receive `401`.

## Request body

```jsonc
{
  "source": "all",          // which feed(s) to pull — see Sources below
  "limit": 500,             // max jobs to fetch per source (default 500, max 2000)
  "lookbackDays": 7,        // only keep jobs published within this many days (optional)
  "category": "engineering",// filter jobs to this category after normalisation (optional)
  "searchTerm": "solidity", // keyword filter — string or comma-separated string (optional)
  "tags": ["web3"],         // additional keyword tags applied alongside searchTerm (optional)
  "remoteOnly": true,       // pass remoteOnly=true to sources that support it (optional)
  "strictSource": false,    // disable fallback when primary source is empty (optional)
  "dryRun": false,          // if true: run everything but skip the DB insert (optional)
  "jobs": [...]             // supply raw IncomingJob objects instead of fetching (optional)
}
```

## Pipeline steps

```
1. Fetch        — call the source fetcher(s) to get IncomingJob[]
2. Lookback     — drop jobs whose publishedAt is older than lookbackDays
3. Normalise    — clean text, infer category/remotePolicy/employmentType → NormalizedJob[]
4. Filter       — keep only jobs that match category + searchTerm + tags
5. Deduplicate  — query existing jobs by (boardId, title, company); skip duplicates
6. Insert       — batch-insert in groups of 200; invalidate per-board cache after each batch
```

## Sources

`source` can be a single named source or `"all"` to run every source in sequence.

| source key | type | what it pulls |
|---|---|---|
| `reed_json` | JSON | Reed.co.uk jobs (UK general) |
| `adzuna_json` | JSON | Adzuna jobs |
| `govuk_atom` | Atom | GOV.UK Find a Job (IT/Computer category) |
| `himalayas_json` | JSON | Himalayas remote jobs |
| `remotive_json` | JSON | Remotive remote jobs |
| `arbeitnow_json` | JSON | Arbeitnow EU/remote jobs |
| `weworkremotely_rss` | RSS | We Work Remotely |
| `workingnomads_rss` | RSS | Working Nomads (development category) |
| `cryptojobslist` | RSS | CryptoJobsList (primary, with fallback) |
| `cryptojobslist_api_rss` | RSS | CryptoJobsList API endpoint |
| `cryptojobslist_remote_rss` | RSS | CryptoJobsList remote filter |
| `hireweb3` / `hireweb3_rss` | RSS | HireWeb3 |
| `remoteok` / `remoteok_json_crypto` / `remoteok_json_web3` | JSON | RemoteOK |
| `remoteok_rss_crypto_web3` / `remoteok_rss_web3` | RSS | RemoteOK RSS |
| `jobicy` / `jobicy_json_*` / `jobicy_rss_*` | JSON/RSS | Jobicy (crypto/blockchain/web3) |

### CryptoJobsList fallback

When `source=cryptojobslist` returns an empty feed (it is intermittently blocked), the pipeline automatically falls back through `remoteok_json_web3 → hireweb3_rss → jobicy_json_web3` in that order, stopping at the first one that returns results. Disable this with `"strictSource": true`.

## Normalisation

`normalizeIncomingJob()` maps every `IncomingJob` to a `NormalizedJob`:

- **title / company / location** — run through `cleanText()` which strips extra whitespace and repairs mojibake (UTF-8 bytes mis-decoded as latin1)
- **remotePolicy** — `remote | hybrid | onsite`, inferred from `remotePolicy` field plus location text
- **employmentType** — `full-time | part-time | contract | freelance | internship`, inferred from `contractType`/`employmentType`
- **primaryCategory** — request `category` wins; otherwise matched against `CATEGORY_RULES` keyword list
- **categoryTags** — union of request tags, search terms, and all matched category keywords (max 12)
- **salary** — `salaryMin`/`salaryMax` coerced to integers; `salaryCurrency` defaults to `GBP`
- **companyLogoUrl** — guessed via Clearbit using the company name as a domain

## Deduplication

A job is a duplicate if a row already exists with the same `(boardId, title.toLowerCase(), company.toLowerCase())`. The check fetches existing rows for all titles in a single `WHERE title IN (...)` query and builds an in-memory Set, so it is O(n) per board rather than per job.

## Response

```jsonc
{
  "ok": true,
  "source": "all",
  "sourceUsed": "all",
  "sourceBreakdown": { "reed_json": 42, "govuk_atom": 18, ... },
  "sourceHealth": { "reed_json": { "status": "ok", "count": 42 }, "remoteok_rss_web3": { "status": "blocked", "count": 0, "error": "403" }, ... },
  "boards": 3,
  "totalIncoming": 312,
  "afterLookback": 290,
  "normalized": 288,
  "afterRequestFilters": 288,
  "inserted": 204,
  "skipped": 84
}
```

`sourceHealth` status values:
- `ok` — fetched and got at least one job
- `empty_feed` — fetched successfully but returned zero jobs
- `blocked` — received 403 / challenge page
- `error` — network or parse failure

## dryRun mode

Pass `"dryRun": true` to run the full pipeline up to and including deduplication, then return `wouldInsert` and `skipped` counts without writing anything to the database. Useful for debugging filter / lookback behaviour.

## Adding a new source

1. Add a key to the `FeedSource` union type and to `FEED_SOURCES`
2. Write a fetcher function matching `SourceFetcher = (options: FetchSourceOptions) => Promise<IncomingJob[]>`
3. Register it in `SOURCE_FETCHERS`

The normaliser and deduplication run automatically — no other changes needed.
