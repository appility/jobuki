import { Outlet, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { themeToCSS, resolveTheme } from '../../lib/theme'

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
  return (
    <>
      {/* Per-board CSS variable injection — this is the entire theming system */}
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <Outlet context={{ board }} />
    </>
  )
}
