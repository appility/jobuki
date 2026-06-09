import { Form, Link, useLoaderData, useOutletContext } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, boards, jobs } from '@jobuki/db'
import { and, desc, eq } from 'drizzle-orm'
import { resolveJobBoardThemeConfig, type Board } from '@jobuki/types'
import { deriveJobCategory, normalizeCategory, resolveBoardCategories, titleCaseCategory } from '../../lib/board-categories'
import { publicJobPath } from '../../lib/public-job-path'
import { normalizeLocation, normalizeLocations } from '../../lib/normalize-location'

const PAGE_SIZE = 10

const JOB_WORDS = /\b(jobs|job|roles|role|careers|career|work|hiring|vacancies|vacancy|positions|position|opportunities)\b/i
function boardPageTitle(name: string) {
  return JOB_WORDS.test(name) ? name : `${name} Jobs`
}

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
  if (remotePolicy === 'remote') return { bg: 'var(--color-badge-remote-bg)', fg: 'var(--color-badge-remote-fg)', label: 'Remote' }
  if (remotePolicy === 'hybrid') return { bg: 'var(--color-badge-hybrid-bg)', fg: 'var(--color-badge-hybrid-fg)', label: 'Hybrid' }
  return { bg: 'var(--color-badge-onsite-bg)', fg: 'var(--color-badge-onsite-fg)', label: 'On-site' }
}

function categoryBadge(category: string) {
  const key = titleCaseCategory(category)
  const map: Record<string, { bg: string; fg: string }> = {
    Engineering: { bg: 'var(--color-badge-category-1-bg)', fg: 'var(--color-badge-category-1-fg)' },
    Product: { bg: 'var(--color-badge-category-2-bg)', fg: 'var(--color-badge-category-2-fg)' },
    Design: { bg: 'var(--color-badge-category-3-bg)', fg: 'var(--color-badge-category-3-fg)' },
    Data: { bg: 'var(--color-badge-category-4-bg)', fg: 'var(--color-badge-category-4-fg)' },
    Security: { bg: 'var(--color-badge-category-5-bg)', fg: 'var(--color-badge-category-5-fg)' },
  }
  return map[key] ?? { bg: 'var(--color-surface-subtle)', fg: 'var(--color-text-secondary)' }
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

    const locationMatch = !location || normalizeLocation(job.location).toLowerCase() === location
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
  const locations = normalizeLocations(allJobs.map((job) => job.location))

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

  const boardConfig = resolveJobBoardThemeConfig(board.boardConfig, { boardName: board.name })
  const logoUrl = (boardConfig.logoUrl ?? '').trim()

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-10 pb-20">

        {/* Board header */}
        <section className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            {logoUrl ? (
              <img src={logoUrl} alt={board.name} style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
            ) : null}
            <h1 className="text-[22px] font-extrabold tracking-[-0.03em] font-display text-text-primary">
              {boardPageTitle(board.name)}
            </h1>
          </div>
          {boardConfig.tagline && (
            <p className="text-sm text-text-secondary mb-4">{boardConfig.tagline}</p>
          )}
          {options.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {options.categories.map((item) => (
                <Link
                  key={item}
                  to={`/jobs/category/${item}`}
                  className={`pill ${filters.category === item ? 'pill-active' : 'pill-inactive'}`}
                >
                  {titleCaseCategory(item)}
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <Form method="get" className="mt-0">
            <div className="flex overflow-hidden rounded-xl border border-border bg-surface shadow-sm" style={{ minHeight: 44 }}>
              <input
                name="q"
                defaultValue={filters.q}
                className="flex-1 bg-transparent border-0 outline-none px-4 py-3 text-sm text-text-primary"
                placeholder="Role, skill or company..."
                aria-label="Search jobs"
              />

              {/* Location icon button — native select overlaid for usability */}
              <div
                style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, flexShrink: 0, borderLeft: '1px solid var(--color-border)', color: filters.location ? 'var(--color-primary)' : 'var(--color-text-muted)' }}
                title={filters.location || 'Filter by location'}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style={{ pointerEvents: 'none' }}>
                  <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.386 1.445-.966 2.274-1.765C14.97 15.232 17 12.553 17 9A7 7 0 103 9c0 3.552 2.03 6.232 3.354 7.585.83.799 1.654 1.379 2.274 1.765.311.193.57.337.757.433a5.74 5.74 0 00.281.14l.018.008.006.003zM10 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" />
                </svg>
                <select
                  name="location"
                  defaultValue={filters.location}
                  aria-label="Filter by location"
                  style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', fontSize: 16, appearance: 'none', WebkitAppearance: 'none' } as React.CSSProperties}
                >
                  <option value="">Anywhere</option>
                  {options.locations.map((item) => (
                    <option key={item} value={item.toLowerCase()}>{item}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="px-5 text-sm font-bold bg-primary text-primary-fg shrink-0">
                Search →
              </button>
            </div>
            {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
          </Form>
        </section>

        <section className="mt-5">
          <p className="text-xs font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
            {totalFilteredJobs} role{totalFilteredJobs === 1 ? '' : 's'} found
          </p>

        {filteredJobs.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-10 text-center">
            <p className="text-lg font-semibold text-text-primary">No matching roles</p>
            <p className="text-sm mt-1 text-text-muted">Try changing your search terms or category.</p>
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
                    className="block rounded-[14px] border border-border bg-surface px-5 py-[18px] no-underline transition-transform duration-150 hover:-translate-y-[1px]"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex items-center gap-4 flex-1">
                        <div className="w-[42px] h-[42px] rounded-[10px] border border-border bg-background shrink-0 overflow-hidden flex items-center justify-center">
                          {job.companyLogoUrl ? (
                            <img
                              src={job.companyLogoUrl}
                              alt={job.company ?? ''}
                              className="w-full h-full object-contain p-1"
                              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex' }}
                            />
                          ) : null}
                          <span className="text-xs font-extrabold font-display text-text-secondary" style={{ display: job.companyLogoUrl ? 'none' : 'flex' }}>{companyInitials(job.company)}</span>
                        </div>

                        <div className="min-w-0">
                          <h2
                            className="text-sm font-bold leading-[1.25] truncate font-display text-text-primary"
                          >
                            {job.title}
                          </h2>
                          <div className="mt-1 flex items-center gap-2 text-xs flex-wrap text-text-secondary">
                            {job.company ? <span className="text-text-primary font-semibold">{job.company}</span> : null}
                            <span className="inline-block w-[3px] h-[3px] rounded-full bg-border" />
                            <span>{job.location || 'Location flexible'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-[0.04em] px-2 py-0.5 rounded-md" style={{ backgroundColor: remote.bg, color: remote.fg }}>
                          {remote.label}
                        </span>
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
                  className={`pill pill-inactive ${pagination.page === 1 ? 'pill-disabled' : ''}`}
                >
                  Prev
                </Link>

                {pageWindow.map((page, idx) => {
                  const prev = pageWindow[idx - 1]
                  const showGap = prev && page - prev > 1
                  return (
                    <div key={page} className="flex items-center gap-1.5">
                      {showGap ? <span className="px-1 text-xs text-text-muted">…</span> : null}
                      <Link
                        to={makePageHref(page)}
                        className={`pill min-w-9 text-center ${page === pagination.page ? 'pill-active' : 'pill-inactive'}`}
                      >
                        {page}
                      </Link>
                    </div>
                  )
                })}

                <Link
                  to={makePageHref(Math.min(pagination.totalPages, pagination.page + 1))}
                  className={`pill pill-inactive ${pagination.page === pagination.totalPages ? 'pill-disabled' : ''}`}
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
