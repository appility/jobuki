import { useLoaderData, useOutletContext, Link } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, jobs, boards } from '@jobuki/db'
import { eq, and, desc } from 'drizzle-orm'
import type { Board } from '@jobuki/types'

export async function loader({ request }: LoaderFunctionArgs) {
  const boardSlug     = request.headers.get('x-board-slug')
  const boardHostname = request.headers.get('x-board-hostname')
  const boardType     = request.headers.get('x-board-type')
  const db = getDb()

  let board = null
  if (boardType === 'custom' && boardHostname) {
    board = await db.query.boards.findFirst({ where: eq(boards.customDomain, boardHostname) })
  } else if (boardSlug) {
    board = await db.query.boards.findFirst({ where: eq(boards.slug, boardSlug) })
  }

  if (!board) return { jobs: [] }

  const publishedJobs = await db.query.jobs.findMany({
    where: and(eq(jobs.boardId, board.id), eq(jobs.status, 'published')),
    orderBy: [desc(jobs.createdAt)],
  })

  return { jobs: publishedJobs }
}

export default function BoardIndex() {
  const { board } = useOutletContext<{ board: Board }>()
  const { jobs: publishedJobs } = useLoaderData<typeof loader>()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Header */}
      <header className="board-header">
        <div className="board-container py-10">
          <div className="flex items-center gap-3 mb-4">
            {board.logoUrl && (
              <img src={board.logoUrl} alt={board.name} className="w-10 h-10 rounded-lg object-contain" />
            )}
            <h1 className="text-2xl font-extrabold" style={{ color: 'var(--header-text)' }}>
              {board.name}
            </h1>
          </div>
          {board.introText && (
            <p className="text-base max-w-xl" style={{ color: 'var(--header-muted)' }}>
              {board.introText}
            </p>
          )}
          <p className="text-sm mt-3" style={{ color: 'var(--header-muted)' }}>
            {publishedJobs.length} open role{publishedJobs.length !== 1 ? 's' : ''}
          </p>
        </div>
      </header>

      {/* Jobs */}
      <main className="board-container py-8">
        {publishedJobs.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--color-text-muted)' }}>
            <div className="text-4xl mb-3">🔎</div>
            <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>No open roles right now</p>
            <p className="text-sm mt-1">Check back soon.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {publishedJobs.map(job => (
              <Link key={job.id} to={`/jobs/${job.id}`} className="job-card block no-underline">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {job.title}
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {[job.company, job.location, job.remotePolicy !== 'onsite' ? job.remotePolicy : null, job.employmentType]
                        .filter(Boolean).join(' · ')}
                    </p>
                    {(job.salaryMin || job.salaryMax) && (
                      <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                        {job.salaryCurrency}{job.salaryMin?.toLocaleString()}
                        {job.salaryMax ? ` – ${job.salaryCurrency}${job.salaryMax?.toLocaleString()}` : ''}
                        {' '}{job.salaryPeriod}
                      </p>
                    )}
                  </div>
                  <button className="btn-accent text-sm shrink-0 ml-4">Apply →</button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="board-container py-8 text-center border-t text-xs"
        style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
        {board.footerText || (
          <>Powered by <span className="font-extrabold" style={{ color: 'var(--color-text-primary)' }}>Jobuki</span></>
        )}
      </footer>
    </div>
  )
}
