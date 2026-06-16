import { boards, getDb, jobAlertLog, jobAlerts, jobBoardListings, jobs, users } from '@jobuki/db'
import { and, desc, eq, gte } from 'drizzle-orm'
import { Resend } from 'resend'
import { boardUrl } from './board-url'
import { publicJobPath } from './public-job-path'

const DEFAULT_ALERT_LOOKBACK_DAYS = 7
const MAX_ALERTS_PER_RUN = 100
const MAX_CANDIDATE_JOBS = 75
const MAX_EMAIL_MATCHES = 12

type AlertRow = {
  alert: typeof jobAlerts.$inferSelect
  user: Pick<typeof users.$inferSelect, 'id' | 'email' | 'name'>
  board: Pick<typeof boards.$inferSelect, 'id' | 'name' | 'slug' | 'customDomain'> | null
}

type MatchedJob = {
  id: string
  title: string
  company: string | null
  location: string | null
  remotePolicy: string
  primaryCategory: string | null
  categoryTags: string[] | null
  createdAt: Date
  boardSlug: string
  boardCustomDomain: string | null
  boardName: string
}

type AlertMatches = {
  row: AlertRow
  matches: MatchedJob[]
}

export type ProcessJobAlertsOptions = {
  dryRun?: boolean
  limit?: number
}

export type ProcessJobAlertsResult = {
  ok: true
  scanned: number
  sent: number
  skipped: number
  failed: number
  matchedJobs: number
  dryRun: boolean
  results: Array<{
    alertId: string
    email: string
    searchTerm: string
    matches: number
    status: 'sent' | 'skipped' | 'failed' | 'dry-run'
    error?: string
  }>
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeList(value: string[] | null | undefined) {
  return Array.isArray(value)
    ? value.map((item) => item.trim().toLowerCase()).filter(Boolean)
    : []
}

function getSearchTokens(term: string) {
  const trimmed = term.trim().toLowerCase()
  if (!trimmed) return []

  const parts = trimmed.split(/\s+/).filter(Boolean)
  return Array.from(new Set([trimmed, ...parts]))
}

function matchesAlert(job: MatchedJob, alert: typeof jobAlerts.$inferSelect) {
  if (alert.remoteOnly && job.remotePolicy !== 'remote') {
    return false
  }

  const haystack = [
    job.title,
    job.company,
    job.location,
    job.primaryCategory,
    ...(job.categoryTags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  const searchTokens = getSearchTokens(alert.searchTerm)
  const searchMatches = searchTokens.length === 0 || searchTokens.every((token) => haystack.includes(token))
  if (!searchMatches) return false

  const categories = normalizeList(alert.categories)
  if (categories.length === 0) return true

  const jobCategories = normalizeList([
    job.primaryCategory ?? '',
    ...(job.categoryTags ?? []),
  ])

  return categories.some((category) => jobCategories.some((value) => value.includes(category)))
}

function getLookbackDate(lastNotifiedAt: Date | null) {
  if (lastNotifiedAt) return lastNotifiedAt

  const lookback = new Date()
  lookback.setDate(lookback.getDate() - DEFAULT_ALERT_LOOKBACK_DAYS)
  return lookback
}

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not set')
  }

  return new Resend(apiKey)
}

function getResendFrom() {
  const from = process.env.RESEND_FROM?.trim()
  if (!from) {
    throw new Error('RESEND_FROM is not set')
  }

  return from
}

function buildJobUrl(job: MatchedJob) {
  return `${boardUrl(job.boardSlug, job.boardCustomDomain)}${publicJobPath({ id: job.id, title: job.title })}`
}

async function fetchEnabledAlerts(limit: number): Promise<AlertRow[]> {
  const db = getDb()
  const rows = await db
    .select({
      alert: jobAlerts,
      user: { id: users.id, email: users.email, name: users.name },
      board: { id: boards.id, name: boards.name, slug: boards.slug, customDomain: boards.customDomain },
    })
    .from(jobAlerts)
    .innerJoin(users, eq(jobAlerts.userId, users.id))
    .leftJoin(boards, eq(jobAlerts.boardId, boards.id))
    .where(eq(jobAlerts.enabled, true))
    .orderBy(desc(jobAlerts.createdAt))
    .limit(limit)

  return rows.map((row) => ({
    alert: row.alert,
    user: row.user,
    board: row.board.id ? row.board : null,
  }))
}

async function findMatchesForAlert(row: AlertRow) {
  const db = getDb()
  const createdAfter = getLookbackDate(row.alert.lastNotifiedAt)
  const conditions = [
    eq(jobBoardListings.status, 'published'),
    gte(jobs.createdAt, createdAfter),
  ]

  if (row.alert.boardId) {
    conditions.push(eq(jobBoardListings.boardId, row.alert.boardId))
  }

  const candidates = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      location: jobs.location,
      remotePolicy: jobs.remotePolicy,
      primaryCategory: jobs.primaryCategory,
      categoryTags: jobs.categoryTags,
      createdAt: jobs.createdAt,
      boardSlug: boards.slug,
      boardCustomDomain: boards.customDomain,
      boardName: boards.name,
    })
    .from(jobs)
    .innerJoin(jobBoardListings, eq(jobs.id, jobBoardListings.jobId))
    .innerJoin(boards, eq(jobBoardListings.boardId, boards.id))
    .where(and(...conditions))
    .orderBy(desc(jobs.createdAt))
    .limit(MAX_CANDIDATE_JOBS)

  return candidates.filter((job) => matchesAlert(job, row.alert)).slice(0, MAX_EMAIL_MATCHES)
}

async function sendDigestEmail(items: AlertMatches[]) {
  if (items.length === 0) return null

  const row = items[0].row
  const resend = getResendClient()
  const from = getResendFrom()
  const totalMatches = items.reduce((sum, item) => sum + item.matches.length, 0)
  const subject = `${totalMatches} new job${totalMatches === 1 ? '' : 's'} across ${items.length} alert${items.length === 1 ? '' : 's'}`
  const intro = row.user.name ? `Hi ${row.user.name.split(' ')[0]},` : 'Hi,'

  const html = [
    `<p>${escapeHtml(intro)}</p>`,
    `<p>We found ${totalMatches} new job${totalMatches === 1 ? '' : 's'} matching your active alerts.</p>`,
    ...items.flatMap((item) => {
      const label = item.row.board?.name ?? 'All boards'
      return [
        `<h3 style="margin:20px 0 8px">${escapeHtml(item.row.alert.searchTerm)} <span style="font-weight:400;color:#666">(${escapeHtml(label)})</span></h3>`,
        '<ul>',
        ...item.matches.map((job) => {
          const meta = [job.company, job.location, job.remotePolicy === 'remote' ? 'Remote' : job.remotePolicy === 'hybrid' ? 'Hybrid' : null]
            .filter(Boolean)
            .join(' · ')
          return `<li><a href="${escapeHtml(buildJobUrl(job))}">${escapeHtml(job.title)}</a>${meta ? ` <span style="color:#666">(${escapeHtml(meta)})</span>` : ''}</li>`
        }),
        '</ul>',
      ]
    }),
    '<p>You can pause or update this alert from your candidate dashboard.</p>',
  ].join('')

  const text = [
    intro,
    '',
    `We found ${totalMatches} new job${totalMatches === 1 ? '' : 's'} matching your active alerts.`,
    '',
    ...items.flatMap((item) => {
      const label = item.row.board?.name ?? 'All boards'
      return [
        `Alert: ${item.row.alert.searchTerm} (${label})`,
        ...item.matches.map((job) => {
          const meta = [job.company, job.location, job.remotePolicy === 'remote' ? 'Remote' : job.remotePolicy === 'hybrid' ? 'Hybrid' : null]
            .filter(Boolean)
            .join(' · ')
          return `- ${job.title}${meta ? ` (${meta})` : ''}\n  ${buildJobUrl(job)}`
        }),
        '',
      ]
    }),
    '',
    'You can pause or update this alert from your candidate dashboard.',
  ].join('\n')

  const response = await resend.emails.send({
    from,
    to: row.user.email,
    subject,
    html,
    text,
  })

  if (response.error) {
    throw new Error(response.error.message)
  }

  return response.data?.id ?? null
}

export async function processJobAlerts(options: ProcessJobAlertsOptions = {}): Promise<ProcessJobAlertsResult> {
  const db = getDb()
  const dryRun = options.dryRun === true
  const limit = Math.max(1, Math.min(options.limit ?? MAX_ALERTS_PER_RUN, MAX_ALERTS_PER_RUN))
  const alerts = await fetchEnabledAlerts(limit)

  const summary: ProcessJobAlertsResult = {
    ok: true,
    scanned: alerts.length,
    sent: 0,
    skipped: 0,
    failed: 0,
    matchedJobs: 0,
    dryRun,
    results: [],
  }

  const byUser = new Map<string, AlertMatches[]>()

  for (const row of alerts) {
    const matches = await findMatchesForAlert(row)
    summary.matchedJobs += matches.length

    if (matches.length === 0) {
      summary.skipped += 1
      summary.results.push({
        alertId: row.alert.id,
        email: row.user.email,
        searchTerm: row.alert.searchTerm,
        matches: 0,
        status: 'skipped',
      })
      continue
    }

    if (dryRun) {
      summary.results.push({
        alertId: row.alert.id,
        email: row.user.email,
        searchTerm: row.alert.searchTerm,
        matches: matches.length,
        status: 'dry-run',
      })
      continue
    }

    const existing = byUser.get(row.user.id) ?? []
    existing.push({ row, matches })
    byUser.set(row.user.id, existing)
  }

  if (dryRun) {
    return summary
  }

  for (const items of byUser.values()) {
    try {
      const resendEmailId = await sendDigestEmail(items)
      const sentAt = new Date()

      for (const item of items) {
        await db.insert(jobAlertLog).values({
          alertId: item.row.alert.id,
          userId: item.row.user.id,
          jobCount: item.matches.length,
          jobIds: item.matches.map((job) => job.id),
          status: 'sent',
          resendEmailId,
          sentAt,
        })

        await db
          .update(jobAlerts)
          .set({ lastNotifiedAt: sentAt, updatedAt: sentAt })
          .where(eq(jobAlerts.id, item.row.alert.id))

        summary.sent += 1
        summary.results.push({
          alertId: item.row.alert.id,
          email: item.row.user.email,
          searchTerm: item.row.alert.searchTerm,
          matches: item.matches.length,
          status: 'sent',
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email error'

      for (const item of items) {
        await db.insert(jobAlertLog).values({
          alertId: item.row.alert.id,
          userId: item.row.user.id,
          jobCount: item.matches.length,
          jobIds: item.matches.map((job) => job.id),
          status: 'failed',
        })

        summary.failed += 1
        summary.results.push({
          alertId: item.row.alert.id,
          email: item.row.user.email,
          searchTerm: item.row.alert.searchTerm,
          matches: item.matches.length,
          status: 'failed',
          error: message,
        })
      }
    }
  }

  return summary
}