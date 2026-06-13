import { Outlet, useLoaderData, useLocation } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import { resolveTheme, themeToCSS } from '../lib/theme'
import { getGoogleFontsImport } from '../lib/fonts'
import { BoardSharedFooter, BoardSharedHeader } from '../components/board-shared-chrome'

export async function loader({ request }: LoaderFunctionArgs) {
  const boardSlug = request.headers.get('x-board-slug')
  const boardHostname = request.headers.get('x-board-hostname')
  const boardType = request.headers.get('x-board-type')
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

  if (!board || board.status !== 'live') {
    board = null
  }

  const boardConfig = resolveJobBoardThemeConfig(board?.boardConfig ?? null, {
    boardName: board?.name ?? 'Jobuki',
    tagline: board?.introText ?? undefined,
    logoUrl: board?.logoUrl ?? undefined,
    headerImageUrl: board?.heroImageUrl ?? undefined,
    brandColor: (board?.theme as any)?.colorPrimary,
    accentColor: (board?.theme as any)?.colorAccent,
    backgroundColor: (board?.theme as any)?.colorBackground,
  })

  const theme = resolveTheme(board?.theme ?? {})
  const css = themeToCSS(theme, ':root', boardConfig.cssVariables)
  const fontImport = getGoogleFontsImport(theme.fontDisplay, theme.fontBody)
  const logoUrl = (boardConfig.logoUrl ?? '').trim()

  return {
    board,
    boardConfig,
    boardName: boardConfig.boardName,
    footerText: board?.footerText ?? null,
    logoUrl: logoUrl.length > 0 ? logoUrl : null,
    css,
    fontImport,
  }
}

export default function SharedShellLayout() {
  const data = useLoaderData<typeof loader>()
  const location = useLocation()

  const isCandidateRoute = location.pathname === '/candidate' || location.pathname.startsWith('/candidate/')
  const shouldRenderShell = Boolean(data.board) || isCandidateRoute

  if (!shouldRenderShell) {
    return <Outlet context={{ board: data.board, boardConfig: data.boardConfig }} />
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: data.fontImport }} />
      <style dangerouslySetInnerHTML={{ __html: data.css }} />

      {data.board?.heroImageUrl && (
        <link rel="preload" as="image" href={data.board.heroImageUrl} fetchpriority="high" />
      )}

      <div className="min-h-screen flex flex-col">
        <BoardSharedHeader
          boardName={data.boardName}
          logoUrl={data.logoUrl}
          boardConfig={data.boardConfig}
          navMode={isCandidateRoute ? 'browse-only' : 'full'}
        />

        <div className="flex-1">
          <Outlet context={{ board: data.board, boardConfig: data.boardConfig }} />
        </div>

        <BoardSharedFooter
          boardName={data.boardName}
          boardConfig={data.boardConfig}
          footerText={data.footerText}
        />
      </div>
    </>
  )
}