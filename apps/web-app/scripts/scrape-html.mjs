#!/usr/bin/env node
/**
 * Stage 1 — Fetch HTML from job sites and save to _scraped/html/
 *
 * Sites that allow simple HTTP fetch are listed below.
 * Totaljobs/CWJobs are included — they may return HTML or block.
 * Check the output files to see what was captured.
 */

import { writeFile, mkdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '../_scraped/html')
await mkdir(OUT_DIR, { recursive: true })

const SITES = [
  {
    id: 'cv-library-tech',
    url: 'https://www.cv-library.co.uk/jobs/it-web',
    description: 'CV-Library IT & Web jobs',
  },
  {
    id: 'cv-library-engineering',
    url: 'https://www.cv-library.co.uk/jobs/it-and-internet',
    description: 'CV-Library IT & Internet jobs',
  },
  {
    id: 'totaljobs-tech',
    url: 'https://www.totaljobs.com/jobs/it-jobs',
    description: 'Totaljobs IT jobs',
  },
  {
    id: 'cwjobs',
    url: 'https://www.cwjobs.co.uk/jobs/it-jobs',
    description: 'CWJobs IT jobs',
  },
]

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9',
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const results = []

for (const site of SITES) {
  try {
    console.log(`[scrape] Fetching ${site.description}…`)
    const res = await fetch(site.url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })

    if (!res.ok) {
      console.warn(`[scrape] ${site.id}: HTTP ${res.status} — skipped`)
      results.push({ id: site.id, status: 'failed', reason: `HTTP ${res.status}` })
      continue
    }

    const html = await res.text()

    // Quick check — if we got a CAPTCHA/challenge page, note it
    const isBlocked = html.includes('cf-challenge') || html.includes('Just a moment') || html.toLowerCase().includes('captcha')
    if (isBlocked) {
      console.warn(`[scrape] ${site.id}: Blocked by anti-bot — skipped`)
      results.push({ id: site.id, status: 'blocked' })
      continue
    }

    const filename = `${site.id}-${timestamp}.html`
    await writeFile(join(OUT_DIR, filename), html, 'utf8')
    console.log(`[scrape] ${site.id}: saved ${filename} (${Math.round(html.length / 1024)}KB)`)
    results.push({ id: site.id, status: 'ok', filename, bytes: html.length })

    // Polite delay between requests
    await new Promise(r => setTimeout(r, 1500))
  } catch (err) {
    console.error(`[scrape] ${site.id}: Error — ${err.message}`)
    results.push({ id: site.id, status: 'error', reason: err.message })
  }
}

console.log('\n[scrape] Summary:')
for (const r of results) console.log(`  ${r.status === 'ok' ? '✓' : '✗'} ${r.id}: ${r.status}${r.reason ? ` (${r.reason})` : ''}`)

const saved = results.filter(r => r.status === 'ok').length
console.log(`\n[scrape] ${saved}/${SITES.length} sites saved successfully`)
