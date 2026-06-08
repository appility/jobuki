#!/usr/bin/env node
/**
 * Stage 3 — Read extracted JSON files and POST to the ingest API.
 *
 * Required env vars:
 *   APP_URL        e.g. https://your-app.up.railway.app
 *   INGEST_SECRET  same value as the web app's INGEST_SECRET
 */

import { readdir, readFile, unlink, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const JSON_DIR = join(__dirname, '../_scraped/json')

await mkdir(JSON_DIR, { recursive: true })

const APP_URL = process.env.APP_URL?.replace(/\/$/, '')
const SECRET  = process.env.INGEST_SECRET

if (!APP_URL) { console.error('APP_URL is not set'); process.exit(1) }
if (!SECRET)  { console.error('INGEST_SECRET is not set'); process.exit(1) }

let jsonFiles = []
try {
  const all = await readdir(JSON_DIR)
  jsonFiles = all.filter(f => f.endsWith('.json'))
} catch {
  console.log('[ingest-scraped] No JSON directory found')
  process.exit(0)
}

if (jsonFiles.length === 0) {
  console.log('[ingest-scraped] No JSON files to ingest')
  process.exit(0)
}

console.log(`[ingest-scraped] Found ${jsonFiles.length} file(s) to ingest…`)

let totalInserted = 0
let totalSkipped = 0

for (const file of jsonFiles) {
  const jsonPath = join(JSON_DIR, file)
  try {
    const raw = await readFile(jsonPath, 'utf8')
    const { jobs } = JSON.parse(raw)

    if (!Array.isArray(jobs) || jobs.length === 0) {
      console.warn(`[ingest-scraped] ${file}: empty or invalid — skipping`)
      await unlink(jsonPath)
      continue
    }

    console.log(`[ingest-scraped] ${file}: posting ${jobs.length} jobs…`)

    const res = await fetch(`${APP_URL}/api/ingest-jobs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET}`,
      },
      body: JSON.stringify({ jobs, dryRun: false }),
    })

    const data = await res.json()

    if (!res.ok || !data.ok) {
      console.error(`[ingest-scraped] ${file}: FAILED (${res.status}) — ${data.error ?? JSON.stringify(data)}`)
      continue
    }

    console.log(`[ingest-scraped] ${file}: inserted=${data.inserted} skipped=${data.skipped}`)
    totalInserted += data.inserted ?? 0
    totalSkipped += data.skipped ?? 0

    await unlink(jsonPath) // Clean up after successful ingest
  } catch (err) {
    console.error(`[ingest-scraped] ${file}: Error — ${err.message}`)
  }
}

console.log(`\n[ingest-scraped] Done — inserted=${totalInserted} skipped=${totalSkipped}`)
