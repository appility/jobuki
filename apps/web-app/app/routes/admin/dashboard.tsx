import { useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { Link } from 'react-router'
import { requireWorkspaceAccess } from '../../lib/auth.server'
import { getDb, boards, jobs, applications } from '@jobuki/db'
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
    canMonetize: canMonetize(workspace.plan),
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
  const { user, workspace, stats, canMonetize: monetizationEnabled } = useLoaderData<typeof loader>()

  return (
    <div className="w-full p-10 max-w-7xl">
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

      {/* No boards yet — primary CTA */}
      {stats.boards === 0 ? (
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
      ) : (
        /* Quick actions — only shown once a board exists */
        <div className="flex flex-wrap gap-3 mb-6">
          <Link to="/dashboard/boards/new" className="btn-outline">+ Create job board</Link>
          <Link to="/dashboard/jobs/new" className="btn-primary">+ Post a job</Link>
          <Link to="/dashboard/monetization" className="btn-outline">
            Monetization {monetizationEnabled ? 'enabled' : 'locked'}
          </Link>
        </div>
      )}

      {!monetizationEnabled && stats.boards > 0 && (
        <div className="rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
          Monetization is not available on Free.{' '}
          <Link to="/dashboard/billing" className="font-semibold underline" style={{ color: 'var(--color-warning)' }}>
            Upgrade to Growth or Scale
          </Link>{' '}to unlock paid listings.
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
