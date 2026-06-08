#!/usr/bin/env node
/**
 * Stage 2 — Read saved HTML files, extract jobs with Grok AI, save JSON.
 *
 * Required env vars:
 *   XAI_API_KEY   from console.x.ai
 */

import { readdir, readFile, writeFile, mkdir, unlink } from 'fs/promises'
import { join, dirname, basename } from 'path'
import { fileURLToPath } from 'url'
import OpenAI from 'openai'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HTML_DIR = join(__dirname, '../_scraped/html')
const JSON_DIR = join(__dirname, '../_scraped/json')

await mkdir(JSON_DIR, { recursive: true })

const GROQ_KEY = process.env.GROQ_API_KEY
if (!GROQ_KEY) { console.error('GROQ_API_KEY is not set'); process.exit(1) }

const groq = new OpenAI({
  apiKey: GROQ_KEY,
  baseURL: 'https://api.groq.com/openai/v1',
})

const SYSTEM_PROMPT = `You extract job listings from raw HTML. Return only valid JSON with a "jobs" array.
Each job must have these fields (use null if not found):
- title: string (job title)
- company: string (employer name)
- location: string (city/region, e.g. "London", "Remote", "Manchester")
- remotePolicy: "remote" | "hybrid" | "onsite"
- employmentType: "full-time" | "part-time" | "contract" | "freelance" | "internship"
- salaryMin: number | null (annual GBP, integers only)
- salaryMax: number | null (annual GBP, integers only)
- salaryCurrency: "GBP"
- description: string (job summary, max 500 chars)
- applyLink: string | null (full URL to apply or job detail page)
- externalSource: string (the source website domain)

Only include real job listings — skip ads, featured banners, nav items.
Extract up to 30 jobs per page.`

function stripHtml(html) {
  // Remove scripts, styles, SVGs and compress whitespace to reduce tokens
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 24000) // ~6k tokens — cheap to process
}

let htmlFiles = []
try {
  const all = await readdir(HTML_DIR)
  htmlFiles = all.filter(f => f.endsWith('.html'))
} catch {
  console.log('[extract] No HTML directory found — run scrape-html.mjs first')
  process.exit(0)
}

if (htmlFiles.length === 0) {
  console.log('[extract] No HTML files to process')
  process.exit(0)
}

console.log(`[extract] Processing ${htmlFiles.length} HTML file(s)…`)

let totalJobs = 0

for (const file of htmlFiles) {
  const htmlPath = join(HTML_DIR, file)
  const jsonFile = basename(file, '.html') + '.json'
  const jsonPath = join(JSON_DIR, jsonFile)

  try {
    console.log(`[extract] ${file}…`)
    const html = await readFile(htmlPath, 'utf8')
    const stripped = stripHtml(html)

    const source = file.split('-')[0] // e.g. "cv" from "cv-library-tech-..."

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Extract all job listings from this HTML from a UK job board:\n\n${stripped}` },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 4000,
    })

    const raw = response.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw)
    const jobs = Array.isArray(parsed.jobs) ? parsed.jobs : []

    if (jobs.length === 0) {
      console.warn(`[extract] ${file}: No jobs found — site may be JS-rendered or blocked`)
      await unlink(htmlPath)
      continue
    }

    await writeFile(jsonPath, JSON.stringify({ source: file, extractedAt: new Date().toISOString(), jobs }, null, 2))
    await unlink(htmlPath) // Clean up HTML after successful extraction

    console.log(`[extract] ${file}: extracted ${jobs.length} jobs → ${jsonFile}`)
    totalJobs += jobs.length

  } catch (err) {
    console.error(`[extract] ${file}: Error — ${err.message}`)
  }
}

console.log(`\n[extract] Done — ${totalJobs} jobs extracted across ${htmlFiles.length} file(s)`)
