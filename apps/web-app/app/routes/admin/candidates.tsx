import { Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { useDeferredValue, useState } from 'react'
import { getDb, users, applications, jobAlerts, candidateProfiles } from '@jobuki/db'
import { count, eq, desc } from 'drizzle-orm'
import { requirePlatformAdmin } from '../../lib/auth.server'

export async function loader(args: LoaderFunctionArgs) {
  await requirePlatformAdmin(args)
  const db = getDb()

  // Get all job seekers
  const jobSeekers = await db.query.users.findMany({
    where: eq(users.accountType, 'candidate'),
  })

  // Get applications, job alerts, and profiles for each seeker
  const seekerStats = await Promise.all(
    jobSeekers.map(async (seeker) => {
      const [applicationCount, alertCount, profile, boards] = await Promise.all([
        db
          .select({ count: count() })
          .from(applications)
          .where(eq(applications.candidateEmail, seeker.email)),
        db
          .select({ count: count() })
          .from(jobAlerts)
          .where(eq(jobAlerts.userId, seeker.id)),
        db.query.candidateProfiles.findFirst({
          where: eq(candidateProfiles.userId, seeker.id),
        }),
        db.query.jobAlerts.findMany({
          where: eq(jobAlerts.userId, seeker.id),
          with: { board: true },
        }),
      ])

      return {
        user: seeker,
        stats: {
          applications: applicationCount[0]?.count ?? 0,
          alerts: alertCount[0]?.count ?? 0,
          boardsAccessed: [...new Set(boards.map((a) => a.boardId))].length,
        },
        profile,
        boards: [...new Set(boards.map((a) => a.board).filter(Boolean))],
      }
    })
  )

  // Sort by most recent activity
  const sorted = seekerStats.sort((a, b) => {
    const aTime = a.user.updatedAt?.getTime() ?? 0
    const bTime = b.user.updatedAt?.getTime() ?? 0
    return bTime - aTime
  })

  const stats = {
    totalSeekers: jobSeekers.length,
    totalApplications: sorted.reduce((sum, s) => sum + s.stats.applications, 0),
    totalAlerts: sorted.reduce((sum, s) => sum + s.stats.alerts, 0),
  }

  return {
    seekers: sorted,
    stats,
  }
}

export default function CandidatesPage() {
  const { seekers, stats } = useLoaderData<typeof loader>()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const filteredCandidates = seekers.filter((seeker) => {
    if (!deferredQuery.trim()) return true
    const haystack = [
      seeker.user.email,
      seeker.user.name ?? '',
      seeker.profile?.headline ?? '',
      ...seeker.boards.map((b) => b?.name ?? ''),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(deferredQuery.trim().toLowerCase())
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <Link
              to="/admin"
              className="text-sm no-underline block mb-3"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ← Back to platform admin
            </Link>
            <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Candidates
            </h1>
            <p className="text-sm max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>
              Users who have signed up to apply for jobs across your boards.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <StatCard label="Total candidates" value={String(stats.totalSeekers)} />
          <StatCard label="Total applications" value={String(stats.totalApplications)} />
          <StatCard label="Total job alerts" value={String(stats.totalAlerts)} />
        </div>

        <div className="card p-5 mb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Candidates
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Search by name, email, headline, or board name.
              </p>
            </div>
            <div className="w-full md:w-80">
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Search
              </label>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="input w-full"
                placeholder="Find a candidate or board"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {filteredCandidates.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                No candidates match this search
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Try a different name, email address, or board name.
              </p>
            </div>
          ) : filteredCandidates.map((seeker) => (
            <article key={seeker.user.id} className="card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {seeker.user.name ?? seeker.user.email}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {seeker.user.email}
                  </p>
                  {seeker.profile?.headline && (
                    <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {seeker.profile.headline}
                    </p>
                  )}
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Joined {new Date(seeker.user.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-4 lg:text-right">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Applications
                    </p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {seeker.stats.applications}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Job alerts
                    </p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {seeker.stats.alerts}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Boards
                    </p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {seeker.stats.boardsAccessed}
                    </p>
                  </div>
                </div>
              </div>

              {seeker.boards.length > 0 && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    BOARDS ({seeker.boards.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {seeker.boards.map((board) => (
                      <div
                        key={board?.id}
                        className="px-3 py-1.5 rounded-lg text-sm"
                        style={{
                          backgroundColor: 'var(--color-surface-subtle)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {board?.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-3xl font-extrabold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </p>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </p>
    </div>
  )
}
