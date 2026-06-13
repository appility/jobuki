import { useLoaderData, Form, useSearchParams, Link } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess } from '../../../lib/auth.server'
import { getDb, applications, jobs, boards, applicationStatusHistory } from '@jobuki/db'
import { eq, and } from 'drizzle-orm'

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
  const { jobId } = args.params
  const db = getDb()
  const url = new URL(args.request.url)
  const statusFilter = url.searchParams.get('status') || 'new'

  // Fetch job and verify it belongs to workspace
  const [job] = await db
    .select()
    .from(jobs)
    .innerJoin(boards, eq(jobs.boardId, boards.id))
    .where(and(eq(jobs.id, jobId!), eq(boards.workspaceId, workspace.id)))

  if (!job) {
    throw new Response('Not found', { status: 404 })
  }

  // Fetch applications for this job
  const rows = await db
    .select({
      application: applications,
    })
    .from(applications)
    .where(eq(applications.jobId, jobId!))

  // Count per status
  const counts = Object.fromEntries(
    STATUS_OPTIONS.map(s => [s, rows.filter(r => r.application.status === s).length])
  )

  // Filter by status
  const filtered = rows
    .filter(r => r.application.status === statusFilter)
    .map(r => r.application)

  return { job: job.jobs, applications: filtered, counts, statusFilter }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const { jobId } = args.params
  const form = await args.request.formData()
  const applicationId = form.get('applicationId') as string
  const status = form.get('status') as string
  const note = form.get('note') as string || ''
  const userId = workspace.ownerUserId || 'unknown'
  const db = getDb()

  // Verify application belongs to this job and workspace
  const [row] = await db
    .select({ application: applications })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(boards, eq(jobs.boardId, boards.id))
    .where(
      and(
        eq(applications.id, applicationId),
        eq(applications.jobId, jobId!),
        eq(boards.workspaceId, workspace.id)
      )
    )

  if (!row) {
    throw new Response('Not found', { status: 404 })
  }

  // Update application status
  await db.update(applications)
    .set({ status: status as any, updatedAt: new Date() })
    .where(eq(applications.id, applicationId))

  // Insert status history record
  await db.insert(applicationStatusHistory).values({
    applicationId,
    status: status as any,
    changedByUserId: userId,
    note: note || undefined,
  })

  return { ok: true }
}

export default function JobApplicationsPipeline() {
  const { job, applications: apps, counts, statusFilter } = useLoaderData<typeof loader>()
  const [searchParams, setSearchParams] = useSearchParams()

  return (
    <div className="w-full p-8 max-w-6xl">
      {/* Breadcrumb */}
      <div className="mb-8">
        <Link to="/admin/applications" className="text-xs no-underline mb-4 inline-block"
          style={{ color: 'var(--color-primary)' }}>
          ← Back to applications
        </Link>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
          {job.title}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Application pipeline
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setSearchParams({ status: s })}
            className={`text-xs px-3 py-2 rounded whitespace-nowrap font-medium transition-colors ${
              statusFilter === s ? 'opacity-100' : 'opacity-60 hover:opacity-80'
            }`}
            style={{
              backgroundColor: statusFilter === s ? 'var(--color-primary)' : 'transparent',
              color: statusFilter === s ? 'white' : 'var(--color-text-secondary)',
              border: statusFilter !== s ? '1px solid var(--color-border)' : 'none',
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s as ApplicationStatus]})
          </button>
        ))}
      </div>

      {/* Applications list */}
      {apps.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">◎</p>
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            No applications in this stage
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Applications will appear here as they move through the pipeline.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {apps.map(application => {
            const style = STATUS_STYLE[application.status as ApplicationStatus] ?? STATUS_STYLE.new
            return (
              <Link key={application.id} to={`/admin/applications/${job.id}/${application.id}`}
                className="card p-4 no-underline hover:opacity-80 transition-opacity">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {application.candidateName}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{ backgroundColor: style.bg, color: style.text }}>
                        {application.status}
                      </span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {application.candidateEmail}
                      {application.candidatePhone && ` · ${application.candidatePhone}`}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      Applied {new Date(application.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor"
                    style={{ color: 'var(--color-text-muted)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
