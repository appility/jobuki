import { Form, Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { getDb, boards, jobs, jobBoardListings } from '@jobuki/db'
import { MarketingNav, MarketingHero, MarketingAudience, MarketingCTA, MarketingFooter } from '../../components/marketing'
import { eq, and, desc, ilike, or, sql } from 'drizzle-orm'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import { resolveTheme, themeToCSS } from '../../lib/theme'
import { deriveJobCategory, normalizeCategory, resolveBoardCategories, titleCaseCategory } from '../../lib/board-categories'
import { normalizeLocation, normalizeLocations } from '../../lib/normalize-location'
import { getGeoRegions, visitorRegion, rankJobs } from '../../lib/geo-ranking.server'
import { cacheGet, cacheSet, cacheInvalidate } from '../../lib/redis-cache.server'
import { publicJobPath } from '../../lib/public-job-path'
import { getOptionalUser } from '../../lib/auth.server'
import { PublicBoardHome } from '../../components/public-board-home'

export type BoardLoaderData = Awaited<ReturnType<typeof loader>> & { mode: 'board' }

export async function loader({ request }: LoaderFunctionArgs) {
  const boardSlug     = request.headers.get('x-board-slug')
  const boardHostname = request.headers.get('x-board-hostname')
  const boardType     = request.headers.get('x-board-type')

  if (!boardSlug && !boardHostname) return { mode: 'marketing' as const }

  const db = getDb()
  let board = null
  try {
    if (boardSlug) {
      board = await db.query.boards.findFirst({ where: eq(boards.slug, boardSlug) })
    } else if (boardType === 'custom' && boardHostname) {
      board = await db.query.boards.findFirst({ where: eq(boards.customDomain, boardHostname) })
    }
  } catch (err) {
    console.error('[board-home] DB error:', err)
    throw new Response(`DB error: ${err}`, { status: 500 })
  }

  if (!board || board.status !== 'live') {
    throw new Response('Board not found', { status: 404 })
  }

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

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const location = (url.searchParams.get('location') ?? '').trim().toLowerCase()
  const category = normalizeCategory(url.searchParams.get('category') ?? url.searchParams.get('department'))

  const LEAN_COLS = {
    descriptionJson: false,
    description: false,
    requirements: false,
    benefits: false,
    applicationTips: false,
    externalApplyUrl: false,
    externalListingUrl: false,
  } as const

  const baseWhere = and(eq(jobBoardListings.boardId, board.id), eq(jobBoardListings.status, 'published'))
  const hasFilters = Boolean(q || location || category)

  // Geo ranking — float region-relevant jobs to the top
  const regions = await getGeoRegions()
  const vRegion = visitorRegion(request, regions)

  // When filters are active, query only the matching rows from DB (no full load).
  // When no filters, use cache + geo-rank for the default board view.
  let filteredJobs: (typeof jobs.$inferSelect)[]
  let publishedJobs: Pick<typeof jobs.$inferSelect, 'primaryCategory' | 'categoryTags' | 'location' | 'company'>[]

  if (hasFilters) {
    const filterConditions = []
    if (q) filterConditions.push(or(ilike(jobs.title, `%${q}%`), ilike(jobs.company, `%${q}%`), ilike(jobs.location, `%${q}%`)))
    if (location) filterConditions.push(ilike(jobs.location, `%${location}%`))
    if (category) filterConditions.push(or(eq(jobs.primaryCategory, category), sql`${jobs.categoryTags} @> ARRAY[${category}]::text[]`))
    const filteredWhere = and(baseWhere, ...filterConditions)

    const [filtered, meta] = await Promise.all([
      db
        .select({
          id: jobs.id, title: jobs.title, company: jobs.company, location: jobs.location,
          remotePolicy: jobs.remotePolicy, employmentType: jobs.employmentType,
          primaryCategory: jobs.primaryCategory, categoryTags: jobs.categoryTags,
          companyLogoUrl: jobs.companyLogoUrl, externalSource: jobs.externalSource,
          createdAt: jobs.createdAt, updatedAt: jobs.updatedAt,
        })
        .from(jobs)
        .innerJoin(jobBoardListings, eq(jobs.id, jobBoardListings.jobId))
        .where(filteredWhere)
        .orderBy(desc(jobs.createdAt)),
      db
        .select({
          id: jobs.id, title: jobs.title, company: jobs.company, location: jobs.location,
          remotePolicy: jobs.remotePolicy, employmentType: jobs.employmentType,
          primaryCategory: jobs.primaryCategory, categoryTags: jobs.categoryTags,
          companyLogoUrl: jobs.companyLogoUrl, externalSource: jobs.externalSource,
          createdAt: jobs.createdAt, updatedAt: jobs.updatedAt,
        })
        .from(jobs)
        .innerJoin(jobBoardListings, eq(jobs.id, jobBoardListings.jobId))
        .where(baseWhere),
    ])
    filteredJobs = filtered
    publishedJobs = meta
  } else {
    const cacheKey = `board:${board.id}:publishedJobs`
    let cached = await cacheGet<any[]>(cacheKey)
    if (!cached) {
      const rows = await db
        .select({
          id: jobs.id, title: jobs.title, company: jobs.company, location: jobs.location,
          remotePolicy: jobs.remotePolicy, employmentType: jobs.employmentType,
          primaryCategory: jobs.primaryCategory, categoryTags: jobs.categoryTags,
          companyLogoUrl: jobs.companyLogoUrl, externalSource: jobs.externalSource,
          createdAt: jobs.createdAt, updatedAt: jobs.updatedAt,
        })
        .from(jobs)
        .innerJoin(jobBoardListings, eq(jobs.id, jobBoardListings.jobId))
        .where(baseWhere)
        .orderBy(desc(jobs.createdAt))
      cached = rows
      await cacheSet(cacheKey, cached)
    }
    filteredJobs = rankJobs(cached, vRegion, regions)
    publishedJobs = cached
  }

  const locations = normalizeLocations(publishedJobs.map((job) => job.location))

  const derivedCategories = Array.from(
    new Set(
      publishedJobs
        .map((job) => deriveJobCategory(job as any, boardCategories))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))

  const categories = (boardCategories.length ? boardCategories : derivedCategories).map((value) => ({
    value,
    label: titleCaseCategory(value),
  }))

  const totalOpen = publishedJobs.length
  const totalCompanies = new Set(publishedJobs.map(j => j.company).filter(Boolean)).size

  const css = themeToCSS(resolveTheme(board.theme ?? {}), ':root', boardConfig.cssVariables)
  const user = await getOptionalUser(request)
  return {
    mode: 'board' as const,
    board,
    css,
    jobs: filteredJobs,
    totalOpen,
    totalCompanies,
    geoRegions: regions.map(r => ({ slug: r.slug, label: r.label, flag: r.flag })),
    visitorRegionSlug: vRegion?.slug ?? null,
    filters: { q, location, category },
    filterOptions: { locations, categories },
    user,
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data || data.mode === 'marketing') {
    return [
      { title: 'Jobuki | Modern Job Boards' },
      { name: 'description', content: 'Create branded job boards and publish roles with Jobuki.' },
    ]
  }

  const boardConfig = resolveJobBoardThemeConfig(data.board.boardConfig, { boardName: data.board.name })
  const seo = boardConfig.seo ?? {}
  return [
    { title: seo.metaTitle || `${data.board.name} Jobs` },
    {
      name: 'description',
      content: seo.metaDescription || data.board.introText?.trim() || `Explore open roles at ${data.board.name}.`,
    },
    ...(seo.ogImageUrl ? [{ property: 'og:image', content: seo.ogImageUrl }] : []),
  ]
}

export default function Home() {
  const data = useLoaderData<typeof loader>()
  if (data.mode === 'board') return <PublicBoardHome data={data} />
  return <MarketingHome />
}

// ── Marketing home ────────────────────────────────────────────────────
function MarketingHome() {
  return (
    <div style={{ background: '#faf8f5', minHeight: '100vh' }}>
      <MarketingNav />
      <MarketingHero />
      <MarketingAudience />
      <MarketingCTA />
      <MarketingFooter />
    </div>
  )
}
