import { useOutletContext } from 'react-router'
import type { MetaFunction } from 'react-router'
import { resolveJobBoardThemeConfig, type Board } from '@jobuki/types'
import { renderPrivacyPolicy } from '../../lib/privacy-templates'

export const meta: MetaFunction = ({ matches }) => {
  const layout = matches.find(m => (m.data as any)?.board)
  const board = (layout?.data as any)?.board
  return [{ title: `Privacy Policy — ${board?.name ?? 'Job Board'}` }]
}

export default function PrivacyPage() {
  const { board } = useOutletContext<{ board: Board }>()
  const boardConfig = resolveJobBoardThemeConfig(board.boardConfig, {
    boardName: board.name,
  })

  const privacy = boardConfig.pages?.privacy
  if (!privacy?.enabled) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Privacy policy not available.</p>
      </div>
    )
  }

  const html = renderPrivacyPolicy(privacy.template ?? 'global', {
    legalName: privacy.legalName || boardConfig.boardName,
    boardName: boardConfig.boardName,
    contactEmail: privacy.contactEmail || '',
    websiteUrl: privacy.websiteUrl || '',
  })

  return (
    <div className="mx-auto" style={{ maxWidth: '860px' }}>
      <div className="px-8 py-8 border-b" style={{ borderColor: 'var(--color-border)' }}>
        <h1 className="text-4xl font-extrabold tracking-tight m-0"
          style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-display)' }}>
          Privacy Policy
        </h1>
      </div>
      <div className="px-8 py-8">
        <div
          className="prose prose-sm max-w-none"
          style={{ color: 'var(--color-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}
