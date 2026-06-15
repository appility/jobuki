import type { ActionFunctionArgs } from 'react-router'
import { getDb, jobs, savedJobs } from '@jobuki/db'
import { and, eq } from 'drizzle-orm'
import { requireUser } from '../../../lib/auth.server'

function getDbErrorMessage(error: unknown) {
  const code = (error as { code?: string } | null)?.code
  if (code === '42P01') {
    return { status: 503, message: 'Save jobs is temporarily unavailable. Please try again in a moment.' }
  }
  return { status: 500, message: 'Unable to update saved jobs right now. Please try again.' }
}

export async function action(args: ActionFunctionArgs) {
  let user: Awaited<ReturnType<typeof requireUser>>
  try {
    user = await requireUser(args)
  } catch {
    return Response.json({ ok: false, error: 'Sign in to save jobs.', unauthenticated: true }, { status: 401 })
  }

  const form = await args.request.formData()
  const jobId = String(form.get('jobId') ?? '').trim()
  const boardIdInput = String(form.get('boardId') ?? '').trim()
  const intent = String(form.get('intent') ?? 'save')

  if (!jobId) {
    return Response.json({ ok: false, error: 'Missing jobId.' }, { status: 400 })
  }

  const db = getDb()

  if (intent === 'unsave') {
    try {
      await db.delete(savedJobs).where(
        and(eq(savedJobs.userId, user.id), eq(savedJobs.jobId, jobId))
      )
      return Response.json({ ok: true, saved: false })
    } catch (error) {
      const { status, message } = getDbErrorMessage(error)
      return Response.json({ ok: false, error: message }, { status })
    }
  }

  let boardId = boardIdInput
  if (!boardId) {
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, jobId),
      columns: { boardId: true },
    })
    boardId = job?.boardId ?? ''
  }

  if (!boardId) {
    return Response.json({ ok: false, error: 'Missing boardId for save operation.' }, { status: 400 })
  }

  try {
    await db
      .insert(savedJobs)
      .values({ userId: user.id, jobId, boardId })
      .onConflictDoNothing()
  } catch (error) {
    const { status, message } = getDbErrorMessage(error)
    return Response.json({ ok: false, error: message }, { status })
  }

  return Response.json({ ok: true, saved: true })
}
