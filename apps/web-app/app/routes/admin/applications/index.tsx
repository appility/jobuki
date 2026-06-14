import { useLoaderData, Form, useNavigation, Link } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { useState } from 'react'
import { requireWorkspaceAccess } from '../../../lib/auth.server'
import { getDb, applications, jobs, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const db = getDb()

  const rows = await db
    .select({
      application: applications,
      jobTitle: jobs.title,
      jobId: jobs.id,
      boardName: boards.name,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(boards, eq(applications.boardId, boards.id))
    .where(eq(boards.workspaceId, workspace.id))
    .orderBy(applications.createdAt)

  // Group by job
  const byJob = new Map<string, typeof rows>()
  rows.forEach(row => {
    const key = row.jobId
    if (!byJob.has(key)) byJob.set(key, [])
    byJob.get(key)!.push(row)
  })

  return { applications: rows, byJob: Array.from(byJob.entries()) }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const form = await args.request.formData()
  const applicationId = form.get('applicationId') as string
  const status = form.get('status') as string
  const db = getDb()

  // Verify application belongs to this workspace
  const [row] = await db
    .select({ application: applications })
    .from(applications)
    .innerJoin(boards, eq(applications.boardId, boards.id))
    .where(and(eq(applications.id, applicationId), eq(boards.workspaceId, workspace.id)))

  if (row) {
    await db.update(applications)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(applications.id, applicationId))
  }

  return { ok: true }
}

const STATUS_OPTIONS = ['new', 'reviewing', 'shortlisted', 'rejected', 'hired'] as const

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  new:         { bg: 'var(--color-surface-subtle)', text: 'var(--color-text-secondary)' },
  reviewing:   { bg: '#EFF6FF', text: '#1D4ED8' },
  shortlisted: { bg: '#F0FDF4', text: '#15803D' },
  rejected:    { bg: 'var(--color-danger-bg)', text: 'var(--color-danger)' },
  hired:       { bg: '#F0FDF4', text: '#15803D' },
}

export default function ApplicationsIndex() {
  const { applications: rows, byJob } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const [viewMode, setViewMode] = useState<'by-job' | 'by-people'>('by-job')

  return (
    <div className="w-full p-8 max-w-5xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
              Applications
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {rows.length} total across all boards
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('by-job')}
              className="px-4 py-2 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: viewMode === 'by-job' ? 'var(--color-primary)' : 'var(--color-surface-subtle)',
                color: viewMode === 'by-job' ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              By Job
            </button>
            <button
              onClick={() => setViewMode('by-people')}
              className="px-4 py-2 rounded text-sm font-medium transition-colors"
              style={{
                backgroundColor: viewMode === 'by-people' ? 'var(--color-primary)' : 'var(--color-surface-subtle)',
                color: viewMode === 'by-people' ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              By People
            </button>
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">◎</p>
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            No applications yet
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Applications will appear here once candidates submit them on your boards.
          </p>
        </div>
      ) : viewMode === 'by-job' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {byJob.map(([jobId, jobApps]) => {
            const firstApp = jobApps[0]
            return (
              <Link key={jobId} to={`/dashboard/applications/${jobId}`}
                className="card p-6 no-underline hover:opacity-80 transition-opacity">
                <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                  {firstApp.jobTitle}
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  {firstApp.boardName}
                </p>
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}>
                    <span className="text-sm font-semibold">{jobApps.length}</span>
                    <span className="text-sm">{jobApps.length === 1 ? 'application' : 'applications'}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({ application, jobTitle, jobId }) => {
            const style = STATUS_STYLE[application.status] ?? STATUS_STYLE.new
            return (
              <Link key={application.id} to={`/dashboard/applications/${jobId}/${application.id}`}
                className="card p-4 no-underline hover:opacity-80 transition-opacity">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
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
                      {jobTitle}
                    </p>
                  </div>
                  <svg className="w-5 h-5 shrink-0 ml-4" fill="none" stroke="currentColor"
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
