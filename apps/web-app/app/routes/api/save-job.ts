import type { ActionFunctionArgs } from 'react-router'
import { getDb, savedJobs } from '@jobuki/db'
import { and, eq } from 'drizzle-orm'
import { requireUser } from '../../lib/auth.server'

export async function action(args: ActionFunctionArgs) {
  let user: Awaited<ReturnType<typeof requireUser>>
  try {
    user = await requireUser(args)
  } catch {
    return Response.json({ ok: false, error: 'Sign in to save jobs.' }, { status: 401 })
  }

  const form = await args.request.formData()
  const jobId   = String(form.get('jobId') ?? '').trim()
  const boardId = String(form.get('boardId') ?? '').trim()
  const intent  = String(form.get('intent') ?? 'save')

  if (!jobId || !boardId) {
    return Response.json({ ok: false, error: 'Missing jobId or boardId.' }, { status: 400 })
  }

  const db = getDb()

  if (intent === 'unsave') {
    await db.delete(savedJobs).where(
      and(eq(savedJobs.userId, user.id), eq(savedJobs.jobId, jobId))
    )
    return Response.json({ ok: true, saved: false })
  }

  await db
    .insert(savedJobs)
    .values({ userId: user.id, jobId, boardId })
    .onConflictDoNothing()

  return Response.json({ ok: true, saved: true })
}
