import type { LoaderFunctionArgs } from 'react-router'
import { getDb, boards, jobs } from '@jobuki/db'
import { and, desc, eq } from 'drizzle-orm'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import { deriveJobCategory, resolveBoardCategories } from '../../lib/board-categories'
import { publicJobPath } from '../../lib/public-job-path'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function loader({ request }: LoaderFunctionArgs) {
  const boardSlug = request.headers.get('x-board-slug')
  const boardHostname = request.headers.get('x-board-hostname')
  const boardType = request.headers.get('x-board-type')
  const db = getDb()

  let board = null
  if (boardType === 'custom' && boardHostname) {
    board = await db.query.boards.findFirst({ where: eq(boards.customDomain, boardHostname) })
  } else if (boardSlug) {
    board = await db.query.boards.findFirst({ where: eq(boards.slug, boardSlug) })
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

  const publishedJobs = await db.query.jobs.findMany({
    where: and(eq(jobs.boardId, board.id), eq(jobs.status, 'published')),
    orderBy: [desc(jobs.updatedAt), desc(jobs.createdAt)],
  })

  const url = new URL(request.url)
  const base = `${url.protocol}//${url.host}`
  const derivedCategories = Array.from(new Set(publishedJobs.map((job) => deriveJobCategory(job, boardCategories)).filter(Boolean))).sort()
  const categories = boardCategories.length ? boardCategories : derivedCategories

  const entries = [
    { loc: `${base}/jobs`, lastmod: new Date().toISOString() },
    ...categories.map((category) => ({
      loc: `${base}/jobs/category/${encodeURIComponent(category)}`,
      lastmod: new Date().toISOString(),
    })),
    ...publishedJobs.map((job) => ({
      loc: `${base}${publicJobPath(job)}`,
      lastmod: (job.updatedAt ?? job.createdAt ?? new Date()).toISOString(),
    })),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.map((entry) => `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>\n    <lastmod>${entry.lastmod}</lastmod>\n  </url>`).join('\n')}
</urlset>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}