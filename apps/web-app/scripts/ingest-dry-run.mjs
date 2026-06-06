#!/usr/bin/env node

const VALID_SOURCES = ['cryptojobslist', 'hireweb3', 'remoteok', 'jobicy']

function parseArgs(argv) {
  const options = {}

  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const [rawKey, ...rest] = arg.slice(2).split('=')
    const key = rawKey.trim()
    const value = rest.length ? rest.join('=').trim() : 'true'
    options[key] = value
  }

  return options
}

function toInt(value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.floor(n)
}

function normalizeTags(value) {
  if (!value) return undefined
  const tags = String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  return tags.length ? tags : undefined
}

function buildPayload(source, options) {
  const payload = {
    source,
    dryRun: true,
    limit: toInt(options.limit, 100),
    lookbackDays: toInt(options.lookbackDays, 14),
  }

  if (source === 'cryptojobslist') {
    payload.remoteOnly = options.remoteOnly ? options.remoteOnly !== 'false' : true
    if (options.category) payload.category = options.category
  }

  if (source === 'remoteok') {
    payload.tags = normalizeTags(options.tags) ?? ['cryptocurrency', 'web3']
  }

  if (source === 'jobicy') {
    payload.tags = normalizeTags(options.tags) ?? ['web3', 'blockchain', 'crypto']
  }

  return payload
}

async function postDryRun({ baseUrl, secret, payload, timeoutMs }) {
  const url = `${baseUrl.replace(/\/$/, '')}/api/ingest-jobs`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = { raw: text }
    }

    return {
      ok: response.ok,
      status: response.status,
      data,
    }
  } finally {
    clearTimeout(timer)
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  const sourceOption = String(options.source ?? 'all').toLowerCase()
  const sources = sourceOption === 'all' ? VALID_SOURCES : [sourceOption]

  const invalid = sources.filter((source) => !VALID_SOURCES.includes(source))
  if (invalid.length) {
    console.error(`Invalid source(s): ${invalid.join(', ')}`)
    console.error(`Valid sources: ${VALID_SOURCES.join(', ')}, all`)
    process.exit(1)
  }

  const secret = process.env.INGEST_SECRET
  if (!secret) {
    console.error('Missing INGEST_SECRET in environment')
    process.exit(1)
  }

  const baseUrl = options.baseUrl ?? process.env.INGEST_BASE_URL ?? 'http://localhost:3000'
  const timeoutMs = toInt(options.timeoutMs, 30000)

  console.log(`Dry run target: ${baseUrl}`)
  console.log(`Sources: ${sources.join(', ')}`)
  console.log('')

  let failures = 0

  for (const source of sources) {
    const payload = buildPayload(source, options)
    process.stdout.write(`[${source}] running... `)

    try {
      const result = await postDryRun({ baseUrl, secret, payload, timeoutMs })
      if (!result.ok) {
        failures += 1
        console.log(`FAILED (${result.status})`)
        console.log(JSON.stringify(result.data, null, 2))
        continue
      }

      console.log(`OK (${result.status})`)
      const summary = {
        source,
        totalIncoming: result.data?.totalIncoming,
        afterLookback: result.data?.afterLookback,
        normalized: result.data?.normalized,
        wouldInsert: result.data?.wouldInsert,
        skipped: result.data?.skipped,
      }
      console.log(JSON.stringify(summary, null, 2))
    } catch (error) {
      failures += 1
      console.log('FAILED (request error)')
      const message = error instanceof Error ? error.message : String(error)
      console.log(message)
    }

    console.log('')
  }

  if (failures > 0) {
    process.exit(1)
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(message)
  process.exit(1)
})
