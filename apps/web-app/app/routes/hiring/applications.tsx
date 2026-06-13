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

export default function HiringApplicationsPage() {
  const { jobs, applications: apps, jobStats, selectedJobId, statusFilter } = useLoaderData<typeof loader>()
  const [, setSearchParams] = useSearchParams()

  if (jobs.length === 0) {
    return (
      <section className="card p-6 md:p-8">
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
      </section>
    )
  }

  const selectedJob = jobs.find(j => j.id === selectedJobId)
  const stats = selectedJobId ? jobStats.get(selectedJobId) : undefined

  return (
    <section className="w-full space-y-6">
      <div>
        <h1 className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
          Applications
        </h1>
        <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
          View and manage applications received for your job listings.
        </p>
      </div>

      {/* Job selector */}
      {jobs.length > 1 && (
        <div className="card p-4">
          <select
            value={selectedJobId || ''}
            onChange={(e) => setSearchParams({ jobId: e.target.value, status: 'new' })}
            className="input text-sm"
          >
            {jobs.map(job => (
              <option key={job.id} value={job.id}>{job.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Status tabs */}
      {selectedJob && stats && (
        <div className="flex gap-1 overflow-x-auto">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setSearchParams({ jobId: selectedJobId!, status: s })}
              className={`text-xs px-3 py-2 rounded whitespace-nowrap font-medium transition-colors ${
                statusFilter === s ? 'opacity-100' : 'opacity-60 hover:opacity-80'
              }`}
              style={{
                backgroundColor: statusFilter === s ? 'var(--color-primary)' : 'transparent',
                color: statusFilter === s ? 'white' : 'var(--color-text-secondary)',
                border: statusFilter !== s ? '1px solid var(--color-border)' : 'none',
              }}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)} ({stats[s as ApplicationStatus]})
            </button>
          ))}
        </div>
      )}

      {/* Applications list */}
      {apps.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">◎</p>
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            No applications in this stage
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Applications will appear here as candidates apply to your job.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {apps.map(application => {
            const style = STATUS_STYLE[application.status as ApplicationStatus] ?? STATUS_STYLE.new
            return (
              <Link key={application.id} to={`/hiring/applications/${application.id}`}
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
    </section>
  )
}
