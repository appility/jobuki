import { getDb, applications } from '@jobuki/db'
import { and, count, eq, gte } from 'drizzle-orm'
import type { JobSeekerTier } from './auth.server'

type LimitStatus = {
  tier: JobSeekerTier
  cap: number
  used: number
  remaining: number
  isCapped: boolean
}

function getMonthlyWindowDays() {
  const parsed = Number(process.env.JOB_SEEKER_APPLICATION_CAP_WINDOW_DAYS ?? 30)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 30
}

function getCapForTier(tier: JobSeekerTier) {
  const freeCap = Number(process.env.JOB_SEEKER_FREE_APPLICATION_CAP ?? 10)
  const paidCap = Number(process.env.JOB_SEEKER_PAID_APPLICATION_CAP ?? 60)
  const rawCap = tier === 'paid' ? paidCap : freeCap
  return Number.isFinite(rawCap) && rawCap > 0 ? Math.floor(rawCap) : (tier === 'paid' ? 60 : 10)
}

export async function getApplicationLimitStatus(candidateEmail: string, tier: JobSeekerTier): Promise<LimitStatus> {
  const db = getDb()
  const days = getMonthlyWindowDays()
  const cap = getCapForTier(tier)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const [row] = await db
    .select({ total: count() })
    .from(applications)
    .where(and(eq(applications.candidateEmail, candidateEmail), gte(applications.createdAt, since)))

  const used = Number(row?.total ?? 0)
  const remaining = Math.max(cap - used, 0)

  return {
    tier,
    cap,
    used,
    remaining,
    isCapped: used >= cap,
  }
}