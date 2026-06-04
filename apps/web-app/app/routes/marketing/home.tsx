import { Form, Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { getDb, boards, jobs } from '@jobuki/db'
import { eq, and, desc } from 'drizzle-orm'
import { resolveTheme, themeToCSS } from '../../lib/theme'
import { resolveJobBoardThemeConfig } from '@jobuki/types'

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

  const publishedJobs = await db.query.jobs.findMany({
    where: and(eq(jobs.boardId, board.id), eq(jobs.status, 'published')),
    orderBy: [desc(jobs.createdAt)],
  })

  const url = new URL(request.url)
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase()
  const location = (url.searchParams.get('location') ?? '').trim().toLowerCase()
  const department = (url.searchParams.get('department') ?? '').trim().toLowerCase()

  const filteredJobs = publishedJobs.filter((job) => {
    const qMatch =
      !q ||
      job.title.toLowerCase().includes(q) ||
      (job.company ?? '').toLowerCase().includes(q) ||
      (job.location ?? '').toLowerCase().includes(q)

    const locationMatch = !location || (job.location ?? '').toLowerCase() === location
    const departmentMatch = !department || job.employmentType.toLowerCase() === department

    return qMatch && locationMatch && departmentMatch
  })

  const locations = Array.from(
    new Set(
      publishedJobs
        .map((job) => (job.location ?? '').trim())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))

  const departments = Array.from(
    new Set(publishedJobs.map((job) => job.employmentType))
  )

  const css = themeToCSS(resolveTheme(board.theme ?? {}))
  return {
    mode: 'board' as const,
    board,
    css,
    jobs: filteredJobs,
    totalOpen: publishedJobs.length,
    filters: { q, location, department },
    filterOptions: { locations, departments },
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
  if (data.mode === 'board') return <BoardHome data={data} />
  return <MarketingHome />
}

// ── Helpers ───────────────────────────────────────────────────────────
function formatSalary(min: number | null, max: number | null, currency: string, period: string) {
  const fmt = (n: number) => n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`
  if (min && max) return `${currency}${fmt(min)} – ${currency}${fmt(max)}`
  if (min) return `From ${currency}${fmt(min)}`
  if (max) return `Up to ${currency}${fmt(max)}`
  return null
}

const REMOTE_LABEL: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'On-site',
}

const TYPE_LABEL: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  freelance: 'Freelance',
  internship: 'Internship',
}

// ── Board home ────────────────────────────────────────────────────────
function BoardHome({ data }: { data: Extract<Awaited<ReturnType<typeof loader>>, { mode: 'board' }> }) {
  const { board, jobs: publishedJobs, css, totalOpen, filters, filterOptions } = data
  const boardConfig = resolveJobBoardThemeConfig(board.boardConfig, {
    boardName: board.name,
    tagline: board.introText ?? undefined,
    logoUrl: board.logoUrl ?? undefined,
    headerImageUrl: board.heroImageUrl ?? undefined,
    brandColor: (board.theme as any)?.colorPrimary,
    accentColor: (board.theme as any)?.colorAccent,
    backgroundColor: (board.theme as any)?.colorBackground,
  })
  const logoUrl = (boardConfig.logoUrl ?? '').trim()
  const heroImageUrl = (boardConfig.headerImageUrl ?? '').trim()
  const headerHasImage = !!heroImageUrl
  const hasLogo = logoUrl.length > 0
  const emptyCtaLabel = (boardConfig.emptyState.ctaLabel ?? '').trim()
  const emptyCtaUrl = boardConfig.emptyState.ctaUrl || '#'
  const fallbackTagline = totalOpen === 0 ? 'No open positions right now' : 'Explore open roles'
  const heroTextColor = headerHasImage ? '#fff' : 'var(--header-text)'
  const heroMutedColor = headerHasImage ? 'rgba(255,255,255,0.84)' : 'var(--header-muted)'

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: boardConfig.backgroundColor || 'var(--color-background)',
        fontFamily: 'var(--font-body)',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Top bar */}
      <div style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="board-container py-4 md:py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {hasLogo ? (
              <img
                src={logoUrl}
                alt={boardConfig.boardName}
                width={280}
                height={96}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="h-16 md:h-20 lg:h-24 w-auto max-w-[220px] md:max-w-[280px] object-contain shrink-0"
              />
            ) : (
              <div className="min-w-0">
                <p className="text-[16px] md:text-[18px] font-extrabold leading-tight truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {boardConfig.boardName}
                </p>
                <p className="text-[13px] md:text-[14px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {boardConfig.tagline || board.introText || fallbackTagline}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {boardConfig.footer.companyWebsiteUrl && (
              <a
                href={boardConfig.footer.companyWebsiteUrl}
                target="_blank"
                rel="noreferrer"
                className="btn-outline text-[13px] whitespace-nowrap"
              >
                View company site
              </a>
            )}
            {emptyCtaLabel && (
              <a href={emptyCtaUrl} target="_blank" rel="noreferrer" className="btn-primary text-[13px] whitespace-nowrap px-5 py-2.5">
                {emptyCtaLabel}
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Header */}
      <header
        style={{
          background:
            headerHasImage
              ? `url(${heroImageUrl}) center / cover no-repeat`
              : boardConfig.headerStyle === 'gradient'
                ? `linear-gradient(120deg, ${boardConfig.brandColor} 0%, ${boardConfig.accentColor || boardConfig.brandColor} 100%)`
                : 'var(--header-bg)',
          borderBottom: '1px solid var(--header-border)',
          ...(headerHasImage ? {
            position: 'relative',
          } : {}),
        }}
      >
        {/* Overlay for hero image readability */}
        {headerHasImage && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(10,14,22,0.56) 0%, rgba(10,14,22,0.36) 100%)',
          }} />
        )}
        <div className="board-container py-12 md:py-16" style={{ position: 'relative', minHeight: 320 }}>
          <h1 className="text-[42px] md:text-[56px] lg:text-[62px] font-extrabold leading-[0.95] tracking-[-0.02em] max-w-[14ch]"
            style={{
              fontFamily: 'var(--font-display)',
              color: heroTextColor,
            }}>
            {boardConfig.boardName}
          </h1>
          {(boardConfig.tagline || board.introText) && (
            <p className="text-[18px] md:text-[22px] leading-[1.4] max-w-3xl mt-4"
              style={{ color: heroMutedColor }}>
              {boardConfig.tagline || board.introText}
            </p>
          )}
          {totalOpen > 0 ? (
            <p className="text-[24px] md:text-[26px] font-semibold mt-7" style={{ color: 'var(--color-accent)' }}>
              <span className="text-[40px] md:text-[44px] align-middle">{totalOpen}</span>
              <span className="text-[22px] md:text-[24px] font-normal ml-3 align-middle" style={{ color: heroMutedColor }}>
                open position{totalOpen !== 1 ? 's' : ''}
              </span>
            </p>
          ) : (
            <p className="text-[20px] md:text-[22px] font-semibold mt-7" style={{ color: heroMutedColor }}>
              No open positions right now
            </p>
          )}
        </div>
      </header>

      {boardConfig.showSearch && (
        <div className="board-container relative -mt-9 md:-mt-10 z-10">
          <Form method="get" className="p-3 md:p-4 rounded-[20px] grid grid-cols-1 md:grid-cols-4 gap-3 items-center"
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 12px 30px rgba(15, 23, 42, 0.12)',
            }}>
            <input
              id="jobs-search"
              aria-label="Search jobs"
              className="input text-[15px]"
              name="q"
              defaultValue={filters.q}
              placeholder="Search jobs, companies, or keywords"
            />
            <label htmlFor="jobs-location" className="sr-only">Location</label>
            <select id="jobs-location" className="input text-[15px]" name="location" defaultValue={filters.location}>
              <option value="">Any location</option>
              {filterOptions.locations.map((option) => (
                <option key={option} value={option.toLowerCase()}>{option}</option>
              ))}
            </select>
            {boardConfig.showFilters && (
              <>
                <label htmlFor="jobs-department" className="sr-only">Department</label>
                <select id="jobs-department" className="input text-[15px]" name="department" defaultValue={filters.department}>
                  <option value="">All departments</option>
                  {filterOptions.departments.map((option) => (
                    <option key={option} value={option.toLowerCase()}>{TYPE_LABEL[option] ?? option}</option>
                  ))}
                </select>
              </>
            )}
            <button type="submit" className="btn-primary text-[15px] whitespace-nowrap h-[44px]">Search jobs</button>
          </Form>
        </div>
      )}

      {/* Jobs */}
      <main className="board-container pt-12 pb-14 md:pt-14">
        {publishedJobs.length === 0 ? (
          <div
            className="mx-auto text-center px-8 py-12 md:px-12 md:py-14 rounded-[22px]"
            style={{
              maxWidth: 740,
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
            }}
          >
            <div className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center text-[28px]"
              style={{ backgroundColor: 'var(--color-surface-subtle)' }}>
              {boardConfig.emptyState.icon === 'briefcase' ? '💼' :
                boardConfig.emptyState.icon === 'sparkle' ? '✨' :
                  boardConfig.emptyState.icon === 'inbox' ? '📥' : '🔎'}
            </div>
            <p className="text-[24px] md:text-[28px] font-semibold mb-3"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
              {boardConfig.emptyState.title}
            </p>
            <p className="text-[15px] md:text-[16px] leading-7 max-w-xl mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
              {boardConfig.emptyState.description}
            </p>
            {(boardConfig.emptyState.ctaLabel || boardConfig.emptyState.ctaUrl) && (
              <a
                href={emptyCtaUrl}
                className="btn-primary inline-flex mt-7 text-[15px] px-7 py-3"
                target="_blank"
                rel="noreferrer"
              >
                {emptyCtaLabel}
              </a>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {publishedJobs.map(job => {
              const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryPeriod)
              return (
                <Link key={job.id} to={`/jobs/${job.id}`} className="job-card no-underline block group">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      {/* Title row */}
                      <div className="flex items-start gap-3 mb-2">
                        <h2 className="text-base font-bold leading-snug"
                          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
                          {job.title}
                        </h2>
                      </div>

                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {job.company && (
                          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {job.company}
                          </span>
                        )}
                        {job.company && (job.location || job.remotePolicy) && (
                          <span style={{ color: 'var(--color-border-strong)' }}>·</span>
                        )}
                        {job.location && (
                          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                            {job.location}
                          </span>
                        )}

                        {/* Tags */}
                        <span style={{ color: 'var(--color-border-strong)' }}>·</span>
                        <Tag color="primary">{REMOTE_LABEL[job.remotePolicy] ?? job.remotePolicy}</Tag>
                        <Tag color="muted">{TYPE_LABEL[job.employmentType] ?? job.employmentType}</Tag>
                        {salary && <Tag color="muted">{salary}</Tag>}
                      </div>
                    </div>

                    {/* CTA */}
                    <button className="btn-accent text-sm shrink-0">
                      Apply
                    </button>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <footer className="board-container py-10 mt-2"
        style={{ borderTop: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-center gap-6 mb-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          <span>X</span>
          <span>LinkedIn</span>
          <span>Website</span>
        </div>
        <p className="text-[13px] text-center" style={{ color: 'var(--color-text-secondary)' }}>
          {board.footerText || (
            boardConfig.footer.showPoweredBy
              ? <><span>Powered by </span><span className="font-extrabold" style={{ color: 'var(--color-text-secondary)' }}>Jobuki</span></>
              : (
                boardConfig.footer.companyWebsiteUrl
                  ? <a href={boardConfig.footer.companyWebsiteUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-text-secondary)' }}>{boardConfig.boardName}</a>
                  : boardConfig.boardName
              )
          )}
        </p>
      </footer>
    </div>
  )
}

function Tag({ children, color }: { children: React.ReactNode; color: 'primary' | 'muted' }) {
  return (
    <span
      className="badge text-xs"
      style={color === 'primary' ? {
        backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
        color: 'var(--color-primary)',
      } : {
        backgroundColor: 'var(--color-surface-subtle)',
        color: 'var(--color-text-secondary)',
        border: '1px solid var(--color-border)',
      }}
    >
      {children}
    </span>
  )
}

// ── Marketing home ────────────────────────────────────────────────────
function MarketingHome() {
  const marketingSymbols = [
    { tx: '-220px', ty: '-120px', delay: '-0.2s', burst: '8.4s', drift: '4.8s', color: '#4F46E5' },
    { tx: '-170px', ty: '84px', delay: '-1.8s', burst: '7.8s', drift: '5.4s', color: '#F97316' },
    { tx: '-60px', ty: '-170px', delay: '-0.9s', burst: '8.9s', drift: '4.3s', color: '#0F766E' },
    { tx: '72px', ty: '-176px', delay: '-2.4s', burst: '7.6s', drift: '4.9s', color: '#D97706' },
    { tx: '190px', ty: '-92px', delay: '-1.1s', burst: '8.2s', drift: '5.1s', color: '#DB2777' },
    { tx: '220px', ty: '70px', delay: '-2.1s', burst: '8.6s', drift: '4.5s', color: '#2563EB' },
    { tx: '105px', ty: '168px', delay: '-0.4s', burst: '7.4s', drift: '5.2s', color: '#7C3AED' },
    { tx: '-116px', ty: '166px', delay: '-2.9s', burst: '8.1s', drift: '4.7s', color: '#0891B2' },
  ]

  const marketCards = [
    {
      title: 'For Recruiters',
      cta: 'Explore recruiter plans',
      to: '/for/recruiters',
    },
    {
      title: 'For Companies',
      cta: 'Explore company plans',
      to: '/for/companies',
    },
    {
      title: 'For Communities & Charities',
      cta: 'Explore community plans',
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
              Build a job board. Grow an audience. Monetize listings.
              <span className="marketing-minutes-slot">
                <span className="marketing-minutes-cycle">in minutes</span>
              </span>
            </h1>
            <p className="text-base md:text-lg max-w-2xl mx-auto mt-5" style={{ color: 'var(--color-text-secondary)' }}>
              Jobuki helps recruiters, companies, and mission-led communities launch branded boards and create new value from hiring demand.
            </p>
            <div className="mt-7 flex justify-center">
              <Link to="/dashboard" className="btn-primary text-base px-8 py-3">
                Create your board →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-7 md:mt-9 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {marketCards.map((card) => (
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
      </section>
    </div>
  )
}
