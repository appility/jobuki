import { useLoaderData, useActionData, Form, useNavigation, Link } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace, userHasWorkspaceFeature } from '../../../lib/auth.server'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { addCustomDomain, removeCustomDomain, getCustomDomainStatus, isValidDomain } from '../../../lib/railway'
import { boardUrl } from '../../../lib/board-url'
import type { CreatorPlan } from '@jobuki/types'

const SELF_SERVE_CUSTOM_DOMAIN_PLANS: CreatorPlan[] = ['scale']

function canSelfServeCustomDomain(plan: CreatorPlan) {
  return SELF_SERVE_CUSTOM_DOMAIN_PLANS.includes(plan)
}

function isSuperUserEmail(email: string | null | undefined) {
  if (!email) return false
  const allowlist = (process.env.SUPER_USER_EMAILS ?? '')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean)
  return allowlist.includes(email.trim().toLowerCase())
}

export async function loader(args: LoaderFunctionArgs) {
  const { workspace, user } = await requireWorkspaceAccess(args)
  const canManageDomains = await userHasWorkspaceFeature(user.id, workspace.id, 'board.domain.manage')
  if (!canManageDomains) {
    throw new Response('Forbidden', { status: 403 })
  }
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const canSelfServe = canSelfServeCustomDomain(workspace.plan) || isSuperUserEmail(user.email)
  return {
    board,
    workspacePlan: workspace.plan,
    canSelfServe,
    subdomainUrl: boardUrl(board.slug, null),
    railwayPublicUrl: process.env.RAILWAY_PUBLIC_URL ?? null,
  }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace, user } = await requireWorkspaceAccess(args)
  const canManageDomains = await userHasWorkspaceFeature(user.id, workspace.id, 'board.domain.manage')
  if (!canManageDomains) {
    return { ok: false, error: 'You do not have permission to manage domains in this workspace.' }
  }
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const form = await args.request.formData()
  const intent = form.get('intent') as string
  const db = getDb()
  const canSelfServe = canSelfServeCustomDomain(workspace.plan) || isSuperUserEmail(user.email)

  if (intent === 'request_custom_domain') {
    const raw = String(form.get('domain') || '').trim().toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')

    if (raw && !isValidDomain(raw)) {
      return { ok: false, error: 'Invalid domain format. Use e.g. jobs.yourcompany.com — no https:// or trailing slash.' }
    }

    return {
      ok: true,
      intent: 'request_custom_domain',
      message: raw
        ? `Request received for ${raw}. We will contact you for manual setup.`
        : 'Request received. We will contact you for manual setup.',
    }
  }

  if (intent === 'add') {
    if (!canSelfServe) {
      return {
        ok: false,
        error: 'Self-serve custom domains are available on Scale. Use the request form below for manual setup.',
      }
    }

    const raw = (form.get('domain') as string).trim().toLowerCase()
      .replace(/^https?:\/\//, '')  // strip protocol if pasted
      .replace(/\/$/, '')            // strip trailing slash

    if (!isValidDomain(raw)) {
      return { ok: false, error: 'Invalid domain format. Use e.g. jobs.yourcompany.com — no https:// or trailing slash.' }
    }

    // Check not already taken by another board
    const conflict = await db.query.boards.findFirst({ where: eq(boards.customDomain, raw) })
    if (conflict && conflict.id !== board.id) {
      return { ok: false, error: 'That domain is already in use.' }
    }

    // Remove previous Railway domain if switching
    if (board.railwayDomainId && board.customDomain !== raw) {
      await removeCustomDomain(board.railwayDomainId).catch(() => null)
    }

    try {
      const result = await addCustomDomain(raw)
      await db.update(boards).set({
        customDomain:       raw,
        railwayDomainId:    result.id,
        customDomainStatus: 'pending_dns',
        updatedAt:          new Date(),
      }).where(eq(boards.id, board.id))
      return { ok: true, intent: 'add' }
    } catch (err: any) {
      return { ok: false, error: `Could not provision domain: ${err.message}` }
    }
  }

  if (intent === 'remove') {
    if (!canSelfServe) {
      return {
        ok: false,
        error: 'Self-serve domain management is available on Scale. Contact support to change managed domains.',
      }
    }

    if (board.railwayDomainId) {
      await removeCustomDomain(board.railwayDomainId).catch(() => null)
    }
    await db.update(boards).set({
      customDomain:       null,
      railwayDomainId:    null,
      customDomainStatus: null,
      updatedAt:          new Date(),
    }).where(eq(boards.id, board.id))
    return { ok: true, intent: 'remove' }
  }

  if (intent === 'check') {
    if (!canSelfServe) {
      return {
        ok: false,
        error: 'Self-serve DNS checks are available on Scale. Contact support for status updates.',
      }
    }

    if (!board.railwayDomainId) return { ok: false, error: 'No domain provisioned.' }
    try {
      const status = await getCustomDomainStatus(board.railwayDomainId)
      const isActive = String(status.status).toLowerCase().includes('active')
      await db.update(boards).set({
        customDomainStatus: isActive ? 'active' : 'pending_dns',
        updatedAt: new Date(),
      }).where(eq(boards.id, board.id))
      return { ok: true, intent: 'check', active: isActive }
    } catch (err: any) {
      return { ok: false, error: `Could not check status: ${err.message}` }
    }
  }

  return { ok: false, error: 'Unknown intent.' }
}

export default function DomainPage() {
  const { board, subdomainUrl, railwayPublicUrl, workspacePlan, canSelfServe } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const busy = navigation.state === 'submitting'

  const host = board.customDomain
  const status = board.customDomainStatus

  return (
    <div className="w-full p-8 max-w-2xl">
      <Link to={`/dashboard/boards/${board.id}`}
        className="text-sm no-underline block mb-4" style={{ color: 'var(--color-text-muted)' }}>
        ← {board.name}
      </Link>
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        Domains
      </h1>
      <p className="text-sm mb-10" style={{ color: 'var(--color-text-secondary)' }}>
        Your board is always available on its subdomain. Custom domains are available as a managed add-on.
      </p>

      {/* ── Subdomain ── */}
      <section className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold tracking-wide"
                style={{ color: 'var(--color-text-muted)' }}>SUBDOMAIN</span>
              <StatusPill status="active" />
            </div>
            <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {subdomainUrl.replace(/^https?:\/\//, '')}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              Managed automatically — no DNS changes needed.
            </p>
          </div>
          <a href={subdomainUrl} target="_blank" rel="noopener noreferrer"
            className="btn-outline text-sm shrink-0">
            Visit ↗
          </a>
        </div>
      </section>

      {/* ── Custom domain ── */}
      <section className="card p-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold tracking-wide"
            style={{ color: 'var(--color-text-muted)' }}>CUSTOM DOMAIN</span>
          {host && <StatusPill status={status ?? 'pending_dns'} />}
        </div>
        <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>
          Use your own domain like <span className="font-mono text-xs">jobs.yourcompany.com</span>.
        </p>

        {!canSelfServe && (
          <div className="mb-5 px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
            Your current plan is <strong className="uppercase">{workspacePlan}</strong>. Self-serve custom domains are available on <strong>Scale</strong>. You can still request manual setup below.
          </div>
        )}

        {/* Error / success feedback */}
        {actionData && !actionData.ok && actionData.error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
            {actionData.error}
          </div>
        )}

        {actionData?.ok && actionData.intent === 'check' && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: actionData.active ? 'var(--color-success-bg)' : 'var(--color-warning-bg)',
              color: actionData.active ? 'var(--color-success)' : 'var(--color-warning)' }}>
            {actionData.active
              ? '✓ DNS verified — your domain is live.'
              : 'DNS not yet detected. Check your records below and try again in a few minutes.'}
          </div>
        )}

        {!host ? (
          canSelfServe ? (
            /* No domain yet — add form */
            <Form method="post" className="flex gap-2">
              <input type="hidden" name="intent" value="add" />
              <input
                name="domain"
                className="input flex-1"
                placeholder="jobs.yourcompany.com"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" disabled={busy} className="btn-primary shrink-0">
                {busy ? 'Adding…' : 'Add domain'}
              </button>
            </Form>
          ) : (
            <Form method="post" className="flex gap-2">
              <input type="hidden" name="intent" value="request_custom_domain" />
              <input
                name="domain"
                className="input flex-1"
                placeholder="jobs.yourcompany.com"
                autoComplete="off"
                spellCheck={false}
              />
              <button type="submit" disabled={busy} className="btn-primary shrink-0">
                {busy ? 'Sending…' : 'Request setup'}
              </button>
            </Form>
          )
        ) : (
          <div className="flex flex-col gap-5">
            {/* Current domain row */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold font-mono"
                  style={{ color: 'var(--color-text-primary)' }}>
                  {host}
                </p>
                {status === 'active' && (
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-success)' }}>
                    SSL active · DNS verified
                  </p>
                )}
              </div>
              {canSelfServe ? (
                <div className="flex gap-2 shrink-0">
                  {status !== 'active' && (
                    <Form method="post">
                      <input type="hidden" name="intent" value="check" />
                      <button type="submit" disabled={busy} className="btn-outline text-sm">
                        {busy ? 'Checking…' : 'Check DNS'}
                      </button>
                    </Form>
                  )}
                  <Form method="post"
                    onSubmit={e => { if (!confirm('Remove this custom domain?')) e.preventDefault() }}>
                    <input type="hidden" name="intent" value="remove" />
                    <button type="submit" disabled={busy} className="btn-outline text-sm"
                      style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}>
                      Remove
                    </button>
                  </Form>
                </div>
              ) : (
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Managed by support
                </span>
              )}
            </div>

            {/* DNS instructions — shown until active */}
            {canSelfServe && status !== 'active' && (
              <div className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--color-surface-subtle)', border: '1px solid var(--color-border)' }}>
                <p className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
                  Add this DNS record at your domain registrar:
                </p>
                <div className="rounded-lg overflow-hidden text-xs font-mono"
                  style={{ border: '1px solid var(--color-border)' }}>
                  <div className="grid grid-cols-3 px-4 py-2 font-semibold"
                    style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    <span>Type</span><span>Name</span><span>Value</span>
                  </div>
                  <div className="grid grid-cols-3 px-4 py-3"
                    style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-primary)' }}>
                    <span>CNAME</span>
                    <span>{host.split('.').slice(0, -2).join('.') || '@'}</span>
                    <span style={{ color: 'var(--color-primary)' }}>
                      {railwayPublicUrl ?? 'your-app.up.railway.app'}
                    </span>
                  </div>
                </div>
                <ul className="mt-4 flex flex-col gap-1.5 text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}>
                  <li>① Log in to your domain registrar (Cloudflare, GoDaddy, Namecheap, etc.)</li>
                  <li>② Go to DNS settings for <strong>{host.split('.').slice(-2).join('.')}</strong></li>
                  <li>③ Add the CNAME record above — changes can take 5–60 minutes to propagate</li>
                  <li>④ Click <strong>Check DNS</strong> above once you've saved the record</li>
                </ul>
              </div>
            )}

            {!canSelfServe && (
              <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                We will share DNS instructions during onboarding and verify go-live with you.
              </p>
            )}
          </div>
        )}

        {actionData?.ok && actionData.intent === 'request_custom_domain' && actionData.message && (
          <div className="mt-4 px-4 py-3 rounded-xl text-sm"
            style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            {actionData.message}
          </div>
        )}
      </section>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    active:      { label: 'Active',       bg: 'var(--color-success-bg)', color: 'var(--color-success)' },
    pending_dns: { label: 'Pending DNS',  bg: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
    failed:      { label: 'DNS error',    bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)'  },
  }
  const s = map[status] ?? map.pending_dns
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}
