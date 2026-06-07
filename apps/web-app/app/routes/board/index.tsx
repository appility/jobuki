import { Form, Link, useLoaderData, useOutletContext } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, boards, jobs } from '@jobuki/db'
import { and, desc, eq } from 'drizzle-orm'
import type { Board } from '@jobuki/types'

const PAGE_SIZE = 10

const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  { category: 'engineering', keywords: ['engineer', 'developer', 'typescript', 'backend', 'frontend', 'full stack', 'solidity', 'rust', 'golang', 'python'] },
  { category: 'product', keywords: ['product manager', 'product owner', 'roadmap'] },
  { category: 'design', keywords: ['designer', 'ux', 'ui', 'figma', 'product design'] },
  { category: 'data', keywords: ['data', 'analytics', 'machine learning', 'ai', 'scientist'] },
  { category: 'marketing', keywords: ['marketing', 'growth', 'seo', 'content', 'social'] },
  { category: 'sales', keywords: ['sales', 'account executive', 'business development', 'bdr', 'partnership'] },
  { category: 'operations', keywords: ['operations', 'ops', 'program manager', 'project manager'] },
  { category: 'security', keywords: ['security', 'infosec', 'application security', 'devsecops'] },
  { category: 'devrel', keywords: ['developer relations', 'devrel', 'advocate', 'community manager'] },
]

function normalizeCategory(value: string | null | undefined) {
  return (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
}

function titleCaseCategory(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function deriveJobCategory(job: typeof jobs.$inferSelect) {
  const explicit = normalizeCategory(job.primaryCategory)
  if (explicit) return explicit

  const tagged = Array.isArray(job.categoryTags)
    ? normalizeCategory(job.categoryTags.find((tag) => normalizeCategory(tag)))
    : ''
  if (tagged) return tagged

  const haystack = [job.title, job.description, job.employmentType].join(' ').toLowerCase()
  const inferred = CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => haystack.includes(keyword)))
  return inferred?.category ?? ''
}

function salaryLabel(job: typeof jobs.$inferSelect) {
  if (!job.salaryMin && !job.salaryMax) return 'Salary not listed'
  const low = job.salaryMin ? `${job.salaryCurrency}${job.salaryMin.toLocaleString()}` : null
  const high = job.salaryMax ? `${job.salaryCurrency}${job.salaryMax.toLocaleString()}` : null
  return [low, high].filter(Boolean).join(' - ') + (job.salaryPeriod ? ` / ${job.salaryPeriod}` : '')
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
    const categoryMatch = !category || deriveJobCategory(job) === category

    return qMatch && locationMatch && categoryMatch
  })

  const totalFilteredJobs = filteredJobs.length
  const totalPages = Math.max(1, Math.ceil(totalFilteredJobs / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const paginatedJobs = filteredJobs.slice(pageStart, pageStart + PAGE_SIZE)

  const categories = Array.from(new Set(allJobs.map((job) => deriveJobCategory(job)).filter(Boolean))).sort()
  const locations = Array.from(new Set(allJobs.map((job) => (job.location ?? '').trim()).filter(Boolean))).sort()

  return {
    jobs: paginatedJobs,
    totalJobs: allJobs.length,
    totalFilteredJobs,
    filters: { q, location, category },
    pagination: { page: currentPage, pageSize: PAGE_SIZE, totalPages },
    options: { categories, locations },
  }
}

export default function BoardJobsPage() {
  const { board } = useOutletContext<{ board: Board }>()
  const { jobs: filteredJobs, totalJobs, totalFilteredJobs, filters, pagination, options } = useLoaderData<typeof loader>()

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
      <section className="board-container pt-8 pb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--color-text-muted)' }}>
          {board.name}
        </p>
        <h1 className="mt-2 text-3xl md:text-4xl font-extrabold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
          Browse open roles
        </h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {pageStart}-{pageEnd} of {totalFilteredJobs} matching roles ({totalJobs} published total)
        </p>

        <Form method="get" className="mt-5 grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3">
          <input
            name="q"
            defaultValue={filters.q}
            className="input w-full"
            placeholder="Search title, company, or location"
            aria-label="Search jobs"
          />
          <select name="location" defaultValue={filters.location} className="input w-full" aria-label="Filter by location">
            <option value="">All locations</option>
            {options.locations.map((item) => (
              <option key={item} value={item.toLowerCase()}>
                {item}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-primary px-6">Search</button>
          {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
        </Form>
      </section>

      <section className="board-container pb-5">
        <div className="flex flex-wrap gap-2">
          <Link to="/jobs" className="btn-outline text-xs">
            All
          </Link>
          {options.categories.map((item) => (
            <Link
              key={item}
              to={`/jobs/category/${item}`}
              className="btn-outline text-xs"
              style={filters.category === item ? { backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' } : undefined}
            >
              {titleCaseCategory(item)}
            </Link>
          ))}
        </div>
      </section>

      <main className="board-container pb-14">
        {filteredJobs.length === 0 ? (
          <div className="rounded-xl border p-10 text-center" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <p className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>No matching roles</p>
            <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>Try changing your search terms or category.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-3">
              {filteredJobs.map((job) => {
                const category = deriveJobCategory(job)
                return (
                  <Link
                    key={job.id}
                    to={`/jobs/${job.id}`}
                    className="block rounded-2xl border p-5 no-underline transition-transform duration-150 hover:-translate-y-[1px]"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <h2 className="font-bold text-lg leading-tight" style={{ color: 'var(--color-text-primary)' }}>{job.title}</h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                          {[job.company, job.location, job.remotePolicy].filter(Boolean).join(' • ')}
                        </p>
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          {category ? (
                            <span className="text-[11px] font-bold uppercase tracking-wide px-2 py-1 rounded-full"
                              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 14%, transparent)', color: 'var(--color-primary)' }}>
                              {titleCaseCategory(category)}
                            </span>
                          ) : null}
                          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{salaryLabel(job)}</span>
                        </div>
                      </div>
                      <span className="btn-outline text-xs">View role</span>
                    </div>
                  </Link>
                )
              })}
            </div>

            {pagination.totalPages > 1 ? (
              <nav className="flex items-center justify-center gap-1.5 flex-wrap" aria-label="Pagination">
                <Link
                  to={makePageHref(Math.max(1, pagination.page - 1))}
                  className="btn-outline text-xs"
                  style={pagination.page === 1 ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
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
                        className="btn-outline text-xs min-w-9"
                        style={page === pagination.page ? { backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)', borderColor: 'var(--color-primary)' } : undefined}
                      >
                        {page}
                      </Link>
                    </div>
                  )
                })}

                <Link
                  to={makePageHref(Math.min(pagination.totalPages, pagination.page + 1))}
                  className="btn-outline text-xs"
                  style={pagination.page === pagination.totalPages ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
                >
                  Next
                </Link>
              </nav>
            ) : null}
          </div>
        )}
      </main>
    </div>
  )
}
