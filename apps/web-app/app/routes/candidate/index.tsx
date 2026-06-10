import { Link } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireUser, getWorkspaceForUser } from '../../lib/auth.server'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args, { type: 'job-seeker' })
  const workspaceMembership = await getWorkspaceForUser(user.id)
  if (workspaceMembership) {
    return { mode: 'creator' as const, user }
  }

  return { mode: 'seeker' as const, user }
}

export default function CandidateHome() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)', fontFamily: 'var(--font-body)' }}>
      <main className="board-container py-16">
        <div className="max-w-xl rounded-2xl border p-8" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
          <p className="text-xs font-semibold tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
            JOB SEEKER AREA
          </p>
          <h1 className="text-2xl font-extrabold mb-2" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
            Your account is ready
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            Candidate profiles and saved applications are enabled at the account level. Next, we can add an applications dashboard and profile settings.
          </p>
          <div className="flex gap-3">
            <Link to="/" className="btn-primary">Browse jobs</Link>
            <Link to="/sign-in?redirectTo=/dashboard" className="btn-outline">I am a board creator</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
