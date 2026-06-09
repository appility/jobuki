import { useLoaderData, useOutletContext } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { resolveJobBoardThemeConfig, type Board } from '@jobuki/types'

export async function loader({ request }: LoaderFunctionArgs) {
  // Board is already loaded in the layout — we just need the config
  return {}
}

export const meta: MetaFunction = ({ matches }) => {
  const layout = matches.find(m => (m.data as any)?.board)
  const board = (layout?.data as any)?.board
  return [{ title: `About — ${board?.name ?? 'Job Board'}` }]
}

export default function AboutPage() {
  const { board } = useOutletContext<{ board: Board }>()
  const boardConfig = resolveJobBoardThemeConfig(board.boardConfig, {
    boardName: board.name,
  })

  const about = boardConfig.pages?.about
  if (!about?.enabled || !about.content) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>About page not available.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-14 pb-24">
      <h1 className="text-3xl font-extrabold tracking-tight mb-8 font-display"
        style={{ color: 'var(--color-text-primary)' }}>
        About {boardConfig.boardName}
      </h1>
      <div
        className="prose prose-sm max-w-none"
        style={{ color: 'var(--color-text-primary)' }}
        dangerouslySetInnerHTML={{ __html: about.content }}
      />
    </div>
  )
}
