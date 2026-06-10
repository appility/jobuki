import { useLoaderData, useOutletContext, Link } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { getDb, boards, jobs } from '@jobuki/db'
import { and, desc, eq } from 'drizzle-orm'
import { resolveJobBoardThemeConfig, type Board } from '@jobuki/types'
import { deriveJobCategory, resolveBoardCategories, titleCaseCategory } from '../../lib/board-categories'
import { publicJobPath } from '../../lib/public-job-path'
import { normalizeLocation } from '../../lib/normalize-location'
import { getGeoRegions, scoreJob } from '../../lib/geo-ranking.server'

const PAGE_SIZE = 20

export async function loader({ params, request }: LoaderFunctionArgs) {
  const countrySlug = params.country?.toLowerCase()
  const regions = await getGeoRegions()
  const region = regions.find(r => r.slug === countrySlug)
  if (!region) throw new Response('Not found', { status: 404 })

  const boardSlug     = request.headers.get('x-board-slug')
  const boardHostname = request.headers.get('x-board-hostname')
  const boardType     = request.headers.get('x-board-type')

  const db = getDb()
  let board = null
  if (boardType === 'custom' && boardHostname) {
    board = await db.query.boards.findFirst({ where: eq(boards.customDomain, boardHostname) })
  } else if (boardSlug) {
    board = await db.query.boards.findFirst({ where: eq(boards.slug, boardSlug) })
  }
  if (!board || board.status !== 'live') throw new Response('Not found', { status: 404 })

  const boardConfig = resolveJobBoardThemeConfig(board.boardConfig, { boardName: board.name })
  const boardCategories = resolveBoardCategories(boardConfig.categories)

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()

  const allJobs = await db.query.jobs.findMany({
    where: and(eq(jobs.boardId, board.id), eq(jobs.status, 'published')),
    orderBy: [desc(jobs.createdAt)],
  })

  // Filter to jobs that belong to this region
  const regionJobs = allJobs.filter(job => {
    const score = scoreJob(job, region, regions)
    return score >= 3 // exact region or remote match
  })

  const filtered = regionJobs.filter(job => {
    if (!q) return true
    return job.title.toLowerCase().includes(q) ||
      (job.company ?? '').toLowerCase().includes(q)
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedJobs = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const categories = Array.from(new Set(
    regionJobs.map(j => deriveJobCategory(j, boardCategories)).filter(Boolean)
  )).sort()

  return {
    region: { slug: region.slug, label: region.label, flag: region.flag },
    jobs: paginatedJobs,
    totalJobs: filtered.length,
    pagination: { page: currentPage, totalPages },
    categories,
    q,
  }
}

export const meta: MetaFunction<typeof loader> = ({ data, matches }) => {
  if (!data) return []
  const layout = matches.find(m => (m.data as any)?.board)
  const board = (layout?.data as any)?.board
  const boardName = board?.name ?? 'Jobs'
  const { region } = data
  return [
    { title: `${region.flag ?? ''} ${boardName} — ${region.label} Jobs`.trim() },
    { name: 'description', content: `Browse ${data.totalJobs} ${region.label} jobs on ${boardName}. Find the best roles available now.` },
  ]
}

export default function CountryJobsPage() {
  const { region, jobs: filteredJobs, totalJobs, pagination, categories, q } = useLoaderData<typeof loader>()
  const { board } = useOutletContext<{ board: Board }>()
  const boardConfig = resolveJobBoardThemeConfig(board.boardConfig, { boardName: board.name })
  const boardCategories = resolveBoardCategories(boardConfig.categories)

  function salaryLabel(job: typeof filteredJobs[0]) {
    if (!job.salaryMin && !job.salaryMax) return 'Salary not listed'
    const low = job.salaryMin ? `${job.salaryCurrency}${job.salaryMin.toLocaleString()}` : null
    const high = job.salaryMax ? `${job.salaryCurrency}${job.salaryMax.toLocaleString()}` : null
    return [low, high].filter(Boolean).join(' – ') + (job.salaryPeriod ? ` / ${job.salaryPeriod}` : '')
  }

  function makePageHref(p: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (p > 1) params.set('page', String(p))
    const qs = params.toString()
    return qs ? `/jobs/country/${region.slug}?${qs}` : `/jobs/country/${region.slug}`
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-10 pb-20">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Link to="/jobs" className="text-xs text-text-muted no-underline">← All roles</Link>
          </div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.03em] font-display text-text-primary">
            {region.flag && <span className="mr-2">{region.flag}</span>}
            {region.label} Jobs
          </h1>
          <p className="text-sm mt-1 text-text-secondary">{totalJobs} role{totalJobs !== 1 ? 's' : ''}</p>
        </div>

        {/* Category pills */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {categories.map(cat => (
              <Link
                key={cat}
                to={`/jobs/category/${cat}`}
                className="pill pill-inactive"
              >
                {titleCaseCategory(cat)}
              </Link>
            ))}
          </div>
        )}

        {/* Job list */}
        {filteredJobs.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface p-10 text-center">
            <p className="text-lg font-semibold text-text-primary">No {region.label} roles right now</p>
            <p className="text-sm mt-1 text-text-muted">Check back soon or <Link to="/jobs" className="text-primary no-underline">browse all roles</Link>.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {filteredJobs.map(job => {
              const salary = salaryLabel(job)
              return (
                <Link
                  key={job.id}
                  to={publicJobPath(job)}
                  className="block rounded-[14px] border border-border bg-surface px-5 py-[18px] no-underline transition-transform duration-150 hover:-translate-y-[1px]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold truncate font-display text-text-primary">{job.title}</h2>
                      <div className="mt-1 flex items-center gap-2 text-xs flex-wrap text-text-secondary">
                        {job.company && <span className="text-text-primary font-semibold">{job.company}</span>}
                        <span className="inline-block w-[3px] h-[3px] rounded-full bg-border" />
                        <span>{normalizeLocation(job.location) || 'Location flexible'}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-xs font-semibold text-text-secondary">{salary}</p>
                      <p className="text-[10px] text-text-muted capitalize mt-0.5">{job.remotePolicy}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
            <span className="text-xs text-text-muted">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              {pagination.page > 1 && (
                <Link to={makePageHref(pagination.page - 1)} className="btn-outline text-sm">← Prev</Link>
              )}
              {pagination.page < pagination.totalPages && (
                <Link to={makePageHref(pagination.page + 1)} className="btn-outline text-sm">Next →</Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
