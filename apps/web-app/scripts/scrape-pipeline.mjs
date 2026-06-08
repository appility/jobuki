#!/usr/bin/env node
/**
 * Full scrape pipeline — runs all three stages in sequence.
 * Use this as the Railway Cron Job command.
 *
 * Required env vars:
 *   GROQ_API_KEY   from console.groq.com
 *   APP_URL        e.g. https://your-app.up.railway.app
 *   INGEST_SECRET  same value as the web app's INGEST_SECRET
 */

import { execSync } from 'child_process'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const run = (script) => {
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`Running: ${script}`)
  console.log('─'.repeat(50))
  execSync(`node ${join(__dirname, script)}`, { stdio: 'inherit', env: process.env })
}

try {
  run('scrape-html.mjs')
  run('extract-jobs.mjs')
  run('ingest-scraped.mjs')
  console.log('\n✓ Pipeline complete')
} catch (err) {
  console.error('\n✗ Pipeline failed:', err.message)
  process.exit(1)
}
