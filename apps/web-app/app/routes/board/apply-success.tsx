import { Link, useLoaderData, useOutletContext } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, jobs } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import type { Board } from '@jobuki/types'

export async function loader({ params }: LoaderFunctionArgs) {
  const db = getDb()
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, params.jobId!) })
  if (!job || job.status !== 'published') throw new Response('Not found', { status: 404 })

  return { job }
}

export default function ApplySuccess() {
  const { job } = useLoaderData<typeof loader>()
  const { board } = useOutletContext<{ board: Board }>()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)', fontFamily: 'var(--font-body)' }}>
      <main className="board-container py-14">
        <div className="max-w-2xl rounded-2xl border p-8 md:p-10"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-6 text-xl"
            style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            ✓
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight mb-2"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
            Application submitted
          </h1>
          <p className="text-sm md:text-base mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Your application for <strong>{job.title}</strong>{job.company ? ` at ${job.company}` : ''} has been sent.
          </p>

          <section className="rounded-xl border p-5 mb-6"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)' }}>
            <h2 className="text-xs font-extrabold uppercase tracking-[0.08em] mb-3"
              style={{ color: 'var(--color-text-secondary)' }}>
              What happens next
            </h2>
            <ul className="text-sm space-y-2" style={{ color: 'var(--color-text-primary)' }}>
              <li>1. The hiring team reviews your profile and CV.</li>
              <li>2. If there is a match, they will contact you directly by email.</li>
              <li>3. Typical response windows are a few business days, depending on role volume.</li>
            </ul>
          </section>

          <section className="rounded-xl border p-5 mb-8"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)' }}>
            <h2 className="text-xs font-extrabold uppercase tracking-[0.08em] mb-3"
              style={{ color: 'var(--color-text-secondary)' }}>
              Useful next steps
            </h2>
            <ul className="text-sm space-y-2" style={{ color: 'var(--color-text-primary)' }}>
              <li>1. Add this application to your tracker with the role and date.</li>
              <li>2. Tailor one additional project example in case they request interviews quickly.</li>
              <li>3. Keep momentum by applying to 2-3 more relevant roles today.</li>
            </ul>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Link to="/jobs" className="btn-primary inline-flex items-center justify-center px-5 py-2.5 text-sm font-bold no-underline">
              Browse more roles
            </Link>
            <Link to={`/jobs/${job.id}`} className="btn-outline inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold no-underline">
              Back to this role
            </Link>
          </div>
        </div>
      </main>

      <footer className="board-container py-8" style={{ borderTop: '1px solid var(--color-border)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          {board.footerText || (
            <>Powered by <span className="font-extrabold" style={{ color: 'var(--color-text-secondary)' }}>Jobuki</span></>
          )}
        </p>
      </footer>
    </div>
  )
}
