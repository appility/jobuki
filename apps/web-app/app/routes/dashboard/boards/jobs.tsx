import { useLoaderData, useActionData, Form, useNavigation, Link } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace } from '../../../lib/auth.server'
import { getDb, jobs, jobBoardListings } from '@jobuki/db'
import { eq } from 'drizzle-orm'
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

  // Fetch all job listings for this board with their job details
  const listings = await db.query.jobBoardListings.findMany({
    where: eq(jobBoardListings.boardId, board.id),
    with: {
      job: true,
    },
    orderBy: (l) => [l.createdAt],
  })

  return { board, listings }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace, user } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const db = getDb()

  const form = await args.request.formData()
  const intent = form.get('intent') as string
  const jobId = form.get('jobId') as string

  if (intent === 'delete_job') {
    // Check if listing exists for this board
    const listing = await db.query.jobBoardListings.findFirst({
      where: eq(jobBoardListings.id, form.get('listingId') as string),
      with: { job: true },
    })

    if (!listing || listing.boardId !== board.id) {
      return { ok: false, error: 'Job listing not found on this board.' }
    }

    const job = listing.job
    const isImported = listing.imported
    const isAdmin = user.isPlatformAdmin

    // Regular users can only delete native jobs
    // Admins can delete any job (but this removes it from all boards if it's the last listing)
    if (isImported && !isAdmin) {
      return { ok: false, error: 'You can only delete imported jobs as a platform admin.' }
    }

    // Delete the listing
    await db.delete(jobBoardListings).where(eq(jobBoardListings.id, listing.id))

    // If this was the last listing for this job, delete the job itself
    const remainingListings = await db.query.jobBoardListings.findFirst({
      where: eq(jobBoardListings.jobId, jobId),
    })

    if (!remainingListings) {
      await db.delete(jobs).where(eq(jobs.id, jobId))
    }

    return { ok: true, message: `Deleted "${job.title}"` }
  }

  return { ok: false }
}

const REMOTE_LABEL: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }
const TYPE_LABEL: Record<string, string> = { 'full-time': 'Full-time', 'part-time': 'Part-time', contract: 'Contract', freelance: 'Freelance', internship: 'Internship' }

export default function BoardJobs() {
  const { board, listings } = useLoaderData<typeof loader>()
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
            {listings.length} {listings.length === 1 ? 'job' : 'jobs'} on this board
          </p>
        </div>
        <Link to={`/dashboard/boards/${board.id}/import`} className="btn-primary text-sm">
          Import jobs
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-xl border p-8 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <p style={{ color: 'var(--color-text-muted)' }}>No jobs yet. Start by importing or creating one.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map((listing) => {
            const job = listing.job
            return (
              <div key={listing.id} className="rounded-lg border p-4 flex items-start justify-between gap-4"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {job.title}
                  </p>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {[job.company, job.location].filter(Boolean).join(' · ')}
                  </p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {listing.imported && (
                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)' }}>
                        Imported
                      </span>
                    )}
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
                      {listing.status}
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
                      <input type="hidden" name="listingId" value={listing.id} />
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
            )
          })}
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
