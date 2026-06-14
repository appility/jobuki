import { useLoaderData, Form, Link, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { useState } from 'react'
import { requireWorkspaceAccess } from '../../../../lib/auth.server'
import { getDb, applications, jobs, boards, applicationStatusHistory, applicationNotes } from '@jobuki/db'
import { eq, and, desc } from 'drizzle-orm'
import { CvPreviewModal } from '../../../../components/cv-preview-modal'
import { publicJobPath } from '../../../../lib/public-job-path'

type ApplicationStatus = 'new' | 'reviewing' | 'shortlisted' | 'rejected' | 'hired'

const STATUS_OPTIONS: ApplicationStatus[] = ['new', 'reviewing', 'shortlisted', 'rejected', 'hired']

const STATUS_STYLE: Record<ApplicationStatus, { bg: string; text: string }> = {
  new:         { bg: 'var(--color-surface-subtle)', text: 'var(--color-text-secondary)' },
  reviewing:   { bg: '#EFF6FF', text: '#1D4ED8' },
  shortlisted: { bg: '#F0FDF4', text: '#15803D' },
  rejected:    { bg: 'var(--color-danger-bg)', text: 'var(--color-danger)' },
  hired:       { bg: '#F0FDF4', text: '#15803D' },
}

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const { jobId, applicationId } = args.params
  const db = getDb()

  try {
    // Fetch application with job and board
    const [row] = await db
      .select({
        application: applications,
        job: jobs,
        board: boards,
      })
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(boards, eq(jobs.boardId, boards.id))
      .where(
        and(
          eq(applications.id, applicationId!),
          eq(applications.jobId, jobId!),
          eq(boards.workspaceId, workspace.id)
        )
      )

    if (!row) {
      throw new Response('Not found', { status: 404 })
    }

    // Fetch status history (newest first) — table may not exist yet
    let history: any[] = []
    try {
      history = await db
        .select()
        .from(applicationStatusHistory)
        .where(eq(applicationStatusHistory.applicationId, applicationId!))
        .orderBy(desc(applicationStatusHistory.createdAt))
    } catch (err: any) {
      if (err?.code !== '42P01') throw err
    }

    // Fetch notes (newest first) — table may not exist yet
    let notes: any[] = []
    try {
      notes = await db
        .select()
        .from(applicationNotes)
        .where(eq(applicationNotes.applicationId, applicationId!))
        .orderBy(desc(applicationNotes.createdAt))
    } catch (err: any) {
      if (err?.code !== '42P01') throw err
    }

    return {
      application: row.application,
      job: row.job,
      board: row.board,
      history,
      notes,
    }
  } catch (err) {
    console.error('[app-detail-loader]', err)
    throw err
  }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const { jobId, applicationId } = args.params
  const form = await args.request.formData()
  const intent = form.get('intent') as string
  const db = getDb()
  const userId = workspace.ownerUserId || 'unknown'

  try {
    // Verify application belongs to this job and workspace
    const [row] = await db
      .select()
      .from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(boards, eq(jobs.boardId, boards.id))
      .where(
        and(
          eq(applications.id, applicationId!),
          eq(applications.jobId, jobId!),
          eq(boards.workspaceId, workspace.id)
        )
      )

    if (!row) {
      throw new Response('Not found', { status: 404 })
    }

    if (intent === 'update_status') {
      const status = form.get('status') as string
      const note = form.get('note') as string || ''

      // Update application status
      await db.update(applications)
        .set({ status: status as any, updatedAt: new Date() })
        .where(eq(applications.id, applicationId!))

      // Insert status history record — table may not exist yet
      try {
        await db.insert(applicationStatusHistory).values({
          applicationId: applicationId!,
          status: status as any,
          changedByUserId: userId,
          note: note || undefined,
        })
      } catch (err: any) {
        if (err?.code !== '42P01') throw err
        console.warn('[action] application_status_history table does not exist yet')
      }
    } else if (intent === 'add_note') {
      const body = form.get('note') as string
      if (body?.trim()) {
        try {
          await db.insert(applicationNotes).values({
            applicationId: applicationId!,
            authorUserId: userId,
            body: body.trim(),
          })
        } catch (err: any) {
          if (err?.code !== '42P01') throw err
          console.warn('[action] application_notes table does not exist yet')
        }
      }
    }

    return { ok: true }
  } catch (err) {
    console.error('[app-detail-action]', err)
    throw err
  }
}

export default function ApplicationDetail() {
  const { application, job, board, history, notes } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const [showCvModal, setShowCvModal] = useState(false)

  const appStyle = STATUS_STYLE[application.status as ApplicationStatus] ?? STATUS_STYLE.new

  return (
    <div className="w-full p-8 max-w-6xl">
      {/* Breadcrumb */}
      <Link to={`/dashboard/applications/${job.id}`} className="text-xs no-underline mb-4 inline-block"
        style={{ color: 'var(--color-primary)' }}>
        ← Back to {job.title}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Candidate header */}
          <div className="card p-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {application.candidateName}
                </h1>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {application.candidateEmail}
                </p>
                {application.candidatePhone && (
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    {application.candidatePhone}
                  </p>
                )}
                <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
                  Applied {new Date(application.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className="text-xs px-3 py-1 rounded-full font-medium capitalize"
                style={{ backgroundColor: appStyle.bg, color: appStyle.text }}>
                {application.status}
              </span>
            </div>
          </div>

          {/* Cover letter */}
          {application.coverLetter && (
            <div className="card p-6">
              <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
                Cover Letter
              </h2>
              <p className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{ color: 'var(--color-text-secondary)' }}>
                {application.coverLetter}
              </p>
            </div>
          )}

          {/* CV preview */}
          {application.cvUrl && (
            <div className="card p-6">
              <button
                onClick={() => setShowCvModal(true)}
                className="text-sm font-medium no-underline inline-flex items-center gap-2 bg-none border-none p-0"
                style={{ color: 'var(--color-primary)', cursor: 'pointer' }}>
                View CV
              </button>
            </div>
          )}

          {/* Notes section */}
          <div className="card p-6">
            <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Internal Notes
            </h2>

            {/* Existing notes */}
            {notes.length > 0 && (
              <div className="space-y-3 mb-6">
                {notes.map(note => (
                  <div key={note.id} className="border-l-2 pl-4"
                    style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {note.body}
                    </p>
                    <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                      {new Date(note.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Add note form */}
            <Form method="post" className="space-y-3">
              <input type="hidden" name="intent" value="add_note" />
              <textarea
                name="note"
                placeholder="Add a private note..."
                className="input text-sm p-3 min-h-20 resize-none"
                required
              />
              <button
                type="submit"
                className="btn-primary text-xs py-2 px-4"
                disabled={navigation.state === 'submitting'}
              >
                {navigation.state === 'submitting' ? 'Adding...' : 'Add note'}
              </button>
            </Form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status selector */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Status
            </h3>
            <Form method="post" className="space-y-3">
              <input type="hidden" name="intent" value="update_status" />
              <select
                name="status"
                defaultValue={application.status}
                className="input text-sm w-full"
                onChange={(e) => {
                  const textarea = e.currentTarget.parentElement?.parentElement?.querySelector('textarea')
                  if (textarea) textarea.focus()
                }}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
              <textarea
                name="note"
                placeholder="Optional: reason for status change..."
                className="input text-sm p-3 text-xs resize-none"
                rows={2}
              />
              <button
                type="submit"
                className="btn-primary text-xs py-2 w-full"
                disabled={navigation.state === 'submitting'}
              >
                {navigation.state === 'submitting' ? 'Updating...' : 'Update status'}
              </button>
            </Form>
          </div>

          {/* Status history timeline */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              Status History
            </h3>
            {history.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                No history yet
              </p>
            ) : (
              <div className="space-y-3">
                {history.map((entry, idx) => {
                  const style = STATUS_STYLE[entry.status as ApplicationStatus]
                  const isFirst = idx === 0
                  return (
                    <div key={entry.id} className="relative">
                      {!isFirst && (
                        <div className="absolute left-4 top-8 w-0.5 h-4 -ml-1"
                          style={{ backgroundColor: 'var(--color-border)' }} />
                      )}
                      <div className="flex gap-3">
                        <div className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                          style={{ backgroundColor: style.bg }} />
                        <div className="min-w-0">
                          <p className="text-xs font-medium"
                            style={{ color: 'var(--color-text-secondary)' }}>
                            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                          </p>
                          {entry.note && (
                            <p className="text-xs mt-1"
                              style={{ color: 'var(--color-text-muted)' }}>
                              {entry.note}
                            </p>
                          )}
                          <p className="text-xs mt-1"
                            style={{ color: 'var(--color-text-muted)' }}>
                            {new Date(entry.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Job info */}
          <div className="card p-6">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
              Job
            </h3>
            <p className="text-sm font-medium"
              style={{ color: 'var(--color-text-secondary)' }}>
              {job.title}
            </p>
            <p className="text-xs mt-2"
              style={{ color: 'var(--color-text-muted)' }}>
              on {board.name}
            </p>
            <Link to={publicJobPath(job)}
              target="_blank"
              className="text-xs no-underline mt-3 inline-block font-medium"
              style={{ color: 'var(--color-primary)' }}>
              View job →
            </Link>
          </div>
        </div>
      </div>

      {/* CV Preview Modal */}
      {application.cvUrl && (
        <CvPreviewModal
          isOpen={showCvModal}
          cvUrl={application.cvUrl}
          candidateName={application.candidateName}
          onClose={() => setShowCvModal(false)}
        />
      )}
    </div>
  )
}
