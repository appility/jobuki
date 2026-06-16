import { useLoaderData, Link } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireWorkspaceAccess } from '../../../lib/auth.server'
import { getDb, boards, jobs, jobBoardListings } from '@jobuki/db'
import { eq, count } from 'drizzle-orm'
import { boardUrl } from '../../../lib/board-url'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const db = getDb()

  const rows = await db
    .select({ board: boards, jobCount: count(jobs.id) })
    .from(boards)
    .leftJoin(jobBoardListings, eq(boards.id, jobBoardListings.boardId))
    .leftJoin(jobs, eq(jobBoardListings.jobId, jobs.id))
    .where(eq(boards.workspaceId, workspace.id))
    .groupBy(boards.id)

  return {
    boards: rows.map(r => ({ ...r, url: boardUrl(r.board.slug, r.board.customDomain) })),
    workspace,
  }
}

const STATUS_STYLE: Record<string, string> = {
  draft:     'color: var(--color-text-muted)',
  live:      'color: var(--color-success)',
  suspended: 'color: var(--color-danger)',
}

export default function BoardsIndex() {
  const { boards: rows, workspace } = useLoaderData<typeof loader>()

  return (
    <div className="w-full p-8 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            Job Boards
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {rows.length} board{rows.length !== 1 ? 's' : ''} in {workspace.name}
          </p>
        </div>
        {rows.length > 0 && (
          <Link to="/dashboard/boards/new" className="btn-primary">+ Create board</Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">⊞</p>
          <p className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            No boards yet
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Create your first branded job board to start posting roles.
          </p>
          <Link to="/dashboard/boards/new" className="btn-primary">Create your first board</Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map(({ board, jobCount, url }) => (
            <div key={board.id} className="card p-5 flex items-center justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    {board.name}
                  </h2>
                  <span className="text-xs font-semibold capitalize" style={{ color: board.status === 'live' ? 'var(--color-success)' : board.status === 'suspended' ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                    {board.status}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {jobCount} job{jobCount !== 1 ? 's' : ''} · {url}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <Link
                  to={`/dashboard/boards/${board.id}`}
                  className="btn-outline text-sm"
                >
                  Manage board
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
