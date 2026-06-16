import { useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { Link } from 'react-router'
import { requireWorkspaceAccess } from '../../lib/auth.server'
import { getDb, boards, jobs, jobBoardListings, applications } from '@jobuki/db'
import { eq, count } from 'drizzle-orm'
import { canMonetize } from '../../lib/creator-tier'

export async function loader(args: LoaderFunctionArgs) {
  const { user, workspace } = await requireWorkspaceAccess(args)
  const db = getDb()

  const [boardCount] = await db
    .select({ count: count() })
    .from(boards)
    .where(eq(boards.workspaceId, workspace.id))

  const [jobCount] = await db
    .select({ count: count() })
    .from(jobs)
    .innerJoin(jobBoardListings, eq(jobs.id, jobBoardListings.jobId))
    .innerJoin(boards, eq(jobBoardListings.boardId, boards.id))
    .where(eq(boards.workspaceId, workspace.id))

  const [appCount] = await db
    .select({ count: count() })
    .from(applications)
    .innerJoin(boards, eq(applications.boardId, boards.id))
    .where(eq(boards.workspaceId, workspace.id))

  return {
    user,
    workspace,
    stats: {
      boards: boardCount.count,
      jobs: jobCount.count,
      applications: appCount.count,
    },
  }
}

const PLAN_LABEL: Record<string, string> = {
  free: 'Free',
  growth: 'Growth',
  scale: 'Scale',
}

export default function Dashboard() {
  const { user, workspace, stats } = useLoaderData<typeof loader>()

  return (
    <div className="w-full p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {user.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {workspace.name} · {PLAN_LABEL[workspace.plan]} plan
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <StatCard label="Jobs Posted" value={stats.jobs} />
        <StatCard label="Applications" value={stats.applications} />
      </div>

      {/* No boards yet — primary CTA */}
      {stats.boards === 0 && (
        <div className="rounded-[18px] border border-border bg-surface p-8 text-center mb-6">
          <p className="text-2xl mb-2">⊞</p>
          <h2 className="text-base font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Create your first job board
          </h2>
          <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
            You need a board before you can post jobs or invite candidates.
          </p>
          <Link to="/dashboard/boards/new" className="btn-primary">
            + Create job board
          </Link>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-6">
      <p className="text-3xl font-extrabold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </p>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</p>
    </div>
  )
}
