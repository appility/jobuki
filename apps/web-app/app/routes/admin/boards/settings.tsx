import { useState, useEffect } from 'react'
import { useLoaderData, useActionData, Form, useNavigation, Link, redirect } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace, userHasWorkspaceFeature } from '../../../lib/auth.server'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { resolveTheme } from '../../../lib/theme'
import { contrastRatio } from '../../../lib/color'
import { canMonetize } from '../../../lib/creator-tier'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import { boardUrl } from '../../../lib/board-url'
import { removeCustomDomain } from '../../../lib/railway'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogTitle, AlertDialogTrigger,
} from '../../../components/ui/alert-dialog'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace, user } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const db = getDb()
  const full = await db.query.boards.findFirst({ where: eq(boards.id, board.id) })
  if (!full) throw new Response('Not found', { status: 404 })
  const canPublish = await userHasWorkspaceFeature(user.id, workspace.id, 'board.publish')
  const canManageMonetization = await userHasWorkspaceFeature(user.id, workspace.id, 'workspace.billing.manage')
  const boardConfig = resolveJobBoardThemeConfig(full.boardConfig, { boardName: full.name })
  return {
    board: full,
    publicUrl: boardUrl(full.slug, full.customDomain),
    canPublish,
    workspacePlan: workspace.plan,
    monetizationAllowed: canMonetize(workspace.plan),
    canManageMonetization,
    monetizationConfig: boardConfig.monetization,
  }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace, user } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const form = await args.request.formData()
  const intent = form.get('intent') as string
  const db = getDb()

  if (intent === 'toggle_status') {
    const canPublish = await userHasWorkspaceFeature(user.id, workspace.id, 'board.publish')
    if (!canPublish) return { ok: false, error: 'You do not have permission to publish boards.' }

    const next = board.status === 'live' ? 'draft' : 'live'
    if (next === 'live') {
      const full = await db.query.boards.findFirst({ where: eq(boards.id, board.id) })
      const theme = resolveTheme((full?.theme ?? {}) as any)
      const checks = [
        { label: 'Primary button text', ratio: contrastRatio(theme.colorPrimaryFg, theme.colorPrimary), min: 4.5 },
        { label: 'Accent button text', ratio: contrastRatio(theme.colorAccentFg, theme.colorAccent), min: 4.5 },
        { label: 'Body text on background', ratio: contrastRatio(theme.colorTextSecondary, theme.colorBackground), min: 4.5 },
        { label: 'Muted text on background', ratio: contrastRatio(theme.colorTextMuted, theme.colorBackground), min: 3 },
      ]
      const warnings = checks.filter(c => c.ratio < c.min)
        .map(c => `${c.label} is too low contrast (${c.ratio.toFixed(2)}:1, target ${c.min}:1).`)
      await db.update(boards).set({ status: 'live', updatedAt: new Date() }).where(eq(boards.id, board.id))
      return { ok: true, message: 'Board published.', warnings }
    }
    await db.update(boards).set({ status: 'draft', updatedAt: new Date() }).where(eq(boards.id, board.id))
    return { ok: true, message: 'Board unpublished.' }
  }

  if (intent === 'delete_board') {
    const confirmSlug = String(form.get('confirmSlug') ?? '').trim().toLowerCase()
    if (confirmSlug !== board.slug.toLowerCase())
      return { ok: false, error: `Type "${board.slug}" to confirm deletion.` }
    if (board.railwayDomainId) await removeCustomDomain(board.railwayDomainId).catch(() => null)
    await db.delete(boards).where(eq(boards.id, board.id))
    throw redirect('/dashboard/boards')
  }

  if (intent === 'update_monetization') {
    const canManageMonetization = await userHasWorkspaceFeature(user.id, workspace.id, 'workspace.billing.manage')
    if (!canManageMonetization) return { ok: false, error: 'You do not have permission to manage monetization.' }
    if (!canMonetize(workspace.plan)) return { ok: false, error: 'Monetization is available on Growth and Scale tiers only.' }

    const enableMonetization = form.get('enableMonetization') === 'on'
    const approvalMode = String(form.get('paidApprovalMode') ?? 'manual')
    const listingPrice = form.get('listingPrice') ? Number(form.get('listingPrice')) : null
    const featuredPrice = form.get('featuredPrice') ? Number(form.get('featuredPrice')) : null

    if (enableMonetization) {
      if (!listingPrice || listingPrice <= 0) return { ok: false, error: 'Enter a valid default listing price.' }
      if (featuredPrice != null && featuredPrice <= 0) return { ok: false, error: 'Featured price must be greater than 0.' }
    }

    const full = await db.query.boards.findFirst({ where: eq(boards.id, board.id) })
    const current = resolveJobBoardThemeConfig(full?.boardConfig, { boardName: board.name })
    await db.update(boards).set({
      boardConfig: {
        ...current,
        monetization: {
          ...current.monetization,
          enabled: enableMonetization,
          defaultListingPrice: enableMonetization ? listingPrice : null,
          featuredListingPrice: enableMonetization ? featuredPrice : null,
          requiresApprovalForPaidListings: enableMonetization ? approvalMode !== 'auto' : true,
        },
      },
      updatedAt: new Date(),
    }).where(eq(boards.id, board.id))
    return { ok: true, message: 'Monetization settings updated.' }
  }

  return { ok: false }
}

// ── Component ─────────────────────────────────────────────────────────
export default function BoardSettings() {
  const {
    board, publicUrl, canPublish,
    workspacePlan, monetizationAllowed, canManageMonetization, monetizationConfig,
  } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const [confirmSlug, setConfirmSlug] = useState('')
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'success' | 'error'; message: string }>>([])
  const submitting = navigation.state === 'submitting'
  const deleting = submitting && navigation.formData?.get('intent') === 'delete_board'

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  useEffect(() => {
    if (!actionData) return
    if (actionData.ok && actionData.message) pushToast('success', actionData.message)
    else if (!actionData.ok && actionData.error) pushToast('error', actionData.error)
  }, [actionData])

  return (
    <div className="w-full p-10 max-w-2xl">
      <h1 className="text-2xl font-extrabold mb-8" style={{ color: 'var(--color-text-primary)' }}>
        Settings
      </h1>


      {/* Board status */}
      <section className="card p-5 mb-6">
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>Board</h3>
        <div className="space-y-1.5 text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          <p><strong>Slug:</strong> {board.slug}</p>
          <p><strong>Status:</strong> {board.status}</p>
          <p>
            <strong>URL:</strong>{' '}
            <a href={publicUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
              {publicUrl.replace(/^https?:\/\//, '')} ↗
            </a>
          </p>
        </div>

        {actionData?.warnings?.length ? (
          <div className="mb-4 rounded-xl border px-4 py-3"
            style={{ borderColor: 'var(--color-warning)', backgroundColor: 'var(--color-warning-bg)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-warning)' }}>Accessibility advice</p>
            <ul className="text-sm m-0 pl-5" style={{ color: 'var(--color-text-secondary)' }}>
              {actionData.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
            <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>Adjust colours in Appearance.</p>
          </div>
        ) : null}

        {canPublish ? (
          <Form method="post">
            <input type="hidden" name="intent" value="toggle_status" />
            <button
              type="submit"
              disabled={submitting}
              className={board.status === 'live' ? 'btn-outline text-sm' : 'btn-primary text-sm'}
            >
              {board.status === 'live' ? 'Unpublish board' : 'Publish board'}
            </button>
          </Form>
        ) : (
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Publishing is restricted for your role.
          </p>
        )}
      </section>

      {/* Monetization */}
      <section className="card p-5 mb-6">
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>Monetization</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Tier: <strong>{workspacePlan}</strong> · {monetizationAllowed ? 'Available' : 'Locked — upgrade to Growth or Scale'}
        </p>

        <Form method="post" className="space-y-3">
          <input type="hidden" name="intent" value="update_monetization" />
          <label className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
            <input
              type="checkbox"
              name="enableMonetization"
              defaultChecked={!!monetizationConfig?.enabled}
              disabled={!monetizationAllowed || !canManageMonetization}
            />
            Enable paid listings
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Default price (GBP)
              </label>
              <input type="number" min="1" name="listingPrice"
                defaultValue={monetizationConfig?.defaultListingPrice ?? ''}
                className="input w-full"
                disabled={!monetizationAllowed || !canManageMonetization} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Featured price (GBP)
              </label>
              <input type="number" min="1" name="featuredPrice"
                defaultValue={monetizationConfig?.featuredListingPrice ?? ''}
                className="input w-full"
                disabled={!monetizationAllowed || !canManageMonetization} />
            </div>
          </div>
          <select name="paidApprovalMode" className="input w-full"
            defaultValue={monetizationConfig?.requiresApprovalForPaidListings ? 'manual' : 'auto'}
            disabled={!monetizationAllowed || !canManageMonetization}>
            <option value="manual">Manual review before publish</option>
            <option value="auto">Auto-publish paid listings</option>
          </select>
          <button type="submit" className="btn-outline text-sm"
            disabled={!monetizationAllowed || !canManageMonetization || submitting}>
            {submitting ? 'Saving…' : 'Save monetization'}
          </button>
        </Form>
      </section>

      {/* Danger zone */}
      <section className="card p-5" style={{ borderColor: 'var(--color-danger)' }}>
        <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--color-danger)' }}>Danger zone</h3>
        <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
          Deleting this board is permanent. All jobs, applications, and domain settings will be removed.
        </p>
        {actionData?.error && (
          <div className="mb-3 px-3 py-2 rounded-lg text-xs"
            style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
            {actionData.error}
          </div>
        )}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" className="btn-outline text-sm"
              style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
              Delete board
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Delete board permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              This removes the board, all jobs, applications, and domain settings. This cannot be undone.
            </AlertDialogDescription>
            <Form method="post" className="mt-4 space-y-2">
              <input type="hidden" name="intent" value="delete_board" />
              <label className="block text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Type <span className="font-mono">{board.slug}</span> to confirm
              </label>
              <input name="confirmSlug" value={confirmSlug}
                onChange={e => setConfirmSlug(e.currentTarget.value)}
                className="input w-full" placeholder={board.slug}
                autoComplete="off" spellCheck={false} />
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <button type="button" className="btn-outline text-sm">Cancel</button>
                </AlertDialogCancel>
                <button type="submit"
                  disabled={deleting || confirmSlug.trim().toLowerCase() !== board.slug.toLowerCase()}
                  className="w-full disabled:opacity-60">
                  {deleting ? 'Deleting…' : 'Delete board'}
                </button>
              </AlertDialogFooter>
            </Form>
          </AlertDialogContent>
        </AlertDialog>
      </section>

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-72 pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id}
            className="px-4 py-3 rounded-xl text-sm font-medium shadow-lg pointer-events-auto"
            style={{
              backgroundColor: toast.type === 'success' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
              color: toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
              border: `1px solid ${toast.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}`,
            }}>
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
