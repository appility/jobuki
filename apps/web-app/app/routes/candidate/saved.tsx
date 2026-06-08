import { Link, useFetcher, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, savedJobs, jobs } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { requireUser } from '../../lib/auth.server'
import { publicJobPath } from '../../lib/public-job-path'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args)
  const db = getDb()
  const rows = await db
    .select({ saved: savedJobs, job: jobs })
    .from(savedJobs)
    .innerJoin(jobs, eq(savedJobs.jobId, jobs.id))
    .where(eq(savedJobs.userId, user.id))
    .orderBy(savedJobs.savedAt)
  return { rows: rows.reverse() }
}

export default function CandidateSaved() {
  const { rows } = useLoaderData<typeof loader>()

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold font-display" style={{ color: 'var(--color-text-primary)' }}>
        Saved jobs
      </h2>

      {rows.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>No saved jobs yet</p>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-muted)' }}>Save jobs as you browse to come back to them later.</p>
          <Link to="/jobs" className="btn-primary text-sm px-5 py-2.5">Browse jobs</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ saved, job }) => (
            <SavedJobCard key={saved.id} saved={saved} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}

function SavedJobCard({ saved, job }: { saved: any; job: any }) {
  const fetcher = useFetcher()
  const removed = fetcher.state !== 'idle' || fetcher.data?.saved === false

  if (removed) return null

  return (
    <div className="card flex items-center justify-between gap-4 p-5">
      <div className="min-w-0 flex-1">
        <Link to={publicJobPath(job)} className="text-sm font-bold no-underline hover:underline font-display" style={{ color: 'var(--color-text-primary)' }}>
          {job.title}
        </Link>
        <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          {[job.company, job.location].filter(Boolean).join(' · ')}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link to={`/apply/${job.id}`} className="btn-primary text-xs px-3 py-2">Apply</Link>
        <fetcher.Form method="post" action="/api/save-job">
          <input type="hidden" name="jobId" value={job.id} />
          <input type="hidden" name="boardId" value={job.boardId} />
          <input type="hidden" name="intent" value="unsave" />
          <button type="submit" className="text-xs px-3 py-2 rounded-lg border font-semibold"
            style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
            Remove
          </button>
        </fetcher.Form>
      </div>
    </div>
  )
}
