import { useLoaderData, useActionData, Form, useNavigation, Link } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace } from '../../../lib/auth.server'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import { useState, useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'

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
  const field = form.get('field') as string | null

  const existing = resolveJobBoardThemeConfig(full.boardConfig)
  const currentIntegrations = existing.integrations ?? {}

  // If a specific field is being saved, update only that field
  let integrations: typeof currentIntegrations
  if (field) {
    integrations = {
      ...currentIntegrations,
      [field]: g(field),
    }
  } else {
    // Fallback: save all fields (for backward compatibility)
    integrations = {
      googleAnalyticsId:   g('googleAnalyticsId'),
      googleTagManagerId:  g('googleTagManagerId'),
      facebookPixelId:     g('facebookPixelId'),
      linkedinPartnerId:   g('linkedinPartnerId'),
      hotjarSiteId:        g('hotjarSiteId'),
      microsoftClarityId:  g('microsoftClarityId'),
    }
  }

  const updated = {
    ...existing,
    integrations,
  }

  await db.update(boards).set({ boardConfig: updated }).where(eq(boards.id, board.id))
  return { ok: true, savedField: field }
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
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    if (actionData?.ok && actionData?.savedField) {
      setSaved(actionData.savedField)
      const timer = setTimeout(() => setSaved(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [actionData])

  return (
    <div className="w-full p-8 max-w-2xl">
      <Link to={`/dashboard/boards/${board.id}`}
        className="text-sm no-underline block mb-4" style={{ color: 'var(--color-text-muted)' }}>
        ← {board.name}
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
          Integrations
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Add tracking and analytics tags to your job board. Scripts are injected into every page.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {INTEGRATIONS.map(({ key, label, placeholder, help }) => {
          const isSaving = navigation.state === 'submitting' && navigation.formData?.get('field') === key
          const wasSaved = saved === key

          return (
            <div key={key} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '1.5rem' }}>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
                {label}
              </label>
              <Form method="post" className="flex gap-2 items-end">
                <input type="hidden" name="field" value={key} />
                <input
                  name={key}
                  defaultValue={(integrations as any)[key] ?? ''}
                  placeholder={placeholder}
                  className="flex-1 px-3 py-2.5 rounded-lg text-sm border font-mono"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap flex items-center gap-2 transition-all"
                  style={{
                    backgroundColor: wasSaved ? 'var(--color-success)' : 'var(--color-primary)',
                    color: 'white',
                    opacity: isSaving ? 0.7 : 1,
                  }}
                >
                  {wasSaved && <CheckCircle2 size={16} />}
                  {isSaving ? 'Saving…' : wasSaved ? 'Saved' : 'Save'}
                </button>
              </Form>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>{help}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
