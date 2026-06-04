import { useEffect, useState } from 'react'
import { useLoaderData, useActionData, Link, Form, useNavigation, useSearchParams, redirect } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace, userHasWorkspaceFeature } from '../../../lib/auth.server'
import { getDb, boards, jobs } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { boardUrl } from '../../../lib/board-url'
import { removeCustomDomain } from '../../../lib/railway'
import { resolveTheme } from '../../../lib/theme'
import { contrastRatio } from '../../../lib/color'
import { canMonetize } from '../../../lib/creator-tier'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../../../components/ui/alert-dialog'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace, user } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const db = getDb()
  const canPublish = await userHasWorkspaceFeature(user.id, workspace.id, 'board.publish')
  const canManageMonetization = await userHasWorkspaceFeature(user.id, workspace.id, 'workspace.billing.manage')
  const boardConfig = resolveJobBoardThemeConfig(board.boardConfig, {
    boardName: board.name,
    tagline: board.introText ?? undefined,
    logoUrl: board.logoUrl ?? undefined,
    headerImageUrl: board.heroImageUrl ?? undefined,
    brandColor: (board.theme as any)?.colorPrimary,
    accentColor: (board.theme as any)?.colorAccent,
    backgroundColor: (board.theme as any)?.colorBackground,
  })

  const boardJobs = await db.query.jobs.findMany({
    where: eq(jobs.boardId, board.id),
    orderBy: (j, { desc }) => [desc(j.createdAt)],
  })

  return {
    board,
    jobs: boardJobs,
    publicUrl: boardUrl(board.slug, board.customDomain),
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
    if (!canPublish) {
      return { ok: false, error: 'You do not have permission to publish boards in this workspace.' }
    }

    const next = board.status === 'live' ? 'draft' : 'live'

    if (next === 'live') {
      const theme = resolveTheme((board.theme ?? {}) as any)
      const checks = [
        {
          label: 'Primary button text',
          ratio: contrastRatio(theme.colorPrimaryFg, theme.colorPrimary),
          min: 4.5,
        },
        {
          label: 'Accent button text',
          ratio: contrastRatio(theme.colorAccentFg, theme.colorAccent),
          min: 4.5,
        },
        {
          label: 'Body text on board background',
          ratio: contrastRatio(theme.colorTextSecondary, theme.colorBackground),
          min: 4.5,
        },
        {
          label: 'Muted text on board background',
          ratio: contrastRatio(theme.colorTextMuted, theme.colorBackground),
          min: 3,
        },
      ]

      const warnings = checks
        .filter(c => c.ratio < c.min)
        .map(c => `${c.label} is too low contrast (${c.ratio.toFixed(2)}:1, target ${c.min}:1).`)

      await db.update(boards).set({ status: next, updatedAt: new Date() }).where(eq(boards.id, board.id))
      return {
        ok: true,
        message: 'Board published.',
        warnings,
      }
    }

    await db.update(boards).set({ status: next, updatedAt: new Date() }).where(eq(boards.id, board.id))
    return { ok: true, message: next === 'live' ? 'Board published.' : 'Board unpublished.' }
  }

  if (intent === 'delete_board') {
    const confirmSlug = String(form.get('confirmSlug') ?? '').trim().toLowerCase()
    if (confirmSlug !== board.slug.toLowerCase()) {
      return { ok: false, error: `Type "${board.slug}" to confirm deletion.` }
    }

    // Best-effort Railway cleanup; board deletion should not fail on external API issues.
    if (board.railwayDomainId) {
      await removeCustomDomain(board.railwayDomainId).catch(() => null)
    }

    await db.delete(boards).where(eq(boards.id, board.id))
    throw redirect('/dashboard/boards')
  }

  if (intent === 'update_monetization') {
    const canManageMonetization = await userHasWorkspaceFeature(user.id, workspace.id, 'workspace.billing.manage')
    if (!canManageMonetization) {
      return { ok: false, error: 'You do not have permission to manage monetization settings.' }
    }

    const monetizationAllowed = canMonetize(workspace.plan)
    if (!monetizationAllowed) {
      return { ok: false, error: 'Monetization is available on Growth and Scale tiers only.' }
    }

    const enableMonetization = form.get('enableMonetization') === 'on'
    const approvalMode = String(form.get('paidApprovalMode') ?? 'manual')
    const listingPriceRaw = String(form.get('listingPrice') ?? '').trim()
    const featuredPriceRaw = String(form.get('featuredPrice') ?? '').trim()
    const listingPrice = listingPriceRaw ? Number(listingPriceRaw) : null
    const featuredPrice = featuredPriceRaw ? Number(featuredPriceRaw) : null

    if (enableMonetization) {
      if (listingPrice == null || Number.isNaN(listingPrice) || listingPrice <= 0) {
        return { ok: false, error: 'Enter a valid default listing price greater than 0.' }
      }
      if (featuredPrice != null && (Number.isNaN(featuredPrice) || featuredPrice <= 0)) {
        return { ok: false, error: 'Featured listing price must be greater than 0 when provided.' }
      }
      if (!['auto', 'manual'].includes(approvalMode)) {
        return { ok: false, error: 'Invalid paid listing approval mode.' }
      }
    }

    const currentConfig = resolveJobBoardThemeConfig(board.boardConfig, {
      boardName: board.name,
      tagline: board.introText ?? undefined,
      logoUrl: board.logoUrl ?? undefined,
      headerImageUrl: board.heroImageUrl ?? undefined,
      brandColor: (board.theme as any)?.colorPrimary,
      accentColor: (board.theme as any)?.colorAccent,
      backgroundColor: (board.theme as any)?.colorBackground,
    })

    await db.update(boards).set({
      boardConfig: {
        ...currentConfig,
        monetization: {
          ...(currentConfig.monetization ?? {}),
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

const JOB_STATUS_COLOR: Record<string, string> = {
  draft:     'var(--color-text-muted)',
  published: 'var(--color-success)',
  closed:    'var(--color-danger)',
}

export default function BoardShow() {
  const {
    board,
    jobs: boardJobs,
    publicUrl,
    canPublish,
    workspacePlan,
    monetizationAllowed,
    canManageMonetization,
    monetizationConfig,
  } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const [searchParams] = useSearchParams()
  const [confirmSlug, setConfirmSlug] = useState('')
  const submitting = navigation.state === 'submitting'
  const deleting = submitting && navigation.formData?.get('intent') === 'delete_board'
  const [toasts, setToasts] = useState<Array<{ id: number; type: 'success' | 'error'; message: string }>>([])
  const tabParam = searchParams.get('tab')
  const activeTab = tabParam === 'jobs' || tabParam === 'settings' ? tabParam : 'overview'

  const pushToast = (type: 'success' | 'error', message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }

  useEffect(() => {
    if (!actionData) return
    if (actionData.ok && actionData.message) {
      pushToast('success', actionData.message)
      return
    }
    if (!actionData.ok && actionData.error) {
      pushToast('error', actionData.error)
    }
  }, [actionData])

  return (
    <div className="p-10 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div>
          <Link to="/dashboard/boards" className="text-sm no-underline block mb-2"
            style={{ color: 'var(--color-text-muted)' }}>
            ← Boards
          </Link>
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
            {board.name}
          </h1>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer"
            className="text-xs no-underline" style={{ color: 'var(--color-primary)' }}>
            {publicUrl} ↗
          </a>
        </div>
      </div>

      {/* Status */}
      <div className="mb-8 flex items-center gap-3">
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: board.status === 'live' ? 'var(--color-success-bg)' : 'var(--color-surface-subtle)',
            color: board.status === 'live' ? 'var(--color-success)' : 'var(--color-text-muted)',
          }}>
          {board.status === 'live' ? '● Live' : '○ Draft'}
        </span>
        {board.description && (
          <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {board.description}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--color-border)' }}>
        <Link
          to="?tab=overview"
          className="px-3 py-1.5 rounded-lg text-sm no-underline"
          style={activeTab === 'overview'
            ? { backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }
            : { color: 'var(--color-text-secondary)' }}
        >
          Overview
        </Link>
        <Link
          to="?tab=jobs"
          className="px-3 py-1.5 rounded-lg text-sm no-underline"
          style={activeTab === 'jobs'
            ? { backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }
            : { color: 'var(--color-text-secondary)' }}
        >
          Jobs
        </Link>
        <Link
          to="?tab=settings"
          className="px-3 py-1.5 rounded-lg text-sm no-underline"
          style={activeTab === 'settings'
            ? { backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }
            : { color: 'var(--color-text-secondary)' }}
        >
          Settings
        </Link>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-5">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Board status</p>
            <p className="text-sm font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>
              {board.status === 'live' ? 'Live' : 'Draft'}
            </p>
          </div>
          <div className="card p-5">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total jobs</p>
            <p className="text-sm font-semibold mt-1" style={{ color: 'var(--color-text-primary)' }}>{boardJobs.length}</p>
          </div>
          <div className="card p-5">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Public URL</p>
            <p className="text-sm font-semibold mt-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
              {publicUrl.replace(/^https?:\/\//, '')}
            </p>
          </div>
        </div>
      )}

      {activeTab === 'jobs' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Jobs ({boardJobs.length})
            </h2>
            {boardJobs.length > 0 && (
              <Link to={`/dashboard/jobs/new?boardId=${board.id}`} className="btn-primary text-sm">
                + Post a job
              </Link>
            )}
          </div>

          {boardJobs.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                No jobs yet. Post your first role.
              </p>
              <Link to={`/dashboard/jobs/new?boardId=${board.id}`} className="btn-primary text-sm">
                Post a job
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {boardJobs.map(job => (
                <div key={job.id} className="card p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {job.title}
                      </span>
                      <span className="text-xs capitalize"
                        style={{ color: JOB_STATUS_COLOR[job.status] ?? 'var(--color-text-muted)' }}>
                        {job.status}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {[job.location, job.remotePolicy, job.employmentType].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <Link to={`/dashboard/jobs/${job.id}`} className="btn-outline text-sm">
                    Edit
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'settings' && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="card p-5">
          <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Board settings
          </h3>
          <div className="space-y-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <p><strong>Slug:</strong> {board.slug}</p>
            <p><strong>Status:</strong> {board.status}</p>
            <p><strong>Public URL:</strong> {publicUrl.replace(/^https?:\/\//, '')}</p>
          </div>
          {actionData?.warnings?.length ? (
            <div className="mt-4 rounded-xl border px-4 py-3"
              style={{ borderColor: 'var(--color-warning)', backgroundColor: 'var(--color-warning-bg)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-warning)' }}>
                Accessibility advice
              </p>
              <ul className="text-sm m-0 pl-5" style={{ color: 'var(--color-text-secondary)' }}>
                {actionData.warnings.map((warning, idx) => (
                  <li key={`${idx}-${warning}`}>{warning}</li>
                ))}
              </ul>
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                Tip: adjust colors in Appearance when convenient.
              </p>
            </div>
          ) : null}

          {!canPublish && (
            <div className="mt-4 rounded-xl border px-4 py-3"
              style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)' }}>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Publishing disabled for your role
              </p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Ask a workspace owner or admin with publish access to change this board status.
              </p>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/dashboard/appearance/${board.id}`} className="btn-outline text-sm">
              Appearance
            </Link>
            <Link to={`/dashboard/boards/${board.id}/domain`} className="btn-outline text-sm">
              Domains
            </Link>
            {canPublish ? (
              <Form method="post">
                <input type="hidden" name="intent" value="toggle_status" />
                <button
                  type="submit"
                  disabled={submitting}
                  className={board.status === 'live' ? 'btn-outline text-sm' : 'btn-primary text-sm'}
                >
                  {board.status === 'live' ? 'Unpublish' : 'Publish'}
                </button>
              </Form>
            ) : (
              <button type="button" disabled className="btn-outline text-sm" aria-disabled="true">
                Publish restricted
              </button>
            )}
          </div>
        </section>

        <section className="card p-5">
          <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>
            Monetization settings
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Tier: <strong>{workspacePlan}</strong> · {monetizationAllowed ? 'Monetization available' : 'Monetization locked'}
          </p>

          {!monetizationAllowed && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs"
              style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
              Upgrade to Growth or Scale to configure paid listings.
            </div>
          )}

          {!canManageMonetization && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs"
              style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)' }}>
              Your role cannot edit monetization settings.
            </div>
          )}

          <Form method="post" className="space-y-3">
            <input type="hidden" name="intent" value="update_monetization" />

            <label className="flex items-start gap-2 text-sm" style={{ color: 'var(--color-text-primary)' }}>
              <input
                type="checkbox"
                name="enableMonetization"
                defaultChecked={!!monetizationConfig?.enabled}
                disabled={!monetizationAllowed || !canManageMonetization || submitting}
                className="mt-0.5"
              />
              Enable paid listings for this board
            </label>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Default listing price (GBP)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  name="listingPrice"
                  defaultValue={monetizationConfig?.defaultListingPrice ?? ''}
                  className="input w-full"
                  disabled={!monetizationAllowed || !canManageMonetization || submitting}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Featured listing price (GBP)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  name="featuredPrice"
                  defaultValue={monetizationConfig?.featuredListingPrice ?? ''}
                  className="input w-full"
                  disabled={!monetizationAllowed || !canManageMonetization || submitting}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  Paid listing approval mode
                </label>
                <select
                  name="paidApprovalMode"
                  className="input w-full"
                  defaultValue={monetizationConfig?.requiresApprovalForPaidListings ? 'manual' : 'auto'}
                  disabled={!monetizationAllowed || !canManageMonetization || submitting}
                >
                  <option value="manual">Manual review before publish</option>
                  <option value="auto">Auto-publish paid listings</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="btn-outline text-sm"
              disabled={!monetizationAllowed || !canManageMonetization || submitting}
            >
              {submitting ? 'Saving…' : 'Save monetization settings'}
            </button>
          </Form>
        </section>

        <section className="card p-5" style={{ borderColor: 'var(--color-danger)' }}>
          <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--color-danger)' }}>
            Danger zone
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Deleting this board is permanent. Jobs, applications, and domain settings for this board will be removed.
          </p>

          {actionData?.error && (
            <div className="mb-3 px-3 py-2 rounded-lg text-xs"
              style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              {actionData.error}
            </div>
          )}

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="btn-outline text-sm"
                style={{
                  color: 'var(--color-danger)',
                  borderColor: 'var(--color-danger)',
                }}
              >
                Delete board
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogTitle className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
                Delete board permanently?
              </AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                This removes the board, all jobs, applications, and connected domain settings. This cannot be undone.
              </AlertDialogDescription>

              <Form method="post" className="mt-4 space-y-2">
                <input type="hidden" name="intent" value="delete_board" />
                <label className="block text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Type <span className="font-mono">{board.slug}</span> to confirm
                </label>
                <input
                  name="confirmSlug"
                  value={confirmSlug}
                  onChange={(e) => setConfirmSlug(e.currentTarget.value)}
                  className="input w-full"
                  placeholder={board.slug}
                  autoComplete="off"
                  spellCheck={false}
                />
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <button type="button" className="btn-outline text-sm">Cancel</button>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild className="disabled:opacity-60">
                    <button
                      type="submit"
                      disabled={deleting || confirmSlug.trim().toLowerCase() !== board.slug.toLowerCase()}
                      className="w-full"
                    >
                      {deleting ? 'Deleting…' : 'Delete board'}
                    </button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </Form>
            </AlertDialogContent>
          </AlertDialog>
        </section>
      </div>
      )}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[320px] max-w-[calc(100vw-2rem)] pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="px-3 py-2.5 rounded-xl border text-xs font-medium shadow-lg"
            style={toast.type === 'success'
              ? {
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                borderColor: 'var(--color-success)',
              }
              : {
                backgroundColor: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                borderColor: 'var(--color-danger)',
              }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
