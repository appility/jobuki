import { useLoaderData, Link, Outlet, useLocation } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requirePosterAccess } from '../../lib/auth.server'
import { getDb, jobs, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'

export async function loader(args: LoaderFunctionArgs) {
  const { user } = await requirePosterAccess(args)
  const db = getDb()

  // Find all jobs posted by this user (across all boards)
  const userJobs = await db
    .select({ id: jobs.id, title: jobs.title, boardId: jobs.boardId })
    .from(jobs)
    .innerJoin(boards, eq(jobs.boardId, boards.id))
    .where(eq(boards.workspaceId, user.id))

  return { jobs: userJobs }
}

export default function PublisherApplicationsLayout() {
  const { jobs: userJobs } = useLoaderData<typeof loader>()
  const location = useLocation()

  if (userJobs.length === 0) {
    return (
      <div className="card p-6 md:p-8">
        <h1 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
          Applications
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          View and manage applications received for your job listings.
        </p>

        <div className="mt-6 rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            You haven't posted any jobs yet. <Link to="/hiring/listings" style={{ color: 'var(--color-primary)' }}>
              Post a job
            </Link> to start receiving applications.
          </p>
        </div>
      </div>
    )
  }

  const isIndexPage = location.pathname === '/hiring/applications'

  if (isIndexPage) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            Applications
          </h1>
          <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
            Select a job to view and manage applications.
          </p>
        </div>

        <div className="grid gap-3">
          {userJobs.map(job => (
            <Link key={job.id} to={`/hiring/applications/${job.id}`}
              className="card p-4 no-underline hover:opacity-80 transition-opacity">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  {job.title}
                </h3>
                <svg className="w-5 h-5" fill="none" stroke="currentColor"
                  style={{ color: 'var(--color-text-muted)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return <Outlet />
}
