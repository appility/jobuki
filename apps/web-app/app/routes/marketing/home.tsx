import { Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
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

  if (!board) throw new Response('Board not found', { status: 404 })

  const publishedJobs = await db.query.jobs.findMany({
    where: and(eq(jobs.boardId, board.id), eq(jobs.status, 'published')),
    orderBy: [desc(jobs.createdAt)],
  })

  const css = themeToCSS(resolveTheme(board.theme ?? {}))
  return { mode: 'board' as const, board, jobs: publishedJobs, css }
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
  const { board, jobs: publishedJobs, css } = data
  const boardConfig = resolveJobBoardThemeConfig(board.boardConfig, {
    boardName: board.name,
    tagline: board.introText ?? undefined,
    logoUrl: board.logoUrl ?? undefined,
    headerImageUrl: board.heroImageUrl ?? undefined,
    brandColor: (board.theme as any)?.colorPrimary,
    accentColor: (board.theme as any)?.colorAccent,
    backgroundColor: (board.theme as any)?.colorBackground,
  })
  const headerHasImage = boardConfig.headerStyle === 'image' && !!boardConfig.headerImageUrl

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)', fontFamily: 'var(--font-body)' }}>
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* Header */}
      <header
        style={{
          background:
            headerHasImage
              ? `url(${boardConfig.headerImageUrl}) center / cover no-repeat`
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
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.3) 100%)',
          }} />
        )}
        <div className="board-container py-12" style={{ position: 'relative' }}>
          <div className="flex items-center gap-4 mb-5">
            {(boardConfig.logoUrl || board.logoUrl) && (
              <img src={boardConfig.logoUrl || board.logoUrl!} alt={boardConfig.boardName}
                className="w-12 h-12 rounded-xl object-contain"
                style={{
                  border: '1px solid rgba(255,255,255,0.2)',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(4px)',
                }} />
            )}
            <div>
              <h1 className="text-3xl font-extrabold leading-tight"
                style={{
                  fontFamily: 'var(--font-display)',
                  color: headerHasImage ? '#fff' : 'var(--header-text)',
                }}>
                {boardConfig.boardName}
              </h1>
              <p className="text-sm mt-0.5"
                style={{ color: headerHasImage ? 'rgba(255,255,255,0.75)' : 'var(--header-muted)' }}>
                {publishedJobs.length} open position{publishedJobs.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {(boardConfig.tagline || board.introText) && (
            <p className="text-base leading-relaxed max-w-lg"
              style={{ color: headerHasImage ? 'rgba(255,255,255,0.85)' : 'var(--header-muted)' }}>
              {boardConfig.tagline || board.introText}
            </p>
          )}
        </div>
      </header>

      {boardConfig.showSearch && (
        <div className="board-container py-4">
          <div className="input" style={{ color: 'var(--color-text-muted)' }}>
            Search roles...
          </div>
        </div>
      )}

      {/* Jobs */}
      <main className="board-container py-10">
        {publishedJobs.length === 0 ? (
          <div className="py-24 text-center">
            <div className="text-5xl mb-5">
              {boardConfig.emptyState.icon === 'briefcase' ? '💼' :
                boardConfig.emptyState.icon === 'sparkle' ? '✨' :
                  boardConfig.emptyState.icon === 'inbox' ? '📥' : '🔎'}
            </div>
            <p className="text-lg font-semibold mb-2"
              style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
              {boardConfig.emptyState.title}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {boardConfig.emptyState.description}
            </p>
            {boardConfig.emptyState.ctaLabel && boardConfig.emptyState.ctaUrl && (
              <a
                href={boardConfig.emptyState.ctaUrl}
                className="btn-primary inline-flex mt-4"
                target="_blank"
                rel="noreferrer"
              >
                {boardConfig.emptyState.ctaLabel}
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

      <footer className="board-container py-8 mt-4"
        style={{ borderTop: '1px solid var(--color-border)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
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
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 text-center px-6"
      style={{ backgroundColor: 'var(--color-background)' }}>
      <h1 className="text-5xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
        Launch a branded job board <span style={{ color: 'var(--color-primary)' }}>in minutes</span>
      </h1>
      <p className="text-lg max-w-xl" style={{ color: 'var(--color-text-secondary)' }}>
        Jobuki helps teams, recruiters and communities create beautiful job boards under their own brand.
      </p>
      <Link to="/dashboard" className="btn-primary text-base px-8 py-3">
        Create your board →
      </Link>
    </div>
  )
}
