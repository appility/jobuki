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

  if (!board) throw new Response('Board not found', { status: 404 })

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

      <header style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="board-container py-4 md:py-5 flex items-center justify-between gap-4">
          <Link to="/" className="no-underline flex items-center gap-3 min-w-0">
            {hasLogo ? (
              <img
                src={logoUrl}
                alt={boardConfig.boardName}
                className="h-12 md:h-14 w-auto max-w-[180px] object-contain shrink-0"
              />
            ) : (
              <div className="min-w-0">
                <p className="text-[16px] md:text-[18px] font-extrabold leading-tight truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {boardConfig.boardName}
                </p>
                <p className="text-[13px] md:text-[14px] truncate" style={{ color: 'var(--color-text-secondary)' }}>
                  {boardConfig.tagline || board.introText || 'Find your next role'}
                </p>
              </div>
            )}
          </Link>

          <Link to="/" className="btn-outline text-[13px] whitespace-nowrap" aria-label="Back to all jobs">
            Back
          </Link>
        </div>
      </header>

      <Outlet context={{ board }} />
    </>
  )
}
