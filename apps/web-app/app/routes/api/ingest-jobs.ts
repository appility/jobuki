import type { ActionFunctionArgs } from 'react-router'
import { getDb, boards, jobs } from '@jobuki/db'
import { and, inArray } from 'drizzle-orm'

type FeedSource =
  | 'cryptojobslist_api_rss'
  | 'cryptojobslist_remote_rss'
  | 'hireweb3_rss'
  | 'remoteok_rss_crypto_web3'
  | 'remoteok_rss_web3'
  | 'jobicy_rss_crypto'
  | 'jobicy_rss_blockchain'
  | 'remoteok_json_crypto'
  | 'remoteok_json_web3'
  | 'jobicy_json_crypto'
  | 'jobicy_json_blockchain'
  | 'jobicy_json_web3'
  | 'cryptojobslist'
  | 'hireweb3'
  | 'remoteok'
  | 'jobicy'
type SourceSelection = FeedSource | 'all'
const FEED_SOURCES: FeedSource[] = [
  'cryptojobslist_api_rss',
  'cryptojobslist_remote_rss',
  'hireweb3_rss',
  'remoteok_rss_crypto_web3',
  'remoteok_rss_web3',
  'jobicy_rss_crypto',
  'jobicy_rss_blockchain',
  'remoteok_json_crypto',
  'remoteok_json_web3',
  'jobicy_json_crypto',
  'jobicy_json_blockchain',
  'jobicy_json_web3',
]

type IncomingJob = {
  title?: string
  description?: string | null
  contractType?: string | null
  employmentType?: string | null
  location?: string | null
  company?: string | null
  salaryRangeLower?: number | string | null
  salaryRangeHigher?: number | string | null
  salaryMin?: number | string | null
  salaryMax?: number | string | null
  currency?: string | null
  salaryCurrency?: string | null
  applyLink?: string | null
  link?: string | null
  externalSource?: string | null
  remotePolicy?: string | null
  publishedAt?: string | null
  expiresAt?: string | null
}

type IngestRequestBody = {
  jobs?: IncomingJob[]
  source?: SourceSelection
  limit?: number
  tags?: string[]
  category?: string
  searchTerm?: string | string[]
  remoteOnly?: boolean
  lookbackDays?: number
  strictSource?: boolean
  dryRun?: boolean
}

type NormalizedJob = {
  title: string
  description: string
  primaryCategory: string | null
  categoryTags: string[]
  company: string | null
  location: string | null
  remotePolicy: 'remote' | 'hybrid' | 'onsite'
  employmentType: 'full-time' | 'part-time' | 'contract' | 'freelance' | 'internship'
  salaryMin: number | null
  salaryMax: number | null
  salaryCurrency: string
}

const DEFAULT_SOURCE: SourceSelection = 'cryptojobslist'

type FetchSourceOptions = {
  limit: number
  tags?: string[]
  category?: string
  remoteOnly?: boolean
}

type SourceFetcher = (options: FetchSourceOptions) => Promise<IncomingJob[]>

type SourceHealthStatus = 'ok' | 'empty_feed' | 'blocked' | 'error'

type SourceHealthEntry = {
  status: SourceHealthStatus
  count: number
  error?: string
}

type IngestNormalizationContext = {
  requestCategory: string | null
  requestTags: string[]
  requestSearchTerms: string[]
}

const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  { category: 'engineering', keywords: ['engineer', 'developer', 'typescript', 'backend', 'frontend', 'full stack', 'solidity', 'rust', 'golang', 'python'] },
  { category: 'product', keywords: ['product manager', 'product owner', 'roadmap'] },
  { category: 'design', keywords: ['designer', 'ux', 'ui', 'figma', 'product design'] },
  { category: 'data', keywords: ['data', 'analytics', 'machine learning', 'ai', 'scientist'] },
  { category: 'marketing', keywords: ['marketing', 'growth', 'seo', 'content', 'social'] },
  { category: 'sales', keywords: ['sales', 'account executive', 'business development', 'bdr', 'partnership'] },
  { category: 'operations', keywords: ['operations', 'ops', 'program manager', 'project manager'] },
  { category: 'security', keywords: ['security', 'infosec', 'application security', 'devsecops'] },
  { category: 'devrel', keywords: ['developer relations', 'devrel', 'advocate', 'community manager'] },
]

function unauthorized() {
  return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}

function getBearerToken(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? ''
}

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  return Math.round(n)
}

function toDateMs(value: unknown): number | null {
  if (value == null || value === '') return null
  const ts = Date.parse(String(value))
  return Number.isNaN(ts) ? null : ts
}

function normalizeEmploymentType(value?: string | null): NormalizedJob['employmentType'] {
  const v = (value ?? '').toLowerCase()
  if (v.includes('part')) return 'part-time'
  if (v.includes('contract')) return 'contract'
  if (v.includes('freelance')) return 'freelance'
  if (v.includes('intern')) return 'internship'
  return 'full-time'
}

function normalizeRemotePolicy(value?: string | null, location?: string | null): NormalizedJob['remotePolicy'] {
  const text = `${value ?? ''} ${location ?? ''}`.toLowerCase()
  if (text.includes('hybrid')) return 'hybrid'
  if (text.includes('remote')) return 'remote'
  return 'onsite'
}

function repairMojibake(value: string): string {
  // Common case: UTF-8 bytes interpreted as latin1/cp1252 (e.g. "Weâre").
  if (!/[ÃÂâ€]/.test(value)) return value

  try {
    const repaired = Buffer.from(value, 'latin1').toString('utf8')
    if (repaired.includes('\uFFFD')) return value
    return repaired
  } catch {
    return value
  }
}

function cleanText(value?: string | null): string {
  return repairMojibake(value ?? '').replace(/\s+/g, ' ').trim()
}

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractTag(itemXml: string, tagName: string): string | null {
  const escaped = tagName.replace(':', '\\:')
  const match = itemXml.match(new RegExp(`<${escaped}[^>]*>([\\s\\S]*?)<\\/${escaped}>`, 'i'))
  if (!match?.[1]) return null
  return decodeXml(match[1]).trim()
}

function parseFeedItems(xml: string, limit: number): string[] {
  const rssItems = xml.match(/<item\b[^>]*>[\s\S]*?<\/item>/gi) ?? []
  const atomEntries = xml.match(/<entry\b[^>]*>[\s\S]*?<\/entry>/gi) ?? []
  return (rssItems.length ? rssItems : atomEntries).slice(0, limit)
}

function buildCryptoJobsListUrl({ category, remoteOnly }: FetchSourceOptions): string {
  const url = new URL('https://cryptojobslist.com/jobs.rss')
  if (remoteOnly) url.searchParams.set('jobLocation', 'Remote')
  if (category) url.searchParams.set('category', category)
  return url.toString()
}

function uniqueTags(tags?: string[]): string[] {
  if (!Array.isArray(tags) || tags.length === 0) return []
  return Array.from(new Set(tags.map((tag) => cleanText(tag).toLowerCase()).filter(Boolean)))
}

function parseSearchTerms(value?: string | string[] | null): string[] {
  if (!value) return []
  const raw = Array.isArray(value) ? value : value.split(',')
  return uniqueTags(raw.flatMap((part) => part.split('|').map((segment) => segment.trim())))
}

function normalizeCategory(value?: string | null): string | null {
  const normalized = cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
  return normalized || null
}

function inferCategories(job: IncomingJob, context: IngestNormalizationContext): {
  primaryCategory: string | null
  categoryTags: string[]
} {
  const requestCategory = normalizeCategory(context.requestCategory)
  const haystack = [job.title ?? '', job.description ?? '', job.contractType ?? '', job.employmentType ?? ''].join(' ').toLowerCase()

  const matchedCategories = CATEGORY_RULES
    .filter((rule) => rule.keywords.some((keyword) => haystack.includes(keyword)))
    .map((rule) => rule.category)

  const primaryCategory = requestCategory ?? matchedCategories[0] ?? null
  const categoryTags = uniqueTags([
    ...context.requestTags,
    ...context.requestSearchTerms,
    ...matchedCategories,
    ...(primaryCategory ? [primaryCategory] : []),
  ]).slice(0, 12)

  return { primaryCategory, categoryTags }
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      accept: 'application/rss+xml, application/xml, application/json, text/xml, text/plain, */*',
      'user-agent': 'JobukiIngestBot/1.0 (+https://jobuki.com)',
    },
  })
  if (!response.ok) {
    throw new Error(`Feed fetch failed (${response.status}) for ${url}`)
  }
  return response.text()
}

function parseRssJobs(xml: string, limit: number, externalSource: string, remotePolicy?: string): IncomingJob[] {
  const feedItems = parseFeedItems(xml, limit)
  return feedItems.map((itemXml) => {
    const title = extractTag(itemXml, 'title') || undefined
    const description = extractTag(itemXml, 'description') ?? extractTag(itemXml, 'content:encoded')
    const rssLink = extractTag(itemXml, 'link')
    const atomLinkMatch = itemXml.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)
    const link = rssLink || atomLinkMatch?.[1] || null
    const company =
      extractTag(itemXml, 'hireweb3Jobs:companyName') ??
      extractTag(itemXml, 'dc:creator') ??
      extractTag(itemXml, 'author')
    const location = extractTag(itemXml, 'hireweb3Jobs:location') ?? extractTag(itemXml, 'location')
    const publishedAt = extractTag(itemXml, 'pubDate') ?? extractTag(itemXml, 'published')
    const expiresAt = extractTag(itemXml, 'hireweb3Jobs:expiryDate')
    const salaryMin = extractTag(itemXml, 'hireweb3Jobs:minSalary')
    const salaryMax = extractTag(itemXml, 'hireweb3Jobs:maxSalary')
    const locationType = extractTag(itemXml, 'hireweb3Jobs:locationType')

    return {
      title,
      description,
      link,
      applyLink: link,
      company,
      location,
      contractType: 'full-time',
      externalSource,
      remotePolicy: remotePolicy ?? locationType,
      salaryMin,
      salaryMax,
      publishedAt,
      expiresAt,
    }
  })
}

function parseRemoteOkJobsFromJson(payload: string, limit: number): IncomingJob[] {
  const trimmed = payload.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    return []
  }

  const entries = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { jobs?: unknown[] }).jobs)
      ? ((parsed as { jobs: unknown[] }).jobs ?? [])
      : []

  const objects = entries.filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))

  return objects
    .filter((item) => !('legal' in item) && !('id' in item && !item.position && !item.title))
    .slice(0, limit)
    .map((item) => {
      const position = cleanText(String(item.position ?? item.title ?? item.jobTitle ?? '')) || undefined
      const company = cleanText(String(item.company ?? item.company_name ?? '')) || null
      const location = cleanText(String(item.location ?? item.country ?? '')) || 'Remote'
      const description =
        cleanText(String(item.description ?? item.description_raw ?? item.short_description ?? '')) || null
      const applyLink = cleanText(String(item.apply_url ?? item.url ?? item.applyLink ?? item.link ?? '')) || null

      return {
        title: position,
        description,
        company,
        location,
        contractType: cleanText(String(item.type ?? item.employment_type ?? '')) || null,
        salaryMin: item.salary_min as number | string | null,
        salaryMax: item.salary_max as number | string | null,
        salaryCurrency: cleanText(String(item.salary_currency ?? 'USD')) || 'USD',
        link: applyLink,
        applyLink,
        externalSource: 'remoteok.com',
        remotePolicy: 'remote',
        publishedAt: parseRemoteOkDate(item),
      } satisfies IncomingJob
    })
}

function parseJobicyJobsFromJson(payload: string, limit: number): IncomingJob[] {
  let parsed: unknown
  try {
    parsed = JSON.parse(payload)
  } catch {
    return []
  }

  const root = parsed as { jobs?: unknown[] }
  if (!Array.isArray(root.jobs) || root.jobs.length === 0) return []

  return root.jobs
    .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === 'object'))
    .slice(0, limit)
    .map((item) => ({
      title: cleanText(String(item.jobTitle ?? item.title ?? '')) || undefined,
      description: cleanText(String(item.jobDescription ?? item.jobExcerpt ?? item.description ?? '')) || null,
      company: cleanText(String(item.companyName ?? item.company ?? '')) || null,
      location: cleanText(String(item.jobGeo ?? item.location ?? '')) || null,
      contractType: cleanText(String(item.jobType ?? item.employmentType ?? '')) || null,
      salaryMin: item.salaryMin as number | string | null,
      salaryMax: item.salaryMax as number | string | null,
      salaryCurrency: cleanText(String(item.salaryCurrency ?? 'USD')) || 'USD',
      link: cleanText(String(item.url ?? item.jobUrl ?? '')) || null,
      applyLink: cleanText(String(item.url ?? item.jobUrl ?? '')) || null,
      externalSource: 'jobicy.com',
      remotePolicy: 'remote',
      publishedAt: cleanText(String(item.pubDate ?? item.date ?? '')) || null,
    }))
}

async function fetchCryptoJobsListRss(options: FetchSourceOptions): Promise<IncomingJob[]> {
  const { limit } = options
  const primaryUrl = buildCryptoJobsListUrl(options)
  const fallbackUrl = 'https://api.cryptojobslist.com/jobs.rss'

  let xml: string
  try {
    xml = await fetchText(primaryUrl)
  } catch {
    xml = await fetchText(fallbackUrl)
  }

  const feedItems = parseFeedItems(xml, limit)

  return feedItems.map((itemXml) => {
    const title = extractTag(itemXml, 'title') || undefined
    const description = extractTag(itemXml, 'description')
    const rssLink = extractTag(itemXml, 'link')
    const atomLinkMatch = itemXml.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i)
    const link = rssLink || atomLinkMatch?.[1] || null
    const company = extractTag(itemXml, 'dc:creator') ?? extractTag(itemXml, 'author')
    const location = extractTag(itemXml, 'location') ?? (options.remoteOnly ? 'Remote' : null)
    const publishedAt = extractTag(itemXml, 'pubDate') ?? extractTag(itemXml, 'published')

    return {
      title,
      description,
      link,
      applyLink: link,
      company,
      location,
      contractType: 'full-time',
      externalSource: 'cryptojobslist.com',
      remotePolicy: options.remoteOnly ? 'remote' : null,
      publishedAt,
    }
  })
}

async function fetchRssEndpoint(url: string, limit: number, externalSource: string, remotePolicy?: string) {
  const xml = await fetchText(url)
  return parseRssJobs(xml, limit, externalSource, remotePolicy)
}

async function fetchRemoteOkJsonEndpoint(url: string, limit: number): Promise<IncomingJob[]> {
  const payload = await fetchText(url)
  return parseRemoteOkJobsFromJson(payload, limit)
}

async function fetchJobicyJsonEndpoint(url: string, limit: number): Promise<IncomingJob[]> {
  const payload = await fetchText(url)
  return parseJobicyJobsFromJson(payload, limit)
}

async function fetchHireWeb3Rss({ limit }: FetchSourceOptions): Promise<IncomingJob[]> {
  const xml = await fetchText('https://hireweb3.io/job/rss')
  const feedItems = parseFeedItems(xml, limit)

  return feedItems.map((itemXml) => {
    const title = extractTag(itemXml, 'title') || undefined
    const description = extractTag(itemXml, 'description')
    const link = extractTag(itemXml, 'link')
    const company = extractTag(itemXml, 'hireweb3Jobs:companyName') ?? extractTag(itemXml, 'dc:creator')
    const location = extractTag(itemXml, 'hireweb3Jobs:location')
    const locationType = extractTag(itemXml, 'hireweb3Jobs:locationType')
    const salaryMin = extractTag(itemXml, 'hireweb3Jobs:minSalary')
    const salaryMax = extractTag(itemXml, 'hireweb3Jobs:maxSalary')
    const publishedAt = extractTag(itemXml, 'pubDate')
    const expiresAt = extractTag(itemXml, 'hireweb3Jobs:expiryDate')

    return {
      title,
      description,
      company,
      location,
      remotePolicy: locationType,
      salaryMin,
      salaryMax,
      link,
      applyLink: link,
      externalSource: 'hireweb3.io',
      publishedAt,
      expiresAt,
    }
  })
}

function parseRemoteOkDate(raw: Record<string, unknown>): string | null {
  const direct = cleanText(String(raw.date ?? raw.created_at ?? raw.pubDate ?? ''))
  if (direct) return direct
  const epoch = Number(raw.epoch ?? raw.timestamp ?? NaN)
  if (Number.isFinite(epoch)) {
    const millis = epoch > 1_000_000_000_000 ? epoch : epoch * 1000
    return new Date(millis).toISOString()
  }
  return null
}

async function fetchRemoteOkJson({ limit, tags }: FetchSourceOptions): Promise<IncomingJob[]> {
  const normalizedTags = uniqueTags(tags)
  const tagParam = normalizedTags.length ? normalizedTags.slice(0, 4).join(',') : 'web3'
  const urls = [
    `https://remoteok.com/api?tag=${encodeURIComponent(tagParam)}`,
    'https://remoteok.com/remote-web3-jobs.json',
    'https://remoteok.com/remote-cryptocurrency+web3-jobs.rss',
  ]

  for (const url of urls) {
    const payload = await fetchText(url)
    const trimmed = payload.trim()

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      let parsed: unknown
      try {
        parsed = JSON.parse(trimmed)
      } catch {
        continue
      }

      const jobsOut = parseRemoteOkJobsFromJson(trimmed, limit)

      if (jobsOut.length > 0) return jobsOut
      continue
    }

    if (trimmed.includes('<rss') || trimmed.includes('<feed')) {
      const feedItems = parseFeedItems(trimmed, limit)
      const jobsOut = feedItems.map((itemXml) => {
        const title = extractTag(itemXml, 'title') || undefined
        const description = extractTag(itemXml, 'description')
        const link = extractTag(itemXml, 'link')
        const company = extractTag(itemXml, 'author')
        const publishedAt = extractTag(itemXml, 'pubDate')
        return {
          title,
          description,
          company,
          location: 'Remote',
          remotePolicy: 'remote',
          link,
          applyLink: link,
          externalSource: 'remoteok.com',
          publishedAt,
        } satisfies IncomingJob
      })
      if (jobsOut.length > 0) return jobsOut
    }
  }

  return []
}

async function fetchJobicyJson({ limit, tags }: FetchSourceOptions): Promise<IncomingJob[]> {
  const tagCandidates = uniqueTags(tags)
  if (tagCandidates.length === 0) {
    tagCandidates.push('web3', 'blockchain', 'crypto')
  }

  for (const tag of tagCandidates) {
    const url = `https://jobicy.com/api/v2/remote-jobs?tag=${encodeURIComponent(tag)}&count=${Math.min(limit, 100)}`
    const payload = await fetchText(url)

    const jobsOut = parseJobicyJobsFromJson(payload, limit)
    if (jobsOut.length > 0) return jobsOut
  }

  return []
}

const SOURCE_FETCHERS: Record<FeedSource, SourceFetcher> = {
  cryptojobslist_api_rss: ({ limit }) =>
    fetchRssEndpoint('https://api.cryptojobslist.com/jobs.rss', limit, 'api.cryptojobslist.com', 'remote'),
  cryptojobslist_remote_rss: ({ limit }) =>
    fetchRssEndpoint(
      'https://cryptojobslist.com/jobs.rss?jobLocation=Remote',
      limit,
      'cryptojobslist.com',
      'remote'
    ),
  hireweb3_rss: ({ limit }) => fetchRssEndpoint('https://hireweb3.io/job/rss', limit, 'hireweb3.io'),
  remoteok_rss_crypto_web3: ({ limit }) =>
    fetchRssEndpoint('https://remoteok.com/remote-cryptocurrency+web3-jobs.rss', limit, 'remoteok.com', 'remote'),
  remoteok_rss_web3: ({ limit }) =>
    fetchRssEndpoint('https://remoteok.com/remote-web3-jobs.rss', limit, 'remoteok.com', 'remote'),
  jobicy_rss_crypto: ({ limit }) =>
    fetchRssEndpoint('https://jobicy.com/?feed=job_feed&search_keywords=crypto', limit, 'jobicy.com', 'remote'),
  jobicy_rss_blockchain: ({ limit }) =>
    fetchRssEndpoint('https://jobicy.com/?feed=job_feed&search_keywords=blockchain', limit, 'jobicy.com', 'remote'),
  remoteok_json_crypto: ({ limit }) => fetchRemoteOkJsonEndpoint('https://remoteok.com/api?tag=cryptocurrency', limit),
  remoteok_json_web3: ({ limit }) => fetchRemoteOkJsonEndpoint('https://remoteok.com/api?tag=web3', limit),
  jobicy_json_crypto: ({ limit }) =>
    fetchJobicyJsonEndpoint('https://jobicy.com/api/v2/remote-jobs?tag=crypto', Math.min(limit, 100)),
  jobicy_json_blockchain: ({ limit }) =>
    fetchJobicyJsonEndpoint('https://jobicy.com/api/v2/remote-jobs?tag=blockchain&count=100', Math.min(limit, 100)),
  jobicy_json_web3: ({ limit }) =>
    fetchJobicyJsonEndpoint('https://jobicy.com/api/v2/remote-jobs?tag=web3', Math.min(limit, 100)),
  cryptojobslist: fetchCryptoJobsListRss,
  hireweb3: fetchHireWeb3Rss,
  remoteok: fetchRemoteOkJson,
  jobicy: fetchJobicyJson,
}

function applyLookbackFilter(jobsToFilter: IncomingJob[], lookbackDays?: number): IncomingJob[] {
  const days = Number(lookbackDays)
  if (!Number.isFinite(days) || days <= 0) return jobsToFilter

  const cutoff = Date.now() - Math.floor(days * 24 * 60 * 60 * 1000)
  return jobsToFilter.filter((job) => {
    const publishedMs = toDateMs(job.publishedAt)
    if (!publishedMs) return false
    return publishedMs >= cutoff
  })
}

function classifySourceError(error: unknown): SourceHealthEntry {
  const message = error instanceof Error ? error.message : 'Unknown fetch error'
  const lowered = message.toLowerCase()
  if (lowered.includes('403') || lowered.includes('challenge') || lowered.includes('forbidden')) {
    return { status: 'blocked', count: 0, error: message }
  }
  return { status: 'error', count: 0, error: message }
}

function normalizeIncomingJob(job: IncomingJob, context: IngestNormalizationContext): NormalizedJob | null {
  const title = cleanText(job.title)
  if (!title) return null

  const company = cleanText(job.company) || null
  const location = cleanText(job.location) || null
  const remotePolicy = normalizeRemotePolicy(job.remotePolicy, location)
  const employmentType = normalizeEmploymentType(job.employmentType ?? job.contractType)

  const salaryMin = toNumber(job.salaryMin ?? job.salaryRangeLower)
  const salaryMax = toNumber(job.salaryMax ?? job.salaryRangeHigher)
  const salaryCurrency = cleanText(job.salaryCurrency ?? job.currency) || 'GBP'

  const applyLink = cleanText(job.applyLink ?? job.link)
  const externalSource = cleanText(job.externalSource)
  const sourceLine = [externalSource || null, applyLink || null].filter(Boolean).join(' · ')
  const { primaryCategory, categoryTags } = inferCategories(job, context)

  const descriptionCore = cleanText(job.description) || 'Imported listing.'
  const description = sourceLine ? `${descriptionCore}\n\nSource: ${sourceLine}` : descriptionCore

  return {
    title,
    description,
    primaryCategory,
    categoryTags,
    company,
    location,
    remotePolicy,
    employmentType,
    salaryMin,
    salaryMax,
    salaryCurrency,
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const secret = process.env.INGEST_SECRET
  const token = getBearerToken(request)

  if (!secret || token !== secret) {
    return unauthorized()
  }

  if (request.method.toUpperCase() !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 })
  }

  let body: IngestRequestBody = {}
  try {
    body = (await request.json()) as IngestRequestBody
  } catch {
    return Response.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const source = body.source ?? DEFAULT_SOURCE
  let sourceUsed = source
  let sourceBreakdown: Partial<Record<FeedSource, number>> | null = null
  let sourceHealth: Partial<Record<FeedSource, SourceHealthEntry>> | null = null
  const limit = Math.max(1, Math.min(500, Number(body.limit ?? 100) || 100))
  const lookbackDays = Number(body.lookbackDays)
  const requestSearchTerms = parseSearchTerms(body.searchTerm)
  const requestTags = uniqueTags([...(body.tags ?? []), ...requestSearchTerms])
  const requestCategory = body.category ?? null
  const sourceOptions: FetchSourceOptions = {
    limit,
    tags: requestTags,
    category: requestCategory ?? undefined,
    remoteOnly: body.remoteOnly,
  }

  let incomingJobs: IncomingJob[] = []
  if (Array.isArray(body.jobs) && body.jobs.length > 0) {
    incomingJobs = body.jobs
  } else {
    try {
      if (source === 'all') {
        sourceBreakdown = {}
        sourceHealth = {}
        const combined: IncomingJob[] = []

        for (const selectedSource of FEED_SOURCES) {
          try {
            const jobsForSource = await SOURCE_FETCHERS[selectedSource](sourceOptions)
            sourceBreakdown[selectedSource] = jobsForSource.length
            sourceHealth[selectedSource] = {
              status: jobsForSource.length > 0 ? 'ok' : 'empty_feed',
              count: jobsForSource.length,
            }
            combined.push(...jobsForSource)
          } catch (error) {
            sourceBreakdown[selectedSource] = 0
            sourceHealth[selectedSource] = classifySourceError(error)
          }
        }

        incomingJobs = combined
      } else {
        sourceHealth = {}
        incomingJobs = await SOURCE_FETCHERS[source](sourceOptions)
        sourceHealth[source] = {
          status: incomingJobs.length > 0 ? 'ok' : 'empty_feed',
          count: incomingJobs.length,
        }

        // CryptoJobsList feed is intermittently empty/challenged; transparently fail over to other feed sources.
        if (source === 'cryptojobslist' && !body.strictSource && incomingJobs.length === 0) {
          const fallbackOrder: FeedSource[] = ['remoteok_json_web3', 'hireweb3_rss', 'jobicy_json_web3']
          for (const fallbackSource of fallbackOrder) {
            try {
              const fallbackJobs = await SOURCE_FETCHERS[fallbackSource](sourceOptions)
              sourceHealth[fallbackSource] = {
                status: fallbackJobs.length > 0 ? 'ok' : 'empty_feed',
                count: fallbackJobs.length,
              }
              if (fallbackJobs.length > 0) {
                incomingJobs = fallbackJobs
                sourceUsed = fallbackSource
                break
              }
            } catch (error) {
              sourceHealth[fallbackSource] = classifySourceError(error)
            }
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown fetch error'
      return Response.json({ ok: false, error: `Failed to fetch source ${source}: ${message}` }, { status: 502 })
    }
  }

  const filteredIncoming = applyLookbackFilter(
    incomingJobs,
    Number.isFinite(lookbackDays) ? lookbackDays : undefined
  )

  const normalized = filteredIncoming
    .map((job) =>
      normalizeIncomingJob(job, {
        requestCategory,
        requestTags,
        requestSearchTerms,
      })
    )
    .filter((job): job is NormalizedJob => Boolean(job))

  if (normalized.length === 0) {
    return Response.json({
      ok: true,
      source,
      sourceUsed,
      sourceBreakdown,
      sourceHealth,
      inserted: 0,
      skipped: 0,
      totalIncoming: incomingJobs.length,
      afterLookback: filteredIncoming.length,
    })
  }

  const db = getDb()
  const allBoards = await db.select({ id: boards.id }).from(boards)

  if (allBoards.length === 0) {
    return Response.json({ ok: false, error: 'No boards found to ingest into.' }, { status: 400 })
  }

  const boardIds = allBoards.map((b) => b.id)
  const titles = Array.from(new Set(normalized.map((j) => j.title))).slice(0, 1000)

  const existingRows = titles.length
    ? await db
        .select({ boardId: jobs.boardId, title: jobs.title, company: jobs.company })
        .from(jobs)
        .where(and(inArray(jobs.boardId, boardIds), inArray(jobs.title, titles)))
    : []

  const existingKeys = new Set(
    existingRows.map((row) => `${row.boardId}::${row.title.toLowerCase()}::${(row.company ?? '').toLowerCase()}`)
  )

  const rowsToInsert: Array<typeof jobs.$inferInsert> = []
  let skipped = 0

  for (const board of allBoards) {
    for (const job of normalized) {
      const key = `${board.id}::${job.title.toLowerCase()}::${(job.company ?? '').toLowerCase()}`
      if (existingKeys.has(key)) {
        skipped += 1
        continue
      }

      rowsToInsert.push({
        boardId: board.id,
        title: job.title,
          primaryCategory: job.primaryCategory,
          categoryTags: job.categoryTags,
          company: job.company,
        location: job.location,
        remotePolicy: job.remotePolicy,
        employmentType: job.employmentType,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryCurrency: job.salaryCurrency,
        description: job.description,
        status: 'published',
      })
    }
  }

  if (body.dryRun) {
    return Response.json({
      ok: true,
      dryRun: true,
      source,
      sourceUsed,
      sourceBreakdown,
      sourceHealth,
      category: requestCategory,
      searchTerms: requestSearchTerms,
      tagsUsed: requestTags,
      boards: allBoards.length,
      totalIncoming: incomingJobs.length,
      afterLookback: filteredIncoming.length,
      normalized: normalized.length,
      wouldInsert: rowsToInsert.length,
      skipped,
    })
  }

  const batchSize = 200
  let inserted = 0

  for (let i = 0; i < rowsToInsert.length; i += batchSize) {
    const batch = rowsToInsert.slice(i, i + batchSize)
    if (batch.length === 0) continue
    await db.insert(jobs).values(batch)
    inserted += batch.length
  }

  return Response.json({
    ok: true,
    source,
    sourceUsed,
    sourceBreakdown,
    sourceHealth,
    category: requestCategory,
    searchTerms: requestSearchTerms,
    tagsUsed: requestTags,
    boards: allBoards.length,
    totalIncoming: incomingJobs.length,
    afterLookback: filteredIncoming.length,
    normalized: normalized.length,
    inserted,
    skipped,
  })
}
