import { Form, Link, useLoaderData, useOutletContext } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, boards, jobs } from '@jobuki/db'
import { and, desc, eq } from 'drizzle-orm'
import { resolveJobBoardThemeConfig, type Board } from '@jobuki/types'
import { deriveJobCategory, normalizeCategory, resolveBoardCategories, titleCaseCategory } from '../../lib/board-categories'
import { publicJobPath } from '../../lib/public-job-path'

const PAGE_SIZE = 10

function salaryLabel(job: typeof jobs.$inferSelect) {
  if (!job.salaryMin && !job.salaryMax) return 'Salary not listed'
  const low = job.salaryMin ? `${job.salaryCurrency}${job.salaryMin.toLocaleString()}` : null
  const high = job.salaryMax ? `${job.salaryCurrency}${job.salaryMax.toLocaleString()}` : null
  return [low, high].filter(Boolean).join(' - ') + (job.salaryPeriod ? ` / ${job.salaryPeriod}` : '')
}

function companyInitials(name: string | null | undefined) {
  const safe = (name ?? '').trim()
  if (!safe) return 'JB'
  return safe
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function remoteBadge(remotePolicy: string) {
  if (remotePolicy === 'remote') return { bg: '#E2F4EB', fg: '#1B7A4E', label: 'Remote' }
  if (remotePolicy === 'hybrid') return { bg: '#E2EEFB', fg: '#1760C8', label: 'Hybrid' }
  return { bg: '#FEF3DC', fg: '#C47B00', label: 'On-site' }
}

function categoryBadge(category: string) {
  const key = titleCaseCategory(category)
  const map: Record<string, { bg: string; fg: string }> = {
    Engineering: { bg: '#EDE6FF', fg: '#4A22D4' },
    Product: { bg: '#E2EEFB', fg: '#1760C8' },
    Design: { bg: '#FEF3DC', fg: '#C47B00' },
    Data: { bg: '#E2F4EB', fg: '#1B7A4E' },
    Security: { bg: '#FFE9E9', fg: '#B91C1C' },
  }
  return map[key] ?? { bg: '#F5F4F2', fg: '#7C7067' }
}

export async function loader({ request }: LoaderFunctionArgs) {
  const boardSlug = request.headers.get('x-board-slug')
  const boardHostname = request.headers.get('x-board-hostname')
  const boardType = request.headers.get('x-board-type')
  const db = getDb()

  let board = null
  if (boardType === 'custom' && boardHostname) {
    board = await db.query.boards.findFirst({ where: eq(boards.customDomain, boardHostname) })
  } else if (boardSlug) {
    board = await db.query.boards.findFirst({ where: eq(boards.slug, boardSlug) })
  }

  if (!board || board.status !== 'live') throw new Response('Board not found', { status: 404 })

  const boardConfig = resolveJobBoardThemeConfig(board.boardConfig, {
    boardName: board.name,
    tagline: board.introText ?? undefined,
    logoUrl: board.logoUrl ?? undefined,
    headerImageUrl: board.heroImageUrl ?? undefined,
    brandColor: (board.theme as any)?.colorPrimary,
    accentColor: (board.theme as any)?.colorAccent,
    backgroundColor: (board.theme as any)?.colorBackground,
  })
  const boardCategories = resolveBoardCategories(boardConfig.categories)

  const allJobs = await db.query.jobs.findMany({
    where: and(eq(jobs.boardId, board.id), eq(jobs.status, 'published')),
    orderBy: [desc(jobs.createdAt)],
  })

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const location = (url.searchParams.get('location') ?? '').trim().toLowerCase()
  const category = normalizeCategory(url.searchParams.get('category'))
  const pageParam = Number(url.searchParams.get('page') ?? '1')
  const page = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1

  const filteredJobs = allJobs.filter((job) => {
    const qMatch =
      !q ||
      job.title.toLowerCase().includes(q) ||
      (job.company ?? '').toLowerCase().includes(q) ||
      (job.location ?? '').toLowerCase().includes(q)

    const locationMatch = !location || (job.location ?? '').toLowerCase() === location
    const categoryMatch = !category || deriveJobCategory(job, boardCategories) === category

    return qMatch && locationMatch && categoryMatch
  })

  const totalFilteredJobs = filteredJobs.length
  const totalPages = Math.max(1, Math.ceil(totalFilteredJobs / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const paginatedJobs = filteredJobs.slice(pageStart, pageStart + PAGE_SIZE)

  const derivedCategories = Array.from(new Set(allJobs.map((job) => deriveJobCategory(job, boardCategories)).filter(Boolean))).sort()
  const categories = boardCategories.length ? boardCategories : derivedCategories
  const locations = Array.from(new Set(allJobs.map((job) => (job.location ?? '').trim()).filter(Boolean))).sort()

  return {
    jobs: paginatedJobs,
    totalJobs: allJobs.length,
    totalFilteredJobs,
    filters: { q, location, category },
    pagination: { page: currentPage, pageSize: PAGE_SIZE, totalPages },
    options: { categories, locations },
    boardCategories,
  }
}

export default function BoardJobsPage() {
  const { board } = useOutletContext<{ board: Board }>()
  const { jobs: filteredJobs, totalJobs, totalFilteredJobs, filters, pagination, options, boardCategories } = useLoaderData<typeof loader>()

  const makePageHref = (targetPage: number) => {
    const params = new URLSearchParams()
    if (filters.q) params.set('q', filters.q)
    if (filters.location) params.set('location', filters.location)
    if (filters.category) params.set('category', filters.category)
    if (targetPage > 1) params.set('page', String(targetPage))
    const query = params.toString()
    return query ? `/jobs?${query}` : '/jobs'
  }

  const pageStart = totalFilteredJobs === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1
  const pageEnd = Math.min(pagination.page * pagination.pageSize, totalFilteredJobs)

  const pageWindow = Array.from({ length: pagination.totalPages }, (_, idx) => idx + 1)
    .filter((page) => Math.abs(page - pagination.page) <= 2 || page === 1 || page === pagination.totalPages)

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <main className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-10 pb-20">
        <section>
          <h1
            className="text-[22px] font-extrabold tracking-[-0.03em]"
            style={{ fontFamily: "'Unbounded', var(--font-display), sans-serif", color: 'var(--color-text-primary)' }}
          >
            {board.name} Jobs
          </h1>
          <p className="mt-2 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-[7px] h-[7px] rounded-full" style={{ backgroundColor: 'var(--color-primary)' }} />
              {pageStart}-{pageEnd} of {totalFilteredJobs} matching roles ({totalJobs} published total)
            </span>
          </p>

          <Form method="get" className="mt-5 flex flex-col md:flex-row gap-2.5">
            <div
              className="flex-1 flex overflow-hidden rounded-xl border"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}
            >
              <input
                name="q"
                defaultValue={filters.q}
                className="flex-1 bg-transparent border-0 outline-none px-4 py-3 text-sm"
                style={{ color: 'var(--color-text-primary)' }}
                placeholder="Role, skill or company..."
                aria-label="Search jobs"
              />
              <select
                name="location"
                defaultValue={filters.location}
                className="border-0 outline-none px-3 text-xs font-semibold"
                style={{ color: 'var(--color-text-secondary)', backgroundColor: 'transparent' }}
                aria-label="Filter by location"
              >
                <option value="">Anywhere</option>
                {options.locations.map((item) => (
                  <option key={item} value={item.toLowerCase()}>
                    {item}
                  </option>
                ))}
              </select>
              <button type="submit" className="px-5 text-sm font-bold" style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}>
                Search →
              </button>
            </div>
            {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
          </Form>
        </section>

        <section className="mt-4">
          <div className="flex flex-wrap gap-1.5">
            <Link
              to="/jobs"
              className="px-3.5 py-1.5 text-xs font-bold rounded-full border"
              style={{
                borderColor: !filters.category ? 'var(--color-text-primary)' : 'var(--color-border)',
                backgroundColor: !filters.category ? 'var(--color-text-primary)' : 'var(--color-surface)',
                color: !filters.category ? 'var(--color-background)' : 'var(--color-text-secondary)',
              }}
            >
              All roles
            </Link>
            {options.categories.map((item) => (
              <Link
                key={item}
                to={`/jobs/category/${item}`}
                className="px-3.5 py-1.5 text-xs font-bold rounded-full border"
                style={{
                  borderColor: filters.category === item ? 'var(--color-text-primary)' : 'var(--color-border)',
                  backgroundColor: filters.category === item ? 'var(--color-text-primary)' : 'var(--color-surface)',
                  color: filters.category === item ? 'var(--color-background)' : 'var(--color-text-secondary)',
                }}
              >
                {titleCaseCategory(item)}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold tracking-[0.02em]" style={{ color: 'var(--color-text-primary)' }}>
              {totalFilteredJobs} role{totalFilteredJobs === 1 ? '' : 's'}
            </span>
            <span className="text-xs px-2.5 py-1.5 rounded-md border" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
              Most recent
            </span>
          </div>

        {filteredJobs.length === 0 ? (
          <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>No matching roles</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Try changing your search terms or category.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3">
              {filteredJobs.map((job) => {
                const category = deriveJobCategory(job, boardCategories)
                const remote = remoteBadge(job.remotePolicy)
                const cat = categoryBadge(category || 'all')
                return (
                  <Link
                    key={job.id}
                    to={publicJobPath(job)}
                    className="block rounded-[14px] border px-5 py-[18px] no-underline transition-transform duration-150 hover:-translate-y-[1px]"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex items-center gap-4 flex-1">
                        <div
                          className="w-[42px] h-[42px] rounded-[10px] border flex items-center justify-center text-xs font-extrabold shrink-0"
                          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-background)', color: 'var(--color-text-secondary)', fontFamily: "'Unbounded', var(--font-display), sans-serif" }}
                        >
                          {companyInitials(job.company)}
                        </div>

                        <div className="min-w-0">
                          <h2
                            className="text-sm font-bold leading-[1.25] truncate"
                            style={{ fontFamily: "'Unbounded', var(--font-display), sans-serif", color: 'var(--color-text-primary)' }}
                          >
                            {job.title}
                          </h2>
                          <div className="mt-1 flex items-center gap-2 text-xs flex-wrap" style={{ color: 'var(--color-text-secondary)' }}>
                            {job.company ? <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>{job.company}</span> : null}
                            <span className="inline-block w-[3px] h-[3px] rounded-full" style={{ backgroundColor: 'var(--color-border)' }} />
                            <span>{job.location || 'Location flexible'}</span>
                            {category ? (
                              <span className="text-[10px] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-md" style={{ backgroundColor: cat.bg, color: cat.fg }}>
                                {titleCaseCategory(category)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span className="text-sm font-semibold whitespace-nowrap"
                          style={{ color: 'var(--color-text-primary)' }}>
                          {salaryLabel(job)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-md" style={{ backgroundColor: remote.bg, color: remote.fg }}>
                            {remote.label}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>

            {pagination.totalPages > 1 ? (
              <nav className="flex items-center justify-center gap-1.5 flex-wrap" aria-label="Pagination">
                <Link
                  to={makePageHref(Math.max(1, pagination.page - 1))}
                  className="px-3 py-1.5 text-xs font-bold rounded-full border"
                  style={{
                    opacity: pagination.page === 1 ? 0.5 : 1,
                    pointerEvents: pagination.page === 1 ? 'none' : undefined,
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Prev
                </Link>

                {pageWindow.map((page, idx) => {
                  const prev = pageWindow[idx - 1]
                  const showGap = prev && page - prev > 1
                  return (
                    <div key={page} className="flex items-center gap-1.5">
                      {showGap ? <span className="px-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>…</span> : null}
                      <Link
                        to={makePageHref(page)}
                        className="min-w-9 text-center px-3 py-1.5 text-xs font-bold rounded-full border"
                        style={page === pagination.page
                          ? { backgroundColor: 'var(--color-text-primary)', color: 'var(--color-background)', borderColor: 'var(--color-text-primary)' }
                          : { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)' }}
                      >
                        {page}
                      </Link>
                    </div>
                  )
                })}

                <Link
                  to={makePageHref(Math.min(pagination.totalPages, pagination.page + 1))}
                  className="px-3 py-1.5 text-xs font-bold rounded-full border"
                  style={{
                    opacity: pagination.page === pagination.totalPages ? 0.5 : 1,
                    pointerEvents: pagination.page === pagination.totalPages ? 'none' : undefined,
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                    color: 'var(--color-text-secondary)',
                  }}
                >
                  Next
                </Link>
              </nav>
            ) : null}
          </div>
        )}
        </section>
      </main>
    </div>
  )
}
