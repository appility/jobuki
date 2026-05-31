import { useLoaderData, Link } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireWorkspaceAccess } from '../../../lib/auth.server'
import { getDb, jobs, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const db = getDb()

  const rows = await db
    .select({ job: jobs, boardName: boards.name, boardId: boards.id })
    .from(jobs)
    .innerJoin(boards, eq(jobs.boardId, boards.id))
    .where(eq(boards.workspaceId, workspace.id))
    .orderBy(jobs.createdAt)

  return { jobs: rows }
}

const STATUS_COLOR: Record<string, string> = {
  draft:     'var(--color-text-muted)',
  published: 'var(--color-success)',
  closed:    'var(--color-danger)',
}

export default function JobsIndex() {
  const { jobs: rows } = useLoaderData<typeof loader>()

  return (
    <div className="p-10 max-w-4xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            Jobs
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {rows.length} total across all boards
          </p>
        </div>
        <Link to="/dashboard/jobs/new" className="btn-primary">+ Post a job</Link>
      </div>

      {rows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">✦</p>
          <p className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            No jobs yet
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Create a job board first, then post your first role.
          </p>
          <Link to="/dashboard/boards/new" className="btn-primary">Create a board</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map(({ job, boardName, boardId }) => (
            <div key={job.id} className="card p-4 flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {job.title}
                  </span>
                  <span className="text-xs capitalize"
                    style={{ color: STATUS_COLOR[job.status] ?? 'var(--color-text-muted)' }}>
                    {job.status}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {boardName} · {[job.location, job.remotePolicy, job.employmentType].filter(Boolean).join(' · ')}
                </p>
              </div>
              <Link to={`/dashboard/jobs/${job.id}`} className="btn-outline text-sm shrink-0 ml-4">
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
