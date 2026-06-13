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
    <div className="mx-auto" style={{ maxWidth: '860px' }}>
      <div className="px-8 py-8 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h1 className="text-4xl font-extrabold tracking-tight m-0"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
          About {boardConfig.boardName}
        </h1>
      </div>
      <div className="px-8 py-8">
        <div
          className="prose prose-sm max-w-none"
          style={{ color: 'var(--color-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: about.content }}
        />
      </div>
    </div>
  )
}
