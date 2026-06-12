import { NavLink, Outlet, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import { resolveTheme, themeToCSS } from '../../lib/theme'
import { getGoogleFontsImport } from '../../lib/fonts'
import { BoardSharedFooter, BoardSharedHeader } from '../../components/board-shared-chrome'

export async function loader(args: LoaderFunctionArgs) {
  await requireUser(args, { type: 'job-seeker' })

  // Try to resolve the board from request headers (set by the reverse proxy)
  const boardSlug     = args.request.headers.get('x-board-slug')
  const boardHostname = args.request.headers.get('x-board-hostname')
  const boardType     = args.request.headers.get('x-board-type')
  const db = getDb()
  let board = null
  if (boardType === 'custom' && boardHostname) {
    board = await db.query.boards.findFirst({ where: eq(boards.customDomain, boardHostname) })
  } else if (boardSlug) {
    board = await db.query.boards.findFirst({ where: eq(boards.slug, boardSlug) })
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

  return {
    boardName: boardConfig.boardName,
    logoUrl: boardConfig.logoUrl ?? null,
    boardConfig,
    footerText: board?.footerText ?? null,
    css,
    fontImport,
  }
}

const NAV = [
  { to: '/candidate',              label: 'Overview',     end: true },
  { to: '/candidate/saved',        label: 'Saved jobs' },
  { to: '/candidate/applications', label: 'Applications' },
  { to: '/candidate/alerts',       label: 'Email alerts' },
  { to: '/candidate/profile',      label: 'Profile' },
]

export default function CandidateLayout() {
  const { boardName, logoUrl, boardConfig, footerText, css, fontImport } = useLoaderData<typeof loader>()

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: fontImport }} />
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div
        className="min-h-screen"
        style={{
          background:
            'radial-gradient(circle at 12% 15%, color-mix(in srgb, var(--color-primary) 9%, transparent) 0%, transparent 40%), radial-gradient(circle at 92% 82%, color-mix(in srgb, var(--color-accent) 8%, transparent) 0%, transparent 42%), var(--color-background)',
        }}
      >
        <BoardSharedHeader boardName={boardName} logoUrl={logoUrl} boardConfig={boardConfig} />

        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 md:gap-6">
          <aside
            className="p-3 h-fit md:sticky md:top-[78px] rounded-[16px] border"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
              backdropFilter: 'blur(2px)',
            }}
          >
            <nav className="flex flex-col gap-1">
              {NAV.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm no-underline transition-all ${isActive ? 'font-semibold' : 'font-medium'}`
                  }
                  style={({ isActive }) => ({
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    backgroundColor: isActive ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'transparent',
                  })}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </aside>
          <main><Outlet /></main>
        </div>

        <BoardSharedFooter boardName={boardName} boardConfig={boardConfig} footerText={footerText} />
      </div>
    </>
  )
}
