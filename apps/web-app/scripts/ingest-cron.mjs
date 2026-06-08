#!/usr/bin/env node
/**
 * Ingest cron script — run by Railway Cron Job service.
 *
 * Required env vars:
 *   APP_URL        e.g. https://your-app.up.railway.app
 *   INGEST_SECRET  same value as the web app's INGEST_SECRET
 *
 * Optional:
 *   INGEST_LIMIT   max jobs to fetch per run (default 500)
 *   INGEST_SOURCE  which source to run (default "all")
 */

const APP_URL = process.env.APP_URL?.replace(/\/$/, '')
const SECRET  = process.env.INGEST_SECRET
const LIMIT   = Number(process.env.INGEST_LIMIT ?? 500)
const SOURCE  = process.env.INGEST_SOURCE ?? 'all'

if (!APP_URL) { console.error('APP_URL is not set'); process.exit(1) }
if (!SECRET)  { console.error('INGEST_SECRET is not set'); process.exit(1) }

console.log(`[ingest] ${new Date().toISOString()} — source=${SOURCE} limit=${LIMIT}`)

try {
  const res = await fetch(`${APP_URL}/api/ingest-jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SECRET}`,
    },
    body: JSON.stringify({ source: SOURCE, limit: LIMIT }),
  })

  const data = await res.json()

  if (!res.ok || !data.ok) {
    console.error(`[ingest] FAILED (${res.status}):`, data.error ?? JSON.stringify(data))
    process.exit(1)
  }

  console.log(`[ingest] OK — inserted=${data.inserted} skipped=${data.skipped} total=${data.total}`)
  if (data.sourceBreakdown) {
    for (const [source, count] of Object.entries(data.sourceBreakdown)) {
      if (count > 0) console.log(`  ${source}: ${count}`)
    }
  }
  if (data.sourceHealth) {
    const failed = Object.entries(data.sourceHealth)
      .filter(([, h]) => h.status !== 'ok')
    if (failed.length) {
      console.warn(`[ingest] ${failed.length} source(s) had issues:`)
      for (const [source, h] of failed) {
        console.warn(`  ${source}: ${h.status} — ${h.error ?? ''}`)
      }
    }
  }
} catch (err) {
  console.error('[ingest] Error:', err.message)
  process.exit(1)
}
