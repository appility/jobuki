import { Form, Link, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { useDeferredValue, useState } from 'react'
import { getDb, jobs, users, workspaceMembers, workspaces, jobBoardListings } from '@jobuki/db'
import { sql, count, eq, and, desc } from 'drizzle-orm'
import { requirePlatformAdmin } from '../../lib/auth.server'

export async function loader(args: LoaderFunctionArgs) {
  await requirePlatformAdmin(args)
  const db = getDb()

  // Get all users who have posted jobs
  const jobPostersData = await db
    .select({
      userId: jobBoardListings.boardId,
      boardId: jobBoardListings.boardId,
      jobCount: count(jobs.id),
    })
    .from(jobs)
    .innerJoin(jobBoardListings, eq(jobs.id, jobBoardListings.jobId))
    .groupBy(jobBoardListings.boardId)

  // Get workspace members who are in those boards' workspaces
  const allWorkspaceMembers = await db.query.workspaceMembers.findMany({
    with: {
      user: true,
      workspace: true,
    },
  })

  // Get all jobs with their workspace info
  const allJobs = await db.query.jobs.findMany({
    with: {
      board: {
        with: {
          workspace: true,
        },
      },
    },
    orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
  })

  // Build poster stats: user -> boards they posted to + job count
  const posterMap = new Map<
    string,
    {
      user: typeof allWorkspaceMembers[0]['user']
      boards: Array<{ id: string; name: string; jobCount: number }>
      totalJobs: number
      lastPostedAt: Date | null
    }
  >()

  // Group jobs by user (via workspace membership)
  allJobs.forEach((job) => {
    const workspaceId = job.board.workspaceId

    // Find all members of this workspace
    const membersInWorkspace = allWorkspaceMembers.filter(
      (m) => m.workspaceId === workspaceId
    )

    // For now, attribute to workspace owner (simplified)
    // In a real scenario, you'd track who specifically posted each job
    const owner = membersInWorkspace.find((m) => m.role === 'owner')
    if (!owner) return

    const userId = owner.user.id
    if (!posterMap.has(userId)) {
      posterMap.set(userId, {
        user: owner.user,
        boards: [],
        totalJobs: 0,
        lastPostedAt: null,
      })
    }

    const poster = posterMap.get(userId)!
    poster.totalJobs += 1

    if (!poster.lastPostedAt || job.createdAt > poster.lastPostedAt) {
      poster.lastPostedAt = job.createdAt
    }

    // Track board
    const existingBoard = poster.boards.find((b) => b.id === job.boardId)
    if (existingBoard) {
      existingBoard.jobCount += 1
    } else {
      poster.boards.push({
        id: job.boardId,
        name: job.board.name,
        jobCount: 1,
      })
    }
  })

  const posters = Array.from(posterMap.values())
    .sort((a, b) => (b.lastPostedAt?.getTime() ?? 0) - (a.lastPostedAt?.getTime() ?? 0))

  return {
    posters,
    stats: {
      totalPosters: posters.length,
      totalJobs: posters.reduce((sum, p) => sum + p.totalJobs, 0),
    },
  }
}

export default function PublishersPage() {
  const { posters, stats } = useLoaderData<typeof loader>()
  const navigation = useNavigation()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const filteredPublishers = posters.filter((poster) => {
    if (!deferredQuery.trim()) return true
    const haystack = [
      poster.user.email,
      poster.user.name ?? '',
      ...poster.boards.map((b) => b.name),
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
              Publishers
            </h1>
            <p className="text-sm max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>
              Users who have published jobs across your platform.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-8">
          <StatCard label="Total publishers" value={String(stats.totalPosters)} />
          <StatCard label="Total jobs published" value={String(stats.totalJobs)} />
        </div>

        <div className="card p-5 mb-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Publishers
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Search by name, email, or board name.
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
                placeholder="Find a publisher or board"
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {filteredPublishers.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                No publishers match this search
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Try a different name, email address, or board name.
              </p>
            </div>
          ) : filteredPublishers.map((poster) => (
            <article key={poster.user.id} className="card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {poster.user.name ?? poster.user.email}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                    {poster.user.email}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    Joined {new Date(poster.user.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-col gap-2 text-sm lg:text-right">
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Jobs published
                    </p>
                    <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      {poster.totalJobs}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Last published
                    </p>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                      {poster.lastPostedAt
                        ? new Date(poster.lastPostedAt).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </div>

              {poster.boards.length > 0 && (
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-xs font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>
                    BOARDS ({poster.boards.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {poster.boards.map((board) => (
                      <div
                        key={board.id}
                        className="px-3 py-1.5 rounded-lg text-sm"
                        style={{
                          backgroundColor: 'var(--color-surface-subtle)',
                          color: 'var(--color-text-secondary)',
                        }}
                      >
                        {board.name} ({board.jobCount})
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
