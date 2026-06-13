import { candidateProfiles, type Db } from '@jobuki/db'
import { eq, like } from 'drizzle-orm'

const SHORT_HANDLE_LENGTH = 10

export async function findPublicCandidateProfileByHandle(db: Db, handle: string) {
  const normalized = (handle ?? '').trim()
  if (!normalized) return null

  if (normalized.length > SHORT_HANDLE_LENGTH) {
    const profile = await db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.id, normalized),
    })
    return profile?.publicProfileEnabled ? profile : null
  }

  const rows = await db
    .select()
    .from(candidateProfiles)
    .where(like(candidateProfiles.id, `${normalized}%`))
    .limit(2)

  if (rows.length !== 1) return null
  return rows[0].publicProfileEnabled ? rows[0] : null
}
