import { useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { Link } from 'react-router'
import { requireWorkspaceAccess } from '../../lib/auth.server'
import { getDb, boards, jobs, applications } from '@jobuki/db'
import { eq, count } from 'drizzle-orm'

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
    .innerJoin(boards, eq(jobs.boardId, boards.id))
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
    <div className="p-10 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          {user.name ? `Welcome back, ${user.name.split(' ')[0]}` : 'Dashboard'}
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {workspace.name} · {PLAN_LABEL[workspace.plan]} plan
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard label="Job Boards" value={stats.boards} />
        <StatCard label="Total Jobs" value={stats.jobs} />
        <StatCard label="Applications" value={stats.applications} />
      </div>

      {/* Quick actions */}
      <div className="flex gap-3">
        <Link to="/dashboard/boards/new" className="btn-primary">
          + Create job board
        </Link>
        <Link to="/dashboard/jobs/new" className="btn-outline">
          + Post a job
        </Link>
      </div>
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
