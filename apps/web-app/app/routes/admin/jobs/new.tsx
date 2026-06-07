import { redirect, Form, useActionData, useNavigation, useLoaderData } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { useState } from 'react'
import { requireWorkspaceAccess } from '../../../lib/auth.server'
import { getDb, boards, jobs } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import { normalizeCategory, resolveBoardCategories, titleCaseCategory } from '../../../lib/board-categories'
import { validateJobTitle } from '../../../lib/content-moderation.server'
import { RichTextEditor } from '../../../components/rich-text/RichTextEditor'
import {
  EMPTY_TIPTAP_DOC,
  parseTiptapJson,
  tiptapDocToPlainText,
  type TiptapNode,
} from '../../../lib/rich-text'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const db = getDb()

  const workspaceBoards = await db.query.boards.findMany({
    where: eq(boards.workspaceId, workspace.id),
  })

  const url = new URL(args.request.url)
  const preselectedBoardId = url.searchParams.get('boardId') ?? ''

  return {
    boards: workspaceBoards.map((board) => ({
      id: board.id,
      name: board.name,
      categories: resolveBoardCategories(
        resolveJobBoardThemeConfig(board.boardConfig, { boardName: board.name }).categories
      ),
    })),
    preselectedBoardId,
  }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const form = await args.request.formData()

  const boardId = form.get('boardId') as string
  const title = (form.get('title') as string).trim()
  const descriptionJson = parseTiptapJson(form.get('descriptionJson'))
  const plainDescriptionFromJson = tiptapDocToPlainText(descriptionJson).trim()
  const plainDescriptionFallback = (form.get('description') as string | null)?.trim() ?? ''
  const description = plainDescriptionFromJson || plainDescriptionFallback

  if (!boardId) return { error: 'Select a board.' }
  if (!title) return { error: 'Job title is required.' }
  const titleError = validateJobTitle(title)
  if (titleError) return { error: titleError }
  if (!description) return { error: 'Job description is required.' }

  const db = getDb()

  // Verify board belongs to workspace
  const board = await db.query.boards.findFirst({ where: eq(boards.id, boardId) })
  if (!board || board.workspaceId !== workspace.id) return { error: 'Invalid board.' }
  const boardCategories = resolveBoardCategories(
    resolveJobBoardThemeConfig(board.boardConfig, { boardName: board.name }).categories
  )
  const primaryCategory = normalizeCategory(form.get('primaryCategory') as string)
  if (primaryCategory && boardCategories.length > 0 && !boardCategories.includes(primaryCategory)) {
    return { error: 'Choose a valid category for this board.' }
  }

  const salaryMin = form.get('salaryMin') ? Number(form.get('salaryMin')) : null
  const salaryMax = form.get('salaryMax') ? Number(form.get('salaryMax')) : null

  const [job] = await db.insert(jobs).values({
    boardId,
    title,
    externalApplyUrl: null,
    externalListingUrl: null,
    externalSource: null,
    company:        (form.get('company') as string).trim() || null,
    location:       (form.get('location') as string).trim() || null,
    remotePolicy:   (form.get('remotePolicy') as any) || 'onsite',
    employmentType: (form.get('employmentType') as any) || 'full-time',
    primaryCategory: primaryCategory || null,
    salaryMin,
    salaryMax,
    descriptionJson: descriptionJson as Record<string, unknown> | null,
    description,
    requirements:   (form.get('requirements') as string).trim() || null,
    benefits:       (form.get('benefits') as string).trim() || null,
    status:         'draft',
  }).returning()

  throw redirect(`/dashboard/jobs/${job.id}`)
}

export default function NewJob() {
  const { boards: workspaceBoards, preselectedBoardId } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const submitting = navigation.state === 'submitting'
  const [boardId, setBoardId] = useState(preselectedBoardId)
  const [descriptionJson, setDescriptionJson] = useState<TiptapNode>(EMPTY_TIPTAP_DOC)
  const selectedBoard = workspaceBoards.find((board) => board.id === boardId)
  const availableCategories = selectedBoard?.categories ?? []

  return (
    <div className="p-10 max-w-2xl">
      <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        Post a job
      </h1>
      <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
        The job will be saved as a draft. Publish it when ready.
      </p>

      {actionData?.error && (
        <div className="mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
          {actionData.error}
        </div>
      )}

      <Form method="post" className="flex flex-col gap-5">
        {/* Board selector */}
        <Field label="Board" required>
          <select name="boardId" value={boardId} onChange={(e) => setBoardId(e.target.value)} className="input w-full" required>
            <option value="">Select a board…</option>
            {workspaceBoards.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Job title" required>
          <input name="title" className="input w-full" placeholder="Senior Product Designer" required autoFocus />
        </Field>

        <Field label="Company">
          <input name="company" className="input w-full" placeholder="Acme Corp" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Location">
            <input name="location" className="input w-full" placeholder="London, UK" />
          </Field>
          <Field label="Remote policy">
            <select name="remotePolicy" className="input w-full" defaultValue="onsite">
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </Field>
        </div>

        <Field label="Employment type">
          <select name="employmentType" className="input w-full" defaultValue="full-time">
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="freelance">Freelance</option>
            <option value="internship">Internship</option>
          </select>
        </Field>

        <Field label="Category" hint={availableCategories.length === 0 ? 'Add board categories in Appearance before assigning jobs.' : undefined}>
          <select name="primaryCategory" className="input w-full" defaultValue="" disabled={!availableCategories.length}>
            <option value="">No category</option>
            {availableCategories.map((category) => (
              <option key={category} value={category}>{titleCaseCategory(category)}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Salary min (£)">
            <input name="salaryMin" type="number" className="input w-full" placeholder="40000" />
          </Field>
          <Field label="Salary max (£)">
            <input name="salaryMax" type="number" className="input w-full" placeholder="60000" />
          </Field>
        </div>

        <Field label="Description" required hint="Rich text supported">
          <RichTextEditor value={descriptionJson} onChange={setDescriptionJson} />
          <input type="hidden" name="descriptionJson" value={JSON.stringify(descriptionJson)} />
          <input
            type="hidden"
            name="description"
            value={tiptapDocToPlainText(descriptionJson).trim()}
          />
        </Field>

        <Field label="Requirements">
          <textarea name="requirements" className="input w-full" rows={4}
            placeholder="What we're looking for…" />
        </Field>

        <Field label="Benefits">
          <textarea name="benefits" className="input w-full" rows={4}
            placeholder="What we offer…" />
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving…' : 'Save draft →'}
          </button>
          <a href="/dashboard/jobs" className="btn-outline">Cancel</a>
        </div>
      </Form>
    </div>
  )
}

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
        {label}{required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
      </label>
      {hint && <p className="text-xs mb-1.5" style={{ color: 'var(--color-text-muted)' }}>{hint}</p>}
      {children}
    </div>
  )
}
