import { useLoaderData, Link, useNavigate } from 'react-router'
import { useState } from 'react'
import type { LoaderFunctionArgs } from 'react-router'
import { requireWorkspaceAccess } from '../../../lib/auth.server'
import { getDb, jobs, boards, jobBoardListings } from '@jobuki/db'
import { desc, eq, count, and, ilike, or, isNull } from 'drizzle-orm'
import { Pagination } from '../../../components/pagination'

const PAGE_SIZE = 50

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const db = getDb()

  const url = new URL(args.request.url)
  const pageParam = Number(url.searchParams.get('page') ?? '1')
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1
  const searchParam = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const originParam = (url.searchParams.get('origin') ?? 'all') as 'all' | 'posted' | 'imported'
  const statusParam = (url.searchParams.get('status') ?? 'all') as 'all' | 'published' | 'draft' | 'closed'

  // Build filter conditions
  const conditions = [eq(boards.workspaceId, workspace.id)]

  if (searchParam) {
    conditions.push(or(
      ilike(jobs.title, `%${searchParam}%`),
      ilike(jobs.company, `%${searchParam}%`)
    )!)
  }

  if (originParam === 'posted') {
    conditions.push(isNull(jobs.externalSource))
  } else if (originParam === 'imported') {
    conditions.push(jobs.externalSource.isNotNull())
  }

  if (statusParam !== 'all') {
    conditions.push(eq(jobBoardListings.status, statusParam as any))
  }

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(jobs)
    .innerJoin(jobBoardListings, eq(jobs.id, jobBoardListings.jobId))
    .innerJoin(boards, eq(jobBoardListings.boardId, boards.id))
    .where(and(...conditions))

  // Get paginated results
  const rows = await db
    .select({
      job: {
        id: jobs.id,
        title: jobs.title,
        status: jobBoardListings.status,
        externalSource: jobs.externalSource,
        company: jobs.company,
        location: jobs.location,
        remotePolicy: jobs.remotePolicy,
        createdAt: jobs.createdAt,
      },
      boardName: boards.name,
      boardId: boards.id,
    })
    .from(jobs)
    .innerJoin(jobBoardListings, eq(jobs.id, jobBoardListings.jobId))
    .innerJoin(boards, eq(jobBoardListings.boardId, boards.id))
    .where(and(...conditions))
    .orderBy(desc(jobs.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return {
    jobs: rows,
    page,
    totalPages,
    total,
    search: searchParam,
    origin: originParam,
    status: statusParam,
  }
}

const STATUS_COLOR: Record<string, string> = {
  draft:     'var(--color-text-muted)',
  published: 'var(--color-success)',
  closed:    'var(--color-danger)',
}

type OriginFilter = 'all' | 'posted' | 'imported'
type StatusFilter = 'all' | 'published' | 'draft' | 'closed'

export default function JobsIndex() {
  const { jobs: rows, page, totalPages, total, search: initialSearch, origin: initialOrigin, status: initialStatus } = useLoaderData<typeof loader>()
  const navigate = useNavigate()
  const [search, setSearch] = useState(initialSearch)
  const [origin, setOrigin] = useState<OriginFilter>(initialOrigin)
  const [status, setStatus] = useState<StatusFilter>(initialStatus)

  const buildQuery = (newSearch?: string, newOrigin?: OriginFilter, newStatus?: StatusFilter) => {
    const params = new URLSearchParams()
    const s = newSearch ?? search
    const o = newOrigin ?? origin
    const st = newStatus ?? status

    if (s) params.set('q', s)
    if (o !== 'all') params.set('origin', o)
    if (st !== 'all') params.set('status', st)

    return `?${params.toString()}`
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearch = e.target.value
    setSearch(newSearch)
    navigate(buildQuery(newSearch, origin, status))
  }

  const handleOriginChange = (o: OriginFilter) => {
    setOrigin(o)
    navigate(buildQuery(search, o, status))
  }

  const handleStatusChange = (s: StatusFilter) => {
    setStatus(s)
    navigate(buildQuery(search, origin, s))
  }

  return (
    <div className="w-full p-8 max-w-7xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>Jobs</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {total} total jobs
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
              onClick={() => handleOriginChange(o)}
              className="px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
              style={{
                backgroundColor: origin === o ? 'var(--color-primary)' : 'var(--color-surface)',
                color: origin === o ? 'var(--color-primary-fg)' : 'var(--color-text-secondary)',
              }}
            >
              {o}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: 'var(--color-border)' }}>
          {(['all', 'published', 'draft', 'closed'] as StatusFilter[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => handleStatusChange(s)}
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
          onChange={handleSearch}
          placeholder="Search title or company…"
          className="input"
          style={{ width: 220 }}
        />
      </div>

      {rows.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>No jobs match</p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Try adjusting your filters.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            {rows.map(({ job, boardName }) => (
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

          <Pagination
            page={page}
            totalPages={totalPages}
            totalItems={total}
            pageSize={PAGE_SIZE}
            baseUrl={buildQuery()}
          />
        </>
      )}
    </div>
  )
}
