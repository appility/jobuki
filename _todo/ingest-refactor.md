# Ingest Refactor — Options

Current state: `apps/web-app/app/routes/api/ingest-jobs.ts` is ~1200 lines. All source fetchers, parsers, normalisation, deduplication, and insertion live in one file. `SOURCE_FETCHERS` is an ad-hoc registry but there's no enforced interface and adding a source requires editing the union type, the `FEED_SOURCES` array, and the registry in the same file.

---

## Option A — Split fetchers into a `sources/` folder (quick win)

**Effort:** ~1–2 hours  
**Risk:** Low — mechanical split, no interface changes

### What changes

Move each fetcher function into its own file under:
```
apps/web-app/app/routes/api/sources/
  index.ts              ← re-exports SOURCE_FETCHERS and FEED_SOURCES
  reed.ts
  adzuna.ts
  govuk.ts
  himalayas.ts
  remotive.ts
  arbeitnow.ts
  weworkremotely.ts
  workingnomads.ts
  cryptojobslist.ts     ← includes fallback logic
  hireweb3.ts
  remoteok.ts
  jobicy.ts
```

Shared fetch helpers (`fetchText`, `parseRssJobs`, `parseFeedItems`, `extractTag`, etc.) move to:
```
apps/web-app/app/lib/feed-utils.ts
```

`ingest-jobs.ts` shrinks to just the action handler + pipeline logic (~300 lines). The `FeedSource` union, `FEED_SOURCES` array, and `SOURCE_FETCHERS` record stay but live in `sources/index.ts`.

### Adding a new source

1. Create `sources/mysource.ts` with a fetcher function
2. Add key to `FeedSource` union in `sources/index.ts`
3. Add key to `FEED_SOURCES` array
4. Add entry to `SOURCE_FETCHERS`

### What stays the same

- `SourceFetcher` type signature unchanged
- Pipeline logic (normalise, dedup, insert) untouched
- No interface changes — just file organisation

---

## Option B — Full adapter pattern with registry (clean long-term)

**Effort:** ~half a day  
**Risk:** Medium — requires updating all sources and the pipeline loop

### Core interface

```ts
// apps/web-app/app/lib/ingest/types.ts

export interface SourceAdapter {
  readonly id: FeedSource
  fetch(options: FetchSourceOptions): Promise<IncomingJob[]>
}
```

### File structure

```
apps/web-app/app/lib/ingest/
  types.ts              ← SourceAdapter, IncomingJob, FetchSourceOptions, NormalizedJob, etc.
  registry.ts           ← adapter registry + lookup
  pipeline.ts           ← normalise, deduplicate, insert logic
  feed-utils.ts         ← fetchText, parseRssJobs, extractTag, decodeFeedText, etc.
  sources/
    reed.ts
    adzuna.ts
    govuk.ts
    himalayas.ts
    remotive.ts
    arbeitnow.ts
    weworkremotely.ts
    workingnomads.ts
    cryptojobslist.ts
    hireweb3.ts
    remoteok.ts
    jobicy.ts
    index.ts            ← imports all adapters and builds the registry
```

`apps/web-app/app/routes/api/ingest-jobs.ts` becomes thin:
```ts
import { runIngestPipeline } from '../../lib/ingest/pipeline'
export async function action({ request }) { ... }  // ~50 lines
```

### Registry

```ts
// registry.ts
const adapters = new Map<FeedSource, SourceAdapter>()

export function registerAdapter(adapter: SourceAdapter) {
  adapters.set(adapter.id, adapter)
}

export function getAdapter(id: FeedSource): SourceAdapter {
  const a = adapters.get(id)
  if (!a) throw new Error(`No adapter registered for source: ${id}`)
  return a
}

export function getAllAdapters(): SourceAdapter[] {
  return Array.from(adapters.values())
}
```

### Each source file

```ts
// sources/govuk.ts
import { registerAdapter } from '../registry'
import { fetchText } from '../feed-utils'

registerAdapter({
  id: 'govuk_atom',
  async fetch({ limit }) {
    const xml = await fetchText('https://findajob.dwp.gov.uk/jobs.atom?cat=4')
    // ... parse and return IncomingJob[]
  },
})
```

Sources self-register on import. `sources/index.ts` just imports them all:
```ts
import './reed'
import './adzuna'
import './govuk'
// ...
```

### Adding a new source

1. Create `sources/mysource.ts` — implement and call `registerAdapter({ id, fetch })`
2. Add the `id` to the `FeedSource` union in `types.ts`
3. Import it in `sources/index.ts`

No changes to the pipeline, registry, or any other source.

### Pipeline becomes testable

```ts
// Can test the pipeline with a mock adapter
const mockAdapter: SourceAdapter = {
  id: 'reed_json',
  fetch: async () => [{ title: 'Test Job', ... }],
}
```

### Optional upgrade: move to a shared package

If ingest ever needs to run outside the web app (standalone script, worker, etc.), `lib/ingest/` can be promoted to `packages/ingest/` with zero logic changes — just a path move and a `package.json`.

---

## Recommendation

Start with **Option A** to get the immediate readability win with minimal risk. If/when sources multiply further or you want to test the pipeline in isolation, graduate to **Option B** — the file layout from A maps directly onto B so the second migration is mostly mechanical.
