import { redirect, Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { useState } from 'react'
import { requireWorkspaceAccess } from '../../../lib/auth.server'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { DEFAULT_THEME, DEFAULT_JOB_BOARD_THEME_CONFIG } from '@jobuki/types'
import { canCreateBoard, getBoardCreationLimit } from '../../../lib/creator-tier'

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
  return /^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slug)
}

// ── Loader ────────────────────────────────────────────────────────────
export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const db = getDb()
  const existingBoards = await db.query.boards.findMany({
    where: eq(boards.workspaceId, workspace.id),
    columns: { id: true },
  })

  return {
    plan: workspace.plan,
    boardCount: existingBoards.length,
    boardLimit: getBoardCreationLimit(workspace.plan),
  }
}

// ── Action ────────────────────────────────────────────────────────────
export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const form = await args.request.formData()

  const name        = sanitizeName((form.get('name') as string).trim())
  const description = (form.get('description') as string).trim()
  const rawSlug     = (form.get('slug') as string).trim()

  if (!name) return { error: 'Board name is required.' }
  if (name.length > 80) return { error: 'Board name must be 80 characters or fewer.' }

  const slug = rawSlug ? toSlug(rawSlug) : toSlug(name)

  if (!isValidSlug(slug)) {
    return { error: 'Slug must be 3–60 characters, lowercase letters and numbers only, hyphens allowed between words (e.g. acme-jobs).' }
  }

  const db = getDb()
  const existingBoards = await db.query.boards.findMany({
    where: eq(boards.workspaceId, workspace.id),
    columns: { id: true },
  })
  const access = canCreateBoard(workspace.plan, existingBoards.length)
  if (!access.allowed) {
    return {
      error: `Your ${workspace.plan} creator tier allows up to ${access.limit} board${access.limit === 1 ? '' : 's'}. Upgrade to create more boards.`,
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
      boardConfig: { ...DEFAULT_JOB_BOARD_THEME_CONFIG, boardName: name },
    })
    .returning()

  throw redirect(`/dashboard/boards/${board.id}`)
}

// ── Component ─────────────────────────────────────────────────────────
export default function NewBoard() {
  const { plan, boardCount, boardLimit } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const submitting = navigation.state === 'submitting'

  const [slug, setSlug]             = useState('')
  const [slugTouched, setSlugTouched] = useState(false)

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
    ? slug.length < 3
      ? 'At least 3 characters'
      : 'Cannot start or end with a hyphen'
    : null

  return (
    <div className="p-10 max-w-xl">
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

      {actionData?.error && (
        <div className="mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
          {actionData.error}
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
          <div className="flex items-center gap-0 rounded-xl overflow-hidden border"
            style={{
              borderColor: slugError ? 'var(--color-danger)' : 'var(--color-border)',
            }}>
            <span className="px-3 py-2 text-xs shrink-0 select-none"
              style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-muted)', borderRight: '1px solid var(--color-border)' }}>
              your-domain.com/
            </span>
            <input
              name="slug"
              value={slug}
              onChange={handleSlugChange}
              className="flex-1 px-3 py-2 text-sm font-mono bg-transparent outline-none"
              style={{ color: 'var(--color-text-primary)' }}
              placeholder="acme-jobs"
              spellCheck={false}
              autoComplete="off"
            />
          </div>
          {slugError && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{slugError}</p>
          )}
          {!slugError && slug && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
              ✓ {slug}
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
