#!/usr/bin/env node
/**
 * Backfill — copy all jobs to every board that's missing them.
 *
 * The ingest pipeline inserts jobs for boards that exist at run time.
 * Boards created after an ingest run are missing those historical jobs.
 * This script finds the gaps and fills them.
 *
 * Usage:
 *   node apps/web-app/scripts/backfill-jobs-to-boards.mjs
 *   node apps/web-app/scripts/backfill-jobs-to-boards.mjs --dry-run
 *
 * Required env:
 *   DATABASE_URL or DIRECT_URL
 */

import postgres from 'postgres'
import { createId } from '@paralleldrive/cuid2'

const isDryRun = process.argv.includes('--dry-run')
const DATABASE_URL = process.env.DIRECT_URL ?? process.env.DATABASE_URL
if (!DATABASE_URL) { console.error('DATABASE_URL is not set'); process.exit(1) }

const sql = postgres(DATABASE_URL, { max: 5 })

console.log(`[backfill] ${isDryRun ? '(DRY RUN) ' : ''}Starting…`)

// 1. Get all boards
const boards = await sql`SELECT id, name, slug FROM boards ORDER BY created_at`
console.log(`[backfill] ${boards.length} boards found`)

if (boards.length < 2) {
  console.log('[backfill] Only one board — nothing to backfill')
  await sql.end(); process.exit(0)
}

// 2. Find the board with the most jobs — use as the source of truth
const jobCounts = await sql`
  SELECT board_id, COUNT(*) AS count
  FROM jobs
  WHERE status = 'published'
  GROUP BY board_id
  ORDER BY count DESC
`

const sourceBoard = boards.find(b => b.id === jobCounts[0]?.board_id)
if (!sourceBoard) {
  console.log('[backfill] No published jobs found anywhere')
  await sql.end(); process.exit(0)
}

console.log(`[backfill] Source board: "${sourceBoard.name}" (${sourceBoard.slug}) — ${jobCounts[0].count} jobs`)

// 3. Get all unique jobs from source board (by title+company as dedup key)
const sourceJobs = await sql`
  SELECT * FROM jobs
  WHERE board_id = ${sourceBoard.id}
  AND status = 'published'
  ORDER BY created_at DESC
`
console.log(`[backfill] ${sourceJobs.length} source jobs to distribute`)

let totalInserted = 0
let totalSkipped = 0

// 4. For each other board, find which jobs are missing and insert them
const targetBoards = boards.filter(b => b.id !== sourceBoard.id)

for (const board of targetBoards) {
  // Get existing title+company keys for this board
  const existing = await sql`
    SELECT LOWER(title) AS title, LOWER(COALESCE(company, '')) AS company
    FROM jobs
    WHERE board_id = ${board.id}
  `
  const existingKeys = new Set(existing.map(r => `${r.title}::${r.company}`))

  const missing = sourceJobs.filter(j => {
    const key = `${j.title.toLowerCase()}::${(j.company ?? '').toLowerCase()}`
    return !existingKeys.has(key)
  })

  console.log(`[backfill] "${board.name}": ${existingKeys.size} existing, ${missing.length} to insert`)

  if (missing.length === 0 || isDryRun) {
    totalSkipped += missing.length
    continue
  }

  // Insert in batches of 200
  const BATCH = 200
  for (let i = 0; i < missing.length; i += BATCH) {
    const batch = missing.slice(i, i + BATCH).map(j => ({
      id: createId(),
      board_id: board.id,
      title: j.title,
      description: j.description,
      requirements: j.requirements,
      benefits: j.benefits,
      external_apply_url: j.external_apply_url,
      external_listing_url: j.external_listing_url,
      external_source: j.external_source,
      primary_category: j.primary_category,
      category_tags: j.category_tags,
      company: j.company,
      company_logo_url: j.company_logo_url,
      location: j.location,
      remote_policy: j.remote_policy,
      employment_type: j.employment_type,
      salary_min: j.salary_min,
      salary_max: j.salary_max,
      salary_currency: j.salary_currency,
      salary_period: j.salary_period,
      status: 'published',
      created_at: j.created_at,
    }))

    await sql`INSERT INTO jobs ${sql(batch)}`
    totalInserted += batch.length
  }

  console.log(`[backfill] "${board.name}": inserted ${missing.length}`)
}

console.log(`\n[backfill] Done — inserted=${totalInserted} skipped=${totalSkipped}`)
if (isDryRun) console.log('[backfill] Dry run — no changes made')

await sql.end()
