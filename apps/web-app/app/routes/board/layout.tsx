import { Link, Outlet, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { themeToCSS, resolveTheme } from '../../lib/theme'
import { resolveJobBoardThemeConfig } from '@jobuki/types'

export async function loader({ request }: LoaderFunctionArgs) {
  const boardSlug     = request.headers.get('x-board-slug')
  const boardHostname = request.headers.get('x-board-hostname')
  const boardType     = request.headers.get('x-board-type')
  const db = getDb()

  let board = null

  if (boardType === 'custom' && boardHostname) {
    board = await db.query.boards.findFirst({
      where: eq(boards.customDomain, boardHostname),
    })
  } else if (boardSlug) {
    board = await db.query.boards.findFirst({
      where: eq(boards.slug, boardSlug),
    })
  }

  if (!board || board.status !== 'live') throw new Response('Board not found', { status: 404 })

  const theme = resolveTheme(board.theme ?? {})
  const css = themeToCSS(theme)

  return { board, css }
}

export default function BoardLayout() {
  const { board, css } = useLoaderData<typeof loader>()
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
  const hasLogo = logoUrl.length > 0

  return (
    <>
      {/* Per-board CSS variable injection — this is the entire theming system */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <header
        className="sticky top-0 z-40"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--color-surface) var(--board-header-surface-mix), transparent)',
          borderBottom: '1px solid var(--color-border)',
          backdropFilter: 'blur(var(--board-header-blur))',
          boxShadow: '0 1px 0 color-mix(in srgb, var(--color-border) 85%, transparent)',
        }}
      >
        <div className="max-w-[1280px] mx-auto h-[62px] px-10 flex items-center justify-between gap-4">
          <Link to="/" className="no-underline flex items-center gap-2.5 min-w-0">
            {hasLogo ? (
              <img
                src={logoUrl}
                alt={boardConfig.boardName}
                width={156}
                height={36}
                loading="eager"
                decoding="async"
                className="h-9 w-auto max-w-[156px] object-contain shrink-0"
              />
            ) : (
              <>
                <svg className="w-7 h-7 shrink-0" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                  <circle cx="14" cy="14" r="3" fill="var(--color-primary)" />
                  <circle cx="14" cy="14" r="7" stroke="var(--color-primary)" strokeWidth="2" fill="none" strokeDasharray="3 2" />
                  <circle cx="14" cy="14" r="12" stroke="var(--color-border)" strokeWidth="1.5" fill="none" />
                </svg>
                <span
                  className="truncate text-[13px] font-extrabold tracking-[0.01em]"
                  style={{ fontFamily: "'Unbounded', var(--font-display), sans-serif", color: 'var(--color-text-primary)' }}
                >
                  {boardConfig.boardName}
                </span>
              </>
            )}
          </Link>

          <div className="flex items-center gap-0.5">
            <Link to="/jobs" className="px-3.5 py-2 text-[13px] font-medium rounded-[10px] transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
              Browse
            </Link>
            <Link to="/jobs" className="px-3.5 py-2 text-[13px] font-medium rounded-[10px] transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
              Companies
            </Link>
            <Link to="/jobs" className="px-3.5 py-2 text-[13px] font-medium rounded-[10px] transition-colors" style={{ color: 'var(--color-text-secondary)' }}>
              Salaries
            </Link>
            <a
              className="ml-2 px-5 py-[9px] text-[13px] font-bold rounded-[10px] no-underline transition-transform duration-150"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}
              href={boardConfig.emptyState.ctaUrl || '#'}
              target="_blank"
              rel="noreferrer"
            >
              Post a role ↗
            </a>
          </div>
        </div>
      </header>

      <Outlet context={{ board }} />
    </>
  )
}
