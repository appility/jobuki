import { Outlet, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { themeToCSS, resolveTheme } from '../../lib/theme'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import { getGoogleFontsImport } from '../../lib/fonts'
import { BoardSharedFooter, BoardSharedHeader } from '../../components/board-shared-chrome'

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

  // Board sub-routes (jobs, apply, etc.) handle their own 404 — layout is graceful
  if (!board || board.status !== 'live') return { board: null }

  return { board }
}

export default function BoardLayout() {
  const { board } = useLoaderData<typeof loader>()

  // No board (root domain / marketing) — render without board chrome
  if (!board) return <Outlet />

  const boardConfig = resolveJobBoardThemeConfig(board.boardConfig, {
    boardName: board.name,
    tagline: board.introText ?? undefined,
    logoUrl: board.logoUrl ?? undefined,
    headerImageUrl: board.heroImageUrl ?? undefined,
    brandColor: (board.theme as any)?.colorPrimary,
    accentColor: (board.theme as any)?.colorAccent,
    backgroundColor: (board.theme as any)?.colorBackground,
  })
  const theme = resolveTheme(board.theme ?? {})
  const css = themeToCSS(theme, ':root', boardConfig.cssVariables)
  const fontImport = getGoogleFontsImport(theme.fontDisplay, theme.fontBody)
  const logoUrl = (boardConfig.logoUrl ?? '').trim()
  const hasLogo = logoUrl.length > 0

  const integrations = boardConfig.integrations ?? {}

  return (
    <>
      {/* Per-board font injection — applies to all pages on this board */}
      <style dangerouslySetInnerHTML={{ __html: fontImport }} />
      {/* Per-board CSS variable injection — this is the entire theming system */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {/* Preload hero image so browser discovers it before CSS is parsed */}
      {board.heroImageUrl && (
        <link rel="preload" as="image" href={board.heroImageUrl} fetchPriority="high" />
      )}

      {/* ── SEO ── */}
      {boardConfig.seo?.noindex && <meta name="robots" content="noindex,nofollow" />}
      {boardConfig.seo?.ogImageUrl && <meta property="og:image" content={boardConfig.seo.ogImageUrl} />}
      {boardConfig.seo?.metaDescription && <meta name="description" content={boardConfig.seo.metaDescription} />}

      {/* ── Tracking scripts ── */}
      {integrations.googleTagManagerId && (
        <script dangerouslySetInnerHTML={{ __html:
          `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${integrations.googleTagManagerId}');`
        }} />
      )}
      {integrations.googleAnalyticsId && (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${integrations.googleAnalyticsId}`} />
          <script dangerouslySetInnerHTML={{ __html:
            `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${integrations.googleAnalyticsId}');`
          }} />
        </>
      )}
      {integrations.facebookPixelId && (
        <script dangerouslySetInnerHTML={{ __html:
          `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${integrations.facebookPixelId}');fbq('track','PageView');`
        }} />
      )}
      {integrations.linkedinPartnerId && (
        <script dangerouslySetInnerHTML={{ __html:
          `_linkedin_partner_id="${integrations.linkedinPartnerId}";window._linkedin_data_partner_ids=window._linkedin_data_partner_ids||[];window._linkedin_data_partner_ids.push(_linkedin_partner_id);(function(l){if(!l){window.lintrk=function(a,b){window.lintrk.q.push([a,b])};window.lintrk.q=[]}var s=document.getElementsByTagName("script")[0];var b=document.createElement("script");b.type="text/javascript";b.async=!0;b.src="https://snap.licdn.com/li.lms-analytics/insight.min.js";s.parentNode.insertBefore(b,s)})(window.lintrk);`
        }} />
      )}
      {integrations.hotjarSiteId && (
        <script dangerouslySetInnerHTML={{ __html:
          `(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:${integrations.hotjarSiteId},hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r)})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`
        }} />
      )}
      {integrations.microsoftClarityId && (
        <script dangerouslySetInnerHTML={{ __html:
          `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${integrations.microsoftClarityId}");`
        }} />
      )}

      <BoardSharedHeader
        boardName={boardConfig.boardName}
        logoUrl={hasLogo ? logoUrl : null}
        boardConfig={boardConfig}
      />

      <Outlet context={{ board }} />
      <BoardSharedFooter boardName={boardConfig.boardName} boardConfig={boardConfig} footerText={board.footerText} />
    </>
  )
}
