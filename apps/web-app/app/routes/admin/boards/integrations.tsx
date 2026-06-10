import { useLoaderData, useActionData, Form, useNavigation, Link } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace } from '../../../lib/auth.server'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { resolveJobBoardThemeConfig } from '@jobuki/types'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const db = getDb()
  const full = await db.query.boards.findFirst({ where: eq(boards.id, board.id) })
  if (!full) throw new Response('Not found', { status: 404 })
  const boardConfig = resolveJobBoardThemeConfig(full.boardConfig)
  return { board: full, integrations: boardConfig.integrations ?? {} }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const db = getDb()
  const full = await db.query.boards.findFirst({ where: eq(boards.id, board.id) })
  if (!full) throw new Response('Not found', { status: 404 })

  const form = await args.request.formData()
  const g = (key: string) => (form.get(key) as string ?? '').trim() || undefined

  const existing = resolveJobBoardThemeConfig(full.boardConfig)
  const updated = {
    ...existing,
    integrations: {
      googleAnalyticsId:   g('googleAnalyticsId'),
      googleTagManagerId:  g('googleTagManagerId'),
      facebookPixelId:     g('facebookPixelId'),
      linkedinPartnerId:   g('linkedinPartnerId'),
      hotjarSiteId:        g('hotjarSiteId'),
      microsoftClarityId:  g('microsoftClarityId'),
    },
  }

  await db.update(boards).set({ boardConfig: updated }).where(eq(boards.id, board.id))
  return { ok: true }
}

// ── Component ─────────────────────────────────────────────────────────

const INTEGRATIONS = [
  {
    key: 'googleAnalyticsId',
    label: 'Google Analytics 4',
    placeholder: 'G-XXXXXXXXXX',
    help: 'Find your Measurement ID in GA4 → Admin → Data Streams → your stream.',
  },
  {
    key: 'googleTagManagerId',
    label: 'Google Tag Manager',
    placeholder: 'GTM-XXXXXXX',
    help: 'Find your Container ID in GTM → Admin → Container Settings.',
  },
  {
    key: 'facebookPixelId',
    label: 'Meta (Facebook) Pixel',
    placeholder: '123456789012345',
    help: 'Find your Pixel ID in Meta Business Manager → Events Manager.',
  },
  {
    key: 'linkedinPartnerId',
    label: 'LinkedIn Insight Tag',
    placeholder: '1234567',
    help: 'Find your Partner ID in LinkedIn Campaign Manager → Account Assets → Insight Tag.',
  },
  {
    key: 'hotjarSiteId',
    label: 'Hotjar',
    placeholder: '1234567',
    help: 'Find your Site ID in Hotjar → Settings → Tracking Code.',
  },
  {
    key: 'microsoftClarityId',
    label: 'Microsoft Clarity',
    placeholder: 'abcdefghij',
    help: 'Find your Project ID in Clarity → Settings → Setup.',
  },
] as const

export default function IntegrationsPage() {
  const { board, integrations } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const saving = navigation.state === 'submitting'

  return (
    <div className="p-10 max-w-2xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <Link
            to={`/dashboard/boards/${board.id}`}
            className="text-xs font-medium"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ← {board.name}
          </Link>
        </div>
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
          Integrations
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Add tracking and analytics tags to your job board. Scripts are injected into every page.
        </p>
      </div>

      {actionData?.ok && (
        <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium"
          style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          Integrations saved.
        </div>
      )}

      <Form method="post" className="flex flex-col gap-7">
        {INTEGRATIONS.map(({ key, label, placeholder, help }) => (
          <div key={key}>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
              {label}
            </label>
            <input
              name={key}
              defaultValue={(integrations as any)[key] ?? ''}
              placeholder={placeholder}
              className="w-full px-3 py-2.5 rounded-xl text-sm border font-mono"
              style={{
                borderColor: 'var(--color-border)',
                backgroundColor: 'var(--color-surface-subtle)',
                color: 'var(--color-text-primary)',
              }}
            />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>{help}</p>
          </div>
        ))}

        <div className="pt-2">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : 'Save integrations'}
          </button>
        </div>
      </Form>
    </div>
  )
}
