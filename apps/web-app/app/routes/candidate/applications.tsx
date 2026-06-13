import { Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, applications, jobs } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { requireUser } from '../../lib/auth.server'
import { publicJobPath } from '../../lib/public-job-path'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args, { type: 'job-seeker' })
  const db = getDb()
  const rows = await db
    .select({ app: applications, job: jobs })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.candidateEmail, user.email))
    .orderBy(applications.createdAt)
  return { rows: rows.reverse() }
}

const STATUS_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  new:         { bg: 'var(--color-surface-subtle)', fg: 'var(--color-text-secondary)', label: 'Submitted' },
  reviewing:   { bg: '#EDE6FF', fg: '#4A22D4', label: 'Reviewing' },
  shortlisted: { bg: '#E2F4EB', fg: '#1B7A4E', label: 'Shortlisted' },
  rejected:    { bg: '#FEF2F2', fg: '#DC2626', label: 'Not progressed' },
  hired:       { bg: '#E2F4EB', fg: '#1B7A4E', label: 'Offer made' },
}

export default function CandidateApplications() {
  const { rows } = useLoaderData<typeof loader>()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold font-display" style={{ color: 'var(--color-text-primary)' }}>
        Applications
      </h2>

      {rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>No applications yet</p>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>Applications submitted through Jobuki appear here.</p>
          <Link to="/jobs" className="btn-primary text-sm px-5 py-2.5">Browse jobs</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ app, job }) => {
            const s = STATUS_STYLES[app.status] ?? STATUS_STYLES.new
            const date = new Date(app.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
            return (
              <div key={app.id} className="card flex items-center justify-between gap-4 p-5">
                <div className="min-w-0 flex-1">
                  <Link to={publicJobPath(job)} className="text-sm font-bold no-underline hover:underline font-display" style={{ color: 'var(--color-text-primary)' }}>
                    {job.title}
                  </Link>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {[job.company, job.location].filter(Boolean).join(' · ')} · Applied {date}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: s.bg, color: s.fg }}>
                    {s.label}
                  </span>
                  <Link to={`/apply/${job.id}`} className="btn-outline text-xs px-3 py-1.5">
                    Open prep
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
