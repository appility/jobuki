import { Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, savedJobs, applications, candidateProfiles } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { requireUser } from '../../lib/auth.server'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args, { type: 'job-seeker' })
  const db = getDb()
  const [saved, applied, profile] = await Promise.all([
    db.select().from(savedJobs).where(eq(savedJobs.userId, user.id)),
    db.select().from(applications).where(eq(applications.candidateEmail, user.email)),
    db.query.candidateProfiles.findFirst({ where: eq(candidateProfiles.userId, user.id) }),
  ])
  const profileComplete = profile
    ? [profile.name, profile.headline, profile.bio, profile.cvUrl, profile.linkedinUrl].filter(Boolean).length
    : 0
  return { user, savedCount: saved.length, appliedCount: applied.length, profileComplete, profileTotal: 5 }
}

export default function CandidateOverview() {
  const { user, savedCount, appliedCount, profileComplete, profileTotal } = useLoaderData<typeof loader>()
  const pct = Math.round((profileComplete / profileTotal) * 100)

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.1em] mb-1" style={{ color: 'var(--color-text-muted)' }}>Overview</p>
        <h1 className="text-2xl font-extrabold font-display" style={{ color: 'var(--color-text-primary)' }}>
          Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Saved jobs', value: savedCount, href: '/candidate/saved' },
          { label: 'Applications', value: appliedCount, href: '/candidate/applications' },
          { label: 'Profile', value: `${pct}%`, href: '/candidate/profile' },
        ].map(stat => (
          <Link key={stat.label} to={stat.href} className="card no-underline hover:-translate-y-px transition-transform block">
            <p className="text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
            <p className="text-3xl font-extrabold font-display mt-1" style={{ color: 'var(--color-text-primary)' }}>{stat.value}</p>
          </Link>
        ))}
      </div>

      {pct < 100 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Complete your profile</p>
            <span className="text-sm font-bold" style={{ color: 'var(--color-primary)' }}>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--color-border)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: 'var(--color-primary)' }} />
          </div>
          <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
            A complete profile unlocks personalised cover letters and match analysis on every job.
          </p>
          <Link to="/candidate/profile" className="btn-primary inline-block mt-4 text-sm px-4 py-2">Set up profile →</Link>
        </div>
      )}

      <div className="card p-5">
        <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>Quick actions</p>
        <div className="flex flex-wrap gap-2">
          <Link to="/jobs" className="btn-outline text-sm px-4 py-2">Browse jobs</Link>
          <Link to="/candidate/saved" className="btn-outline text-sm px-4 py-2">Saved jobs</Link>
          <Link to="/candidate/profile" className="btn-outline text-sm px-4 py-2">Edit profile</Link>
        </div>
      </div>
    </div>
  )
}
