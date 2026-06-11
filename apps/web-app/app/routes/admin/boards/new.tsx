import { redirect, Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { useState } from 'react'
import { requireWorkspaceAccess, userHasWorkspaceFeature } from '../../../lib/auth.server'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { DEFAULT_THEME, DEFAULT_JOB_BOARD_THEME_CONFIG, type BoardOwnerType } from '@jobuki/types'
import { canCreateBoard, canMonetize, getBoardCreationLimit } from '../../../lib/creator-tier'
import { validateBoardName, validateBoardSlug } from '../../../lib/content-moderation.server'

// ── Shared slug/name helpers (used client + server) ───────────────────

/** Strips everything that isn't a letter, number, space, hyphen, or apostrophe */
export function sanitizeName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9 &'\-.,!]/g, '')
}

/** Produces a valid slug from any string */
export function toSlug(raw: string): string {
  return raw
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

/** True when a slug is safe to use */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$/.test(slug) || /^[a-z0-9]{2}$/.test(slug)
}

// ── Loader ────────────────────────────────────────────────────────────
export async function loader(args: LoaderFunctionArgs) {
  const { workspace, user } = await requireWorkspaceAccess(args)
  const db = getDb()
  const existingBoards = await db.query.boards.findMany({
    where: eq(boards.workspaceId, workspace.id),
    columns: { id: true },
  })
  const canCreate = await userHasWorkspaceFeature(user.id, workspace.id, 'board.create')

  return {
    plan: workspace.plan,
    canCreate,
    canMonetize: canMonetize(workspace.plan),
    boardCount: existingBoards.length,
    boardLimit: getBoardCreationLimit(workspace.plan),
  }
}

// ── Action ────────────────────────────────────────────────────────────
export async function action(args: ActionFunctionArgs) {
  const { workspace, user } = await requireWorkspaceAccess(args)
  const form = await args.request.formData()

  const canCreate = await userHasWorkspaceFeature(user.id, workspace.id, 'board.create')
  if (!canCreate) {
    return { error: 'You do not have permission to create boards in this workspace.' }
  }

  const name        = sanitizeName((form.get('name') as string).trim())
  const description = (form.get('description') as string).trim()
  const rawSlug     = (form.get('slug') as string).trim()
  const ownerType = String(form.get('ownerType') ?? 'company') as BoardOwnerType
  const enableMonetization = form.get('enableMonetization') === 'on'
  const approvalMode = String(form.get('paidApprovalMode') ?? 'manual')

  if (!name) return { error: 'Board name is required.' }
  if (name.length > 80) return { error: 'Board name must be 80 characters or fewer.' }

  const nameError = validateBoardName(name)
  if (nameError) return { error: nameError }

  const slug = rawSlug ? toSlug(rawSlug) : toSlug(name)

  if (!isValidSlug(slug)) {
    return { error: 'Slug must be 2–60 characters, lowercase letters and numbers only, hyphens allowed between words (e.g. acme-jobs).' }
  }

  const slugError = validateBoardSlug(slug)
  if (slugError) return { error: slugError }

  if (!['recruiter', 'company', 'community'].includes(ownerType)) {
    return { error: 'Invalid board type selected.' }
  }

  const monetizationAllowed = canMonetize(workspace.plan)
  if (enableMonetization && !monetizationAllowed) {
    return { error: 'Monetization is available on Growth and Scale tiers only.' }
  }

  const listingPriceRaw = String(form.get('listingPrice') ?? '').trim()
  const featuredPriceRaw = String(form.get('featuredPrice') ?? '').trim()
  const listingPrice = listingPriceRaw ? Number(listingPriceRaw) : null
  const featuredPrice = featuredPriceRaw ? Number(featuredPriceRaw) : null

  if (enableMonetization) {
    if (listingPrice == null || Number.isNaN(listingPrice) || listingPrice <= 0) {
      return { error: 'Enter a valid default listing price greater than 0.' }
    }
    if (featuredPrice != null && (Number.isNaN(featuredPrice) || featuredPrice <= 0)) {
      return { error: 'Featured listing price must be greater than 0 when provided.' }
    }
    if (!['auto', 'manual'].includes(approvalMode)) {
      return { error: 'Invalid paid listing approval mode.' }
    }
  }

  const db = getDb()
  const existingBoards = await db.query.boards.findMany({
    where: eq(boards.workspaceId, workspace.id),
    columns: { id: true },
  })
  const access = canCreateBoard(workspace.plan, existingBoards.length)
  if (!access.allowed) {
    return {
      error: `Your ${workspace.plan} plan allows up to ${access.limit} board${access.limit === 1 ? '' : 's'}. Upgrade your plan to create more boards.`,
      upgradeUrl: '/dashboard/billing',
    }
  }

  const existing = await db.query.boards.findFirst({ where: eq(boards.slug, slug) })
  if (existing) return { error: `The slug "${slug}" is already taken. Try another name.` }

  const [board] = await db
    .insert(boards)
    .values({
      workspaceId: workspace.id,
      name,
      slug,
      description: description || null,
      theme: DEFAULT_THEME,
      boardConfig: {
        ...DEFAULT_JOB_BOARD_THEME_CONFIG,
        boardName: name,
        ownerType,
        monetization: {
          ...(DEFAULT_JOB_BOARD_THEME_CONFIG.monetization ?? {}),
          enabled: monetizationAllowed && enableMonetization,
          defaultListingPrice: monetizationAllowed && enableMonetization ? listingPrice : null,
          featuredListingPrice: monetizationAllowed && enableMonetization ? featuredPrice : null,
          requiresApprovalForPaidListings:
            monetizationAllowed && enableMonetization ? approvalMode !== 'auto' : true,
        },
      },
    })
    .returning()

  throw redirect(`/dashboard/boards/${board.id}`)
}

// ── Component ─────────────────────────────────────────────────────────
export default function NewBoard() {
  const { plan, canCreate, canMonetize: monetizationAllowed, boardCount, boardLimit } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const submitting = navigation.state === 'submitting'

  const [slug, setSlug]             = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [enableMonetization, setEnableMonetization] = useState(false)

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Strip invalid characters as they type
    const clean = sanitizeName(e.target.value)
    e.target.value = clean
    if (!slugTouched) setSlug(toSlug(clean))
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugTouched(true)
    // Only allow valid slug characters while typing
    const clean = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')    // strip anything invalid
      .replace(/--+/g, '-')           // collapse multiple hyphens
    setSlug(clean)
    e.target.value = clean
  }

  const slugError = slug.length > 0 && !isValidSlug(slug)
    ? slug.length < 2
      ? 'At least 2 characters'
      : 'Cannot start or end with a hyphen'
    : null

  return (
    <div className="w-full p-8 max-w-xl">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        Create a job board
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
        You can customise the appearance and domain later.
      </p>

      <div className="mb-6 px-4 py-3 rounded-lg text-sm"
        style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)' }}>
        Tier: <strong>{plan}</strong> · Boards used: <strong>{boardCount}</strong> / <strong>{boardLimit}</strong>
      </div>

      {!canCreate && (
        <div className="mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
          Your current role does not include permission to create boards in this workspace.
        </div>
      )}

      {actionData?.error && (
        <div className="mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
          {actionData.error}{' '}
          {actionData.upgradeUrl && (
            <a href={actionData.upgradeUrl} className="font-semibold underline" style={{ color: 'inherit' }}>
              View plans →
            </a>
          )}
        </div>
      )}

      <Form method="post" className="flex flex-col gap-5">
        {/* Board name */}
        <div>
          <label className="block text-sm font-semibold mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}>
            Board name <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <input
            name="name"
            className="input w-full"
            placeholder="Acme Jobs"
            autoFocus
            required
            maxLength={80}
            onChange={handleNameChange}
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-sm font-semibold mb-1"
            style={{ color: 'var(--color-text-primary)' }}>
            Slug
          </label>
          <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
            Used in your board's URL. Only lowercase letters, numbers, and hyphens.
          </p>
          <div className="flex items-stretch rounded-xl overflow-hidden border"
            style={{
              borderColor: slugError ? 'var(--color-danger)' : 'var(--color-border)',
            }}>
            <input
              name="slug"
              value={slug}
              onChange={handleSlugChange}
              className="flex-1 px-3 py-2.5 text-sm font-mono outline-none"
              style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface)' }}
              placeholder="acme-jobs"
              spellCheck={false}
              autoComplete="off"
            />
            <span className="px-3 py-2.5 text-xs shrink-0 select-none flex items-center"
              style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-muted)', borderLeft: '1px solid var(--color-border)' }}>
              .jobuki.com
            </span>
          </div>
          {slugError && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{slugError}</p>
          )}
          {!slugError && slug && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              ✓ {slug}.jobuki.com
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold mb-1.5"
            style={{ color: 'var(--color-text-primary)' }}>
            Description
            <span className="ml-1 font-normal" style={{ color: 'var(--color-text-muted)' }}>(optional)</span>
          </label>
          <textarea
            name="description"
            className="input w-full"
            rows={3}
            placeholder="We're building the future of work…"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
            Board type <span style={{ color: 'var(--color-danger)' }}>*</span>
          </label>
          <select name="ownerType" className="input w-full" defaultValue="company" required>
            <option value="recruiter">Recruiter</option>
            <option value="company">Company</option>
            <option value="community">Community / Charity</option>
          </select>
          <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
            This sets your default workflow language and setup defaults.
          </p>
        </div>

        <div className="rounded-xl border p-4"
          style={{
            borderColor: monetizationAllowed ? 'var(--color-border)' : 'var(--color-warning)',
            backgroundColor: monetizationAllowed ? 'var(--color-surface-subtle)' : 'var(--color-warning-bg)',
          }}>
          <div className="flex items-start gap-3">
            <input
              id="enableMonetization"
              name="enableMonetization"
              type="checkbox"
              disabled={!monetizationAllowed}
              checked={monetizationAllowed ? enableMonetization : false}
              onChange={(e) => setEnableMonetization(e.currentTarget.checked)}
              className="mt-1"
            />
            <div className="min-w-0">
              <label htmlFor="enableMonetization" className="block text-sm font-semibold"
                style={{ color: 'var(--color-text-primary)' }}>
                Enable paid listings during setup
              </label>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {monetizationAllowed
                  ? 'Configure paid posting while creating this board.'
                  : 'Monetization is only available on Growth and Scale tiers.'}
              </p>
            </div>
          </div>

          {monetizationAllowed && enableMonetization && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  Default listing price (GBP) <span style={{ color: 'var(--color-danger)' }}>*</span>
                </label>
                <input name="listingPrice" type="number" min="1" step="1" className="input w-full" placeholder="99" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  Featured listing price (GBP)
                </label>
                <input name="featuredPrice" type="number" min="1" step="1" className="input w-full" placeholder="149" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  Paid listing approval mode
                </label>
                <select name="paidApprovalMode" className="input w-full" defaultValue="manual">
                  <option value="manual">Manual review before publish</option>
                  <option value="auto">Auto-publish paid listings</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting || !!slugError}
            className="btn-primary">
            {submitting ? 'Creating…' : 'Create board →'}
          </button>
          <a href="/dashboard/boards" className="btn-outline">Cancel</a>
        </div>
      </Form>
    </div>
  )
}
