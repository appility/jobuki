import { Form, Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { getDb, boards, jobs } from '@jobuki/db'
import { eq, and, desc } from 'drizzle-orm'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import { resolveTheme, themeToCSS } from '../../lib/theme'
import { deriveJobCategory, normalizeCategory, resolveBoardCategories, titleCaseCategory } from '../../lib/board-categories'
import { normalizeLocation, normalizeLocations } from '../../lib/normalize-location'
import { cacheGet, cacheSet } from '../../lib/board-cache.server'
import { publicJobPath } from '../../lib/public-job-path'
import { PublicBoardHome } from '../../components/public-board-home'

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

  const cacheKey = `board:${board.id}:publishedJobs`
  let publishedJobs = cacheGet<typeof jobs.$inferSelect[]>(cacheKey)
  if (!publishedJobs) {
    publishedJobs = await db.query.jobs.findMany({
      where: and(eq(jobs.boardId, board.id), eq(jobs.status, 'published')),
      orderBy: [desc(jobs.createdAt)],
    })
    cacheSet(cacheKey, publishedJobs)
  }

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const location = (url.searchParams.get('location') ?? '').trim().toLowerCase()
  const category = normalizeCategory(url.searchParams.get('category') ?? url.searchParams.get('department'))

  const filteredJobs = publishedJobs.filter((job) => {
    const qMatch =
      !q ||
      job.title.toLowerCase().includes(q) ||
      (job.company ?? '').toLowerCase().includes(q) ||
      (job.location ?? '').toLowerCase().includes(q)

    const locationMatch = !location || normalizeLocation(job.location).toLowerCase() === location
    const jobCategory = deriveJobCategory(job, boardCategories)
    const categoryMatch = !category || jobCategory === category

    return qMatch && locationMatch && categoryMatch
  })

  const locations = normalizeLocations(publishedJobs.map((job) => job.location))

  const derivedCategories = Array.from(
    new Set(
      publishedJobs
        .map((job) => deriveJobCategory(job, boardCategories))
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))

  const categories = (boardCategories.length ? boardCategories : derivedCategories).map((value) => ({
    value,
    label: titleCaseCategory(value),
  }))

  const totalCompanies = new Set(publishedJobs.map(j => j.company).filter(Boolean)).size

  const css = themeToCSS(resolveTheme(board.theme ?? {}), ':root', boardConfig.cssVariables)
  return {
    mode: 'board' as const,
    board,
    css,
    jobs: filteredJobs,
    totalOpen: publishedJobs.length,
    totalCompanies,
    filters: { q, location, category },
    filterOptions: { locations, categories },
  }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data || data.mode === 'marketing') {
    return [
      { title: 'Jobuki | Modern Job Boards' },
      { name: 'description', content: 'Create branded job boards and publish roles with Jobuki.' },
    ]
  }

  return [
    { title: `${data.board.name} Jobs` },
    {
      name: 'description',
      content: data.board.introText?.trim() || `Explore open roles at ${data.board.name}.`,
    },
  ]
}

export default function Home() {
  const data = useLoaderData<typeof loader>()
  if (data.mode === 'board') return <PublicBoardHome data={data} />
  return <MarketingHome />
}

// ── Marketing home ────────────────────────────────────────────────────
function MarketingHome() {
  const marketingSymbols = [
    { tx: '-240px', ty: '86px', delay: '-0.2s', burst: '8.4s', drift: '4.8s', color: '#4F46E5' },
    { tx: '-182px', ty: '124px', delay: '-1.8s', burst: '7.8s', drift: '5.4s', color: '#F97316' },
    { tx: '-118px', ty: '188px', delay: '-0.9s', burst: '8.9s', drift: '4.3s', color: '#0F766E' },
    { tx: '-36px', ty: '236px', delay: '-2.4s', burst: '7.6s', drift: '4.9s', color: '#D97706' },
    { tx: '42px', ty: '232px', delay: '-1.1s', burst: '8.2s', drift: '5.1s', color: '#DB2777' },
    { tx: '126px', ty: '184px', delay: '-2.1s', burst: '8.6s', drift: '4.5s', color: '#2563EB' },
    { tx: '196px', ty: '128px', delay: '-0.4s', burst: '7.4s', drift: '5.2s', color: '#7C3AED' },
    { tx: '244px', ty: '88px', delay: '-2.9s', burst: '8.1s', drift: '4.7s', color: '#0891B2' },
  ]

  const typeCards = [
    {
      title: 'For recruiters',
      cta: 'Explore recruiter boards',
      to: '/for/recruiters',
    },
    {
      title: 'For companies',
      cta: 'Explore company boards',
      to: '/for/companies',
    },
    {
      title: 'For communities and charities',
      cta: 'Explore community boards',
      to: '/for/communities',
    },
  ]

  return (
    <div
      className="min-h-screen px-6 py-12 md:py-14"
      style={{
        background:
          'radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--color-primary) 10%, transparent) 0%, transparent 42%), radial-gradient(circle at 90% 80%, color-mix(in srgb, var(--color-accent) 12%, transparent) 0%, transparent 44%), var(--color-background)',
      }}
    >
      <section className="w-full max-w-5xl mx-auto">
        <div
          className="text-center rounded-[28px] px-7 py-10 md:px-10 md:py-12 relative overflow-hidden"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div className="marketing-symbol-cloud" aria-hidden="true">
            {marketingSymbols.map((symbol, index) => (
              <span
                key={`symbol-${index}`}
                className="marketing-symbol-node"
                style={{
                  '--tx': symbol.tx,
                  '--ty': symbol.ty,
                  '--burst-duration': symbol.burst,
                  '--drift-duration': symbol.drift,
                  '--delay': symbol.delay,
                  '--symbol-color': symbol.color,
                } as React.CSSProperties}
              >
                <svg
                  className="marketing-symbol-browser"
                  viewBox="0 0 50 50"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    d="M0 0 C13.86 0 27.72 0 42 0 C42 11.88 42 23.76 42 36 C28.14 36 14.28 36 0 36 C0 24.12 0 12.24 0 0 Z M2 8 C1.979375 12.104375 1.95875 16.20875 1.9375 20.4375 C1.928396 21.73357178 1.91929199 23.02964355 1.90991211 24.36499023 C1.90741455 25.37762939 1.90491699 26.39026855 1.90234375 27.43359375 C1.89710693 28.47572021 1.89187012 29.51784668 1.88647461 30.59155273 C1.72694444 32.95128747 1.72694444 32.95128747 3 34 C5.65456193 34.10095564 8.28255176 34.13970998 10.9375 34.1328125 C12.13040649 34.13424759 12.13040649 34.13424759 13.34741211 34.13571167 C15.0320646 34.13639343 16.71671971 34.13453943 18.40136719 34.13037109 C20.98899197 34.12502275 23.57644316 34.13031619 26.1640625 34.13671875 C27.79687539 34.13605797 29.42968816 34.1347768 31.0625 34.1328125 C31.84165771 34.13483673 32.62081543 34.13686096 33.42358398 34.13894653 C37.007942 34.4583958 37.007942 34.4583958 40 33 C40.08737645 31.14630389 40.10698153 29.28932459 40.09765625 27.43359375 C40.09515869 26.42095459 40.09266113 25.40831543 40.09008789 24.36499023 C40.08098389 23.06891846 40.07187988 21.77284668 40.0625 20.4375 C40.041875 16.333125 40.02125 12.22875 40 8 C27.46 8 14.92 8 2 8 Z"
                    fill="currentColor"
                    transform="translate(4,7)"
                  />
                </svg>
              </span>
            ))}
          </div>

          <div className="relative z-10">
            <p
              className="text-xs font-bold tracking-[0.14em] uppercase mb-3"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Hiring platform
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.05]" style={{ color: 'var(--color-text-primary)' }}>
              Build a branded job board.
              <span className="marketing-minutes-slot">
                <span className="marketing-minutes-cycle">in minutes</span>
              </span>
            </h1>
            <p className="text-base md:text-lg max-w-2xl mx-auto mt-5" style={{ color: 'var(--color-text-secondary)' }}>
              Jobuki helps recruiters, companies, and communities launch branded boards and run hiring with workflows tailored to how they hire.
            </p>
            <div className="mt-7 flex justify-center">
              <Link to="/dashboard" className="btn-primary text-base px-8 py-3">
                Create your board →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-7 md:mt-9">
          <p className="text-xs font-bold tracking-[0.14em] uppercase mb-3 px-1" style={{ color: 'var(--color-text-muted)' }}>
            Choose your audience
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {typeCards.map((card) => (
            <article
              key={card.title}
              className="rounded-[20px] p-5 md:p-6 h-full"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--color-surface) 96%, transparent)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{card.title}</p>

              <div className="mt-4">
                <Link to={card.to} className="btn-outline text-sm px-4 py-2">
                  {card.cta}
                </Link>
              </div>
            </article>
          ))}
          </div>
        </div>
      </section>
    </div>
  )
}
