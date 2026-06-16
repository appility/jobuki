import { useLoaderData, useActionData, Form, useNavigation, Link } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace } from '../../../lib/auth.server'
import { getDb, jobs, boards, jobBoardListings } from '@jobuki/db'
import { eq, and } from 'drizzle-orm'
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger,
} from '../../../components/ui/alert-dialog'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const db = getDb()

  const boardJobs = await db
    .select({ id: jobs.id, title: jobs.title, company: jobs.company, location: jobs.location, remotePolicy: jobs.remotePolicy, employmentType: jobs.employmentType, createdAt: jobs.createdAt, status: jobBoardListings.status })
    .from(jobs)
    .innerJoin(jobBoardListings, eq(jobs.id, jobBoardListings.jobId))
    .where(eq(jobBoardListings.boardId, board.id))

  return { board, jobs: boardJobs }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const db = getDb()

  const form = await args.request.formData()
  const intent = form.get('intent') as string
  const jobId = form.get('jobId') as string

  if (intent === 'delete_job') {
    const listing = await db.query.jobBoardListings.findFirst({
      where: and(eq(jobBoardListings.jobId, jobId), eq(jobBoardListings.boardId, board.id))
    })
    if (!listing) {
      return { ok: false, error: 'Job not found on this board.' }
    }
    const job = await db.query.jobs.findFirst({ where: eq(jobs.id, jobId) })
    await db.delete(jobBoardListings).where(and(eq(jobBoardListings.jobId, jobId), eq(jobBoardListings.boardId, board.id)))
    return { ok: true, message: `Deleted "${job?.title || 'Job'}"` }
  }

  return { ok: false }
}

const REMOTE_LABEL: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }
const TYPE_LABEL: Record<string, string> = { 'full-time': 'Full-time', 'part-time': 'Part-time', contract: 'Contract', freelance: 'Freelance', internship: 'Internship' }

export default function BoardJobs() {
  const { board, jobs: boardJobs } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'success' | 'error'; message: string }>>([])
  const submitting = navigation.state === 'submitting'

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  if (actionData && !actionData.ok && actionData.error) {
    pushToast('error', actionData.error)
  } else if (actionData && actionData.ok && actionData.message) {
    pushToast('success', actionData.message)
  }

  return (
    <div className="w-full p-8 max-w-4xl">
      <Link to={`/dashboard/boards/${board.id}`}
        className="text-sm no-underline block mb-4" style={{ color: 'var(--color-text-muted)' }}>
        ← {board.name}
      </Link>
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            Jobs
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {boardJobs.length} {boardJobs.length === 1 ? 'job' : 'jobs'} on this board
          </p>
        </div>
        <Link to={`/dashboard/boards/${board.id}/import`} className="btn-primary text-sm">
          Import jobs
        </Link>
      </div>

      {boardJobs.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>No jobs yet. Start by importing or creating one.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {boardJobs.map((job) => (
            <div key={job.id} className="rounded-lg border p-4 flex items-start justify-between gap-4"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {job.title}
                </p>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                  {[job.company, job.location].filter(Boolean).join(' · ')}
                </p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {job.remotePolicy && (
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)' }}>
                      {REMOTE_LABEL[job.remotePolicy] || job.remotePolicy}
                    </span>
                  )}
                  {job.employmentType && (
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)' }}>
                      {TYPE_LABEL[job.employmentType] || job.employmentType}
                    </span>
                  )}
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)' }}>
                    {job.status}
                  </span>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button type="button" className="shrink-0 p-2 rounded-lg hover:bg-opacity-80 transition"
                    style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-danger)' }}>
                    <Trash2 size={18} />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    Delete job?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    This will permanently remove "{job.title}" from {board.name}. This cannot be undone.
                  </AlertDialogDescription>
                  <Form method="post" className="mt-4">
                    <input type="hidden" name="intent" value="delete_job" />
                    <input type="hidden" name="jobId" value={job.id} />
                    <AlertDialogFooter>
                      <AlertDialogCancel asChild>
                        <button type="button" className="btn-outline text-sm">Cancel</button>
                      </AlertDialogCancel>
                      <button type="submit" disabled={submitting}
                        className="text-sm px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-60">
                        {submitting ? 'Deleting…' : 'Delete'}
                      </button>
                    </AlertDialogFooter>
                  </Form>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-72 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className="px-4 py-3 rounded-xl text-sm font-medium shadow-lg pointer-events-auto"
            style={{
              backgroundColor: toast.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              color: toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
              border: `1px solid ${toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
            }}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
