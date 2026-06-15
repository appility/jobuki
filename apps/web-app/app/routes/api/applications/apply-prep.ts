import type { LoaderFunctionArgs } from 'react-router'
import { getDb, jobs, candidateProfiles } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { getJobSeekerTier, requireUser } from '../../../lib/auth.server'
import { deriveJobCategory } from '../../../lib/board-categories'
import { parseCvFromUrl } from '../../../lib/cv-parser.server'
import { generateApplyContent } from '../../../lib/apply-ai.server'
import { buildApplyAiCacheKey, getOrGenerateApplyAiContent, readApplyAiCache } from '../../../lib/apply-prep-cache.server'
import { getApplicationLimitStatus } from '../../../lib/job-seeker-limits.server'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args, { type: 'job-seeker' })
  const db = getDb()
  const url = new URL(args.request.url)
  const jobId = url.searchParams.get('jobId')

  const tier = await getJobSeekerTier(user)
  if (tier !== 'paid') {
    return Response.json({ ok: false, error: 'AI prep is not available on your current plan.' }, { status: 403 })
  }

  const limit = await getApplicationLimitStatus(user.email, tier)
  if (limit.isCapped) {
    return Response.json({ ok: false, error: 'Application limit reached for this period.' }, { status: 429 })
  }

  if (!jobId) {
    return Response.json({ ok: false, error: 'Missing jobId' }, { status: 400 })
  }

  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) })
  if (!job || job.status !== 'published') {
    return Response.json({ ok: false, error: 'Not found' }, { status: 404 })
  }

  const profile = await db.query.candidateProfiles.findFirst({
    where: eq(candidateProfiles.userId, user.id),
  })

  if (!profile && job.applicationTips) {
    return Response.json({
      ok: true,
      source: 'job-cache',
      aiContent: { tips: job.applicationTips.tips, coverLetter: undefined, matchSummary: undefined },
    })
  }

  if (profile) {
    const cacheKey = buildApplyAiCacheKey(user.id, job, profile)
    const cached = readApplyAiCache(cacheKey)
    if (cached) {
      return Response.json({ ok: true, source: 'memory-cache', aiContent: cached })
    }

    const aiContent = await getOrGenerateApplyAiContent(cacheKey, async () => {
      const cvText = profile.cvUrl ? await parseCvFromUrl(profile.cvUrl) : null
      return generateApplyContent(
        {
          title: job.title,
          company: job.company,
          description: job.description,
          requirements: job.requirements,
          category: deriveJobCategory(job, []),
        },
        {
          name: profile.name,
          headline: profile.headline,
          bio: profile.bio,
          skills: profile.skills ?? [],
          cvText,
        }
      )
    })

    return Response.json({ ok: true, source: 'generated', aiContent })
  }

  const aiContent = await generateApplyContent(
    {
      title: job.title,
      company: job.company,
      description: job.description,
      requirements: job.requirements,
      category: deriveJobCategory(job, []),
    },
    undefined
  )

  if (aiContent.tips.length > 0) {
    await db.update(jobs)
      .set({ applicationTips: { tips: aiContent.tips, generatedAt: new Date().toISOString() } })
      .where(eq(jobs.id, job.id))
  }

  return Response.json({ ok: true, source: 'generated', aiContent })
}