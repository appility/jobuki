import type { jobs, candidateProfiles } from '@jobuki/db'
import { generateApplyContent } from './apply-ai.server'

export type ApplyAiContent = Awaited<ReturnType<typeof generateApplyContent>>

const APPLY_AI_CACHE_TTL_MS = 1000 * 60 * 60 * 12
const APPLY_AI_CACHE_MAX_ENTRIES = 500

const applyAiCache = new Map<string, { expiresAt: number; content: ApplyAiContent }>()
const inflightApplyAi = new Map<string, Promise<ApplyAiContent>>()

type JobRow = typeof jobs.$inferSelect
type ProfileRow = typeof candidateProfiles.$inferSelect

export function buildApplyAiCacheKey(userId: string, job: JobRow, profile: ProfileRow) {
  return [
    userId,
    job.id,
    String(job.updatedAt.getTime()),
    String(profile.updatedAt.getTime()),
    profile.name ?? '',
    profile.headline ?? '',
    profile.bio ?? '',
    (profile.skills ?? []).join(','),
    profile.cvUrl ?? '',
  ].join('|')
}

export function readApplyAiCache(key: string): ApplyAiContent | null {
  const cached = applyAiCache.get(key)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    applyAiCache.delete(key)
    return null
  }
  return cached.content
}

export function writeApplyAiCache(key: string, content: ApplyAiContent) {
  applyAiCache.set(key, { content, expiresAt: Date.now() + APPLY_AI_CACHE_TTL_MS })
  pruneApplyAiCache()
}

function pruneApplyAiCache() {
  if (applyAiCache.size <= APPLY_AI_CACHE_MAX_ENTRIES) return

  for (const [entryKey, value] of applyAiCache.entries()) {
    if (value.expiresAt <= Date.now()) applyAiCache.delete(entryKey)
  }

  while (applyAiCache.size > APPLY_AI_CACHE_MAX_ENTRIES) {
    const oldestKey = applyAiCache.keys().next().value
    if (!oldestKey) break
    applyAiCache.delete(oldestKey)
  }
}

export function clearApplyAiCacheForUser(userId: string) {
  const prefix = `${userId}|`
  for (const key of applyAiCache.keys()) {
    if (key.startsWith(prefix)) applyAiCache.delete(key)
  }
}

export async function getOrGenerateApplyAiContent(key: string, factory: () => Promise<ApplyAiContent>) {
  const cached = readApplyAiCache(key)
  if (cached) return cached

  const existingInflight = inflightApplyAi.get(key)
  if (existingInflight) return existingInflight

  const next = factory()
    .then((content) => {
      writeApplyAiCache(key, content)
      return content
    })
    .finally(() => {
      inflightApplyAi.delete(key)
    })

  inflightApplyAi.set(key, next)
  return next
}