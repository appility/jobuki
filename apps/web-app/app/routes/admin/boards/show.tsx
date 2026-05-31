import { useState } from 'react'
import { useLoaderData, useActionData, Link, Form, useNavigation, redirect } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace } from '../../../lib/auth.server'
import { getDb, boards, jobs } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { boardUrl } from '../../../lib/board-url'
import { removeCustomDomain } from '../../../lib/railway'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const db = getDb()

  const boardJobs = await db.query.jobs.findMany({
    where: eq(jobs.boardId, board.id),
    orderBy: (j, { desc }) => [desc(j.createdAt)],
  })

  return { board, jobs: boardJobs, publicUrl: boardUrl(board.slug, board.customDomain) }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const form = await args.request.formData()
  const intent = form.get('intent') as string
  const db = getDb()

  if (intent === 'toggle_status') {
    const next = board.status === 'live' ? 'draft' : 'live'
    await db.update(boards).set({ status: next, updatedAt: new Date() }).where(eq(boards.id, board.id))
    return { ok: true }
  }

  if (intent === 'delete_board') {
    const confirmSlug = String(form.get('confirmSlug') ?? '').trim().toLowerCase()
    if (confirmSlug !== board.slug.toLowerCase()) {
      return { ok: false, error: `Type "${board.slug}" to confirm deletion.` }
    }

    // Best-effort Railway cleanup; board deletion should not fail on external API issues.
    if (board.railwayDomainId) {
      await removeCustomDomain(board.railwayDomainId).catch(() => null)
    }

    await db.delete(boards).where(eq(boards.id, board.id))
    throw redirect('/dashboard/boards')
  }

  return { ok: false }
}

const JOB_STATUS_COLOR: Record<string, string> = {
  draft:     'var(--color-text-muted)',
  published: 'var(--color-success)',
  closed:    'var(--color-danger)',
}

export default function BoardShow() {
  const { board, jobs: boardJobs, publicUrl } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const [confirmSlug, setConfirmSlug] = useState('')
  const submitting = navigation.state === 'submitting'
  const deleting = submitting && navigation.formData?.get('intent') === 'delete_board'

  return (
    <div className="p-10 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <Link to="/dashboard/boards" className="text-sm no-underline block mb-2"
            style={{ color: 'var(--color-text-muted)' }}>
            ← Boards
          </Link>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            {board.name}
          </h1>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs no-underline" style={{ color: 'var(--color-primary)' }}>
            {publicUrl} ↗
          </a>
        </div>
        <div className="flex gap-2">
          <Link to={`/dashboard/boards/${board.id}/domain`} className="btn-outline text-sm">
            Domain
          </Link>
          <Link to={`/dashboard/appearance/${board.id}`} className="btn-outline text-sm">
            Appearance
          </Link>
          <Form method="post">
            <input type="hidden" name="intent" value="toggle_status" />
            <button
              type="submit"
              disabled={submitting}
              className={board.status === 'live' ? 'btn-outline text-sm' : 'btn-primary text-sm'}
            >
              {board.status === 'live' ? 'Unpublish' : 'Publish'}
            </button>
          </Form>
        </div>
      </div>

      {/* Status */}
      <div className="mb-8 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: board.status === 'live' ? 'var(--color-success-bg)' : 'var(--color-surface-subtle)',
            color: board.status === 'live' ? 'var(--color-success)' : 'var(--color-text-muted)',
          }}>
          {board.status === 'live' ? '● Live' : '○ Draft'}
        </span>
        {board.description && (
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {board.description}
          </span>
        )}
      </div>

      {/* Jobs */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Jobs ({boardJobs.length})
        </h2>
        <Link to={`/dashboard/jobs/new?boardId=${board.id}`} className="btn-primary text-sm">
          + Post a job
        </Link>
      </div>

      {boardJobs.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            No jobs yet. Post your first role.
          </p>
          <Link to={`/dashboard/jobs/new?boardId=${board.id}`} className="btn-primary text-sm">
            Post a job
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {boardJobs.map(job => (
            <div key={job.id} className="card p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {job.title}
                  </span>
                  <span className="text-xs capitalize"
                    style={{ color: JOB_STATUS_COLOR[job.status] ?? 'var(--color-text-muted)' }}>
                    {job.status}
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {[job.location, job.remotePolicy, job.employmentType].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Link to={`/dashboard/jobs/${job.id}`} className="btn-outline text-sm">
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Settings */}
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="card p-5">
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Board settings
          </h3>
          <div className="space-y-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <p><strong>Slug:</strong> {board.slug}</p>
            <p><strong>Status:</strong> {board.status}</p>
            <p><strong>Public URL:</strong> {publicUrl.replace(/^https?:\/\//, '')}</p>
          </div>
          <div className="mt-4 flex gap-2">
            <Link to={`/dashboard/appearance/${board.id}`} className="btn-outline text-sm">
              Appearance
            </Link>
            <Link to={`/dashboard/boards/${board.id}/domain`} className="btn-outline text-sm">
              Domains
            </Link>
          </div>
        </section>

        <section className="card p-5" style={{ borderColor: 'var(--color-danger)' }}>
          <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--color-danger)' }}>
            Danger zone
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Deleting this board is permanent. Jobs, applications, and domain settings for this board will be removed.
          </p>

          {actionData?.error && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs"
              style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              {actionData.error}
            </div>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="btn-outline text-sm"
                style={{
                  color: 'var(--color-danger)',
                  borderColor: 'var(--color-danger)',
                }}
              >
                Delete board
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Delete board permanently?
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                This removes the board, all jobs, applications, and connected domain settings. This cannot be undone.
              </AlertDialogDescription>

              <Form method="post" className="mt-4 space-y-2">
                <input type="hidden" name="intent" value="delete_board" />
                <label className="block text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Type <span className="font-mono">{board.slug}</span> to confirm
                </label>
                <input
                  name="confirmSlug"
                  value={confirmSlug}
                  onChange={(e) => setConfirmSlug(e.currentTarget.value)}
                  className="input w-full"
                  placeholder={board.slug}
                  autoComplete="off"
                  spellCheck={false}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <button type="button" className="btn-outline text-sm">Cancel</button>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild className="disabled:opacity-60">
                    <button
                      type="submit"
                      disabled={deleting || confirmSlug.trim().toLowerCase() !== board.slug.toLowerCase()}
                      className="w-full"
                    >
                      {deleting ? 'Deleting…' : 'Delete board'}
                    </button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </Form>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
    </div>
  )
}
