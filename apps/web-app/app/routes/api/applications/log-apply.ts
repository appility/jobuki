import type { ActionFunctionArgs } from 'react-router'
import { getDb, applications, candidateProfiles } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { getJobSeekerTier, getOptionalUser } from '../../../lib/auth.server'
import { getApplicationLimitStatus } from '../../../lib/job-seeker-limits.server'

export async function action(args: ActionFunctionArgs) {
  const user = await getOptionalUser(args.request)
  const form = await args.request.formData()
  const jobId   = String(form.get('jobId') ?? '').trim()
  const boardId = String(form.get('boardId') ?? '').trim()

  if (!jobId || !boardId) {
    return Response.json({ ok: false }, { status: 400 })
  }

  // Only log if signed in — anonymous external applies can't be tracked
  if (!user) return Response.json({ ok: true, logged: false })

  const db = getDb()
  const tier = await getJobSeekerTier(user)
  const limit = await getApplicationLimitStatus(user.email, tier)
  if (limit.isCapped) {
    return Response.json({ ok: true, logged: false, capped: true })
  }

  const profile = await db.query.candidateProfiles.findFirst({
    where: eq(candidateProfiles.userId, user.id),
  })

  // Don't duplicate — check if already applied
  const existing = await db.query.applications.findFirst({
    where: (t, { and, eq }) => and(eq(t.jobId, jobId), eq(t.candidateEmail, user.email)),
  })
  if (existing) return Response.json({ ok: true, logged: false })

  await db.insert(applications).values({
    jobId,
    boardId,
    candidateName:  profile?.name ?? user.name ?? 'Unknown',
    candidateEmail: user.email,
    cvUrl:          profile?.cvUrl ?? null,
    linkedinUrl:    profile?.linkedinUrl ?? null,
    coverLetter:    null,
  })

  return Response.json({ ok: true, logged: true })
}
