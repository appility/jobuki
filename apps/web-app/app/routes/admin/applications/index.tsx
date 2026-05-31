import { useLoaderData, Form, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
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
      boardName: boards.name,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .innerJoin(boards, eq(applications.boardId, boards.id))
    .where(eq(boards.workspaceId, workspace.id))
    .orderBy(applications.createdAt)

  return { applications: rows }
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
    .where(eq(boards.workspaceId, workspace.id))

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
  const { applications: rows } = useLoaderData<typeof loader>()
  const navigation = useNavigation()

  return (
    <div className="p-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
          Applications
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          {rows.length} total across all boards
        </p>
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
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({ application, jobTitle, boardName }) => {
            const style = STATUS_STYLE[application.status] ?? STATUS_STYLE.new
            return (
              <div key={application.id} className="card p-4">
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
                      Applied to <span style={{ color: 'var(--color-text-secondary)' }}>{jobTitle}</span> on {boardName}
                    </p>
                  </div>

                  <Form method="post" className="flex items-center gap-2 shrink-0 ml-4">
                    <input type="hidden" name="applicationId" value={application.id} />
                    <select
                      name="status"
                      defaultValue={application.status}
                      className="input text-sm py-1"
                      onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </Form>
                </div>

                {application.coverLetter && (
                  <details className="mt-3">
                    <summary className="text-xs cursor-pointer font-medium"
                      style={{ color: 'var(--color-text-muted)' }}>
                      Cover letter
                    </summary>
                    <p className="text-sm mt-2 leading-relaxed whitespace-pre-line"
                      style={{ color: 'var(--color-text-secondary)' }}>
                      {application.coverLetter}
                    </p>
                  </details>
                )}

                {application.cvUrl && (
                  <a href={application.cvUrl} target="_blank" rel="noopener noreferrer"
                    className="text-xs no-underline mt-2 inline-block"
                    style={{ color: 'var(--color-primary)' }}>
                    View CV ↗
                  </a>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
