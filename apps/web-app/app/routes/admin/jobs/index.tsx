import { useLoaderData, Link } from 'react-router'
import { useState, useMemo, useEffect } from 'react'
import type { LoaderFunctionArgs } from 'react-router'
import { requireWorkspaceAccess } from '../../../lib/auth.server'
import { getDb, jobs, boards } from '@jobuki/db'
import { desc, eq } from 'drizzle-orm'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const db = getDb()

  const rows = await db
    .select({ job: jobs, boardName: boards.name, boardId: boards.id })
    .from(jobs)
    .innerJoin(boards, eq(jobs.boardId, boards.id))
    .where(eq(boards.workspaceId, workspace.id))
    .orderBy(desc(jobs.createdAt))

  return { jobs: rows }
}

const STATUS_COLOR: Record<string, string> = {
  draft:     'var(--color-text-muted)',
  published: 'var(--color-success)',
  closed:    'var(--color-danger)',
}

const PAGE_SIZE = 50

type OriginFilter = 'all' | 'posted' | 'imported'
type StatusFilter = 'all' | 'published' | 'draft' | 'closed'

export default function JobsIndex() {
  const { jobs: rows } = useLoaderData<typeof loader>()
  const [search, setSearch] = useState('')
  const [origin, setOrigin] = useState<OriginFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return rows.filter(({ job }) => {
      if (origin === 'posted' && job.externalSource) return false
      if (origin === 'imported' && !job.externalSource) return false
      if (status !== 'all' && job.status !== status) return false
      if (q && !job.title.toLowerCase().includes(q) && !(job.company ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, search, origin, status])

  useEffect(() => { setPage(1) }, [search, origin, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const postedCount   = rows.filter(r => !r.job.externalSource).length
  const importedCount = rows.filter(r =>  r.job.externalSource).length

  return (
    <div className="w-full p-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>Jobs</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {rows.length} total — {postedCount} posted · {importedCount} imported
          </p>
        </div>
        <Link to="/dashboard/jobs/new" className="btn-primary">+ Post a job</Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5 items-center">
        {/* Origin filter */}
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
          {(['all', 'posted', 'imported'] as OriginFilter[]).map(o => (
            <button
              key={o}
              type="button"
              onClick={() => setOrigin(o)}
              className="px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
              style={{
                backgroundColor: origin === o ? 'var(--color-primary)' : 'var(--color-surface)',
                color: origin === o ? 'var(--color-primary-fg)' : 'var(--color-text-secondary)',
              }}
            >
              {o === 'all' ? `All (${rows.length})` : o === 'posted' ? `Posted (${postedCount})` : `Imported (${importedCount})`}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
          {(['all', 'published', 'draft', 'closed'] as StatusFilter[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className="px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
              style={{
                backgroundColor: status === s ? 'var(--color-text-primary)' : 'var(--color-surface)',
                color: status === s ? 'var(--color-surface)' : 'var(--color-text-secondary)',
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search title or company…"
          className="input"
          style={{ width: 220 }}
        />

        {filtered.length !== rows.length && (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>No jobs match</p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Try adjusting your filters.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {paginated.map(({ job, boardName }) => (
              <div key={job.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {job.title}
                    </span>
                    <span className="text-xs capitalize font-medium"
                      style={{ color: STATUS_COLOR[job.status] ?? 'var(--color-text-muted)' }}>
                      {job.status}
                    </span>
                    {job.externalSource && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-muted)' }}>
                        {job.externalSource}
                      </span>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {boardName} · {[job.company, job.location, job.remotePolicy].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Link to={`/dashboard/jobs/${job.id}`} className="btn-outline text-sm shrink-0">
                  Edit
                </Link>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-40"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}
                >
                  ← Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
                  .reduce<(number | '…')[]>((acc, p, i, arr) => {
                    if (i > 0 && (arr[i - 1] as number) < p - 1) acc.push('…')
                    acc.push(p)
                    return acc
                  }, [])
                  .map((p, i) =>
                    p === '…' ? (
                      <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPage(p as number)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors"
                        style={{
                          borderColor: page === p ? 'var(--color-primary)' : 'var(--color-border)',
                          backgroundColor: page === p ? 'var(--color-primary)' : 'var(--color-surface)',
                          color: page === p ? 'var(--color-primary-fg)' : 'var(--color-text-secondary)',
                        }}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  type="button"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-40"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
