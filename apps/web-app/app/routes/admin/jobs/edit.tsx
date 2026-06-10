import { useLoaderData, Form, useActionData, useNavigation, redirect } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { useState } from 'react'
import { requireWorkspaceAccess } from '../../../lib/auth.server'
import { getDb, jobs, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import { normalizeCategory, resolveBoardCategories, titleCaseCategory } from '../../../lib/board-categories'
import { cacheInvalidate } from '../../../lib/board-cache.server'
import { validateJobTitle } from '../../../lib/content-moderation.server'
import { RichTextEditor } from '../../../components/rich-text/RichTextEditor'
import {
  isTiptapDoc,
  parseTiptapJson,
  tiptapDocToPlainText,
  type TiptapNode,
} from '../../../lib/rich-text'
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
  const { workspace } = await requireWorkspaceAccess(args)
  const db = getDb()

  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, args.params.id!) })
  if (!job) throw new Response('Not found', { status: 404 })

  const board = await db.query.boards.findFirst({ where: eq(boards.id, job.boardId) })
  if (!board || board.workspaceId !== workspace.id) throw new Response('Not found', { status: 404 })

  return {
    job,
    board,
    boardCategories: resolveBoardCategories(
      resolveJobBoardThemeConfig(board.boardConfig, { boardName: board.name }).categories
    ),
  }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const form = await args.request.formData()
  const intent = form.get('intent') as string
  const db = getDb()

  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, args.params.id!) })
  if (!job) throw new Response('Not found', { status: 404 })

  const board = await db.query.boards.findFirst({ where: eq(boards.id, job.boardId) })
  if (!board || board.workspaceId !== workspace.id) throw new Response('Not found', { status: 404 })
  const boardCategories = resolveBoardCategories(
    resolveJobBoardThemeConfig(board.boardConfig, { boardName: board.name }).categories
  )

  if (intent === 'delete') {
    await db.delete(jobs).where(eq(jobs.id, job.id))
    return redirect(`/dashboard/boards/${board.id}`)
  }

  const title = (form.get('title') as string).trim()
  const descriptionJson = parseTiptapJson(form.get('descriptionJson'))
  const plainDescriptionFromJson = tiptapDocToPlainText(descriptionJson).trim()
  const plainDescriptionFallback = (form.get('description') as string | null)?.trim() ?? ''
  const description = plainDescriptionFromJson || plainDescriptionFallback
  if (!title) return { error: 'Title is required.' }
  const titleError = validateJobTitle(title)
  if (titleError) return { error: titleError }
  if (!description) return { error: 'Description is required.' }
  const primaryCategory = normalizeCategory(form.get('primaryCategory') as string)
  if (primaryCategory && boardCategories.length > 0 && !boardCategories.includes(primaryCategory)) {
    return { error: 'Choose a valid category for this board.' }
  }

  const salaryMin = form.get('salaryMin') ? Number(form.get('salaryMin')) : null
  const salaryMax = form.get('salaryMax') ? Number(form.get('salaryMax')) : null

  await db.update(jobs).set({
    title,
    company:        (form.get('company') as string).trim() || null,
    location:       (form.get('location') as string).trim() || null,
    remotePolicy:   (form.get('remotePolicy') as any),
    employmentType: (form.get('employmentType') as any),
    primaryCategory: primaryCategory || null,
    salaryMin,
    salaryMax,
    descriptionJson: descriptionJson as Record<string, unknown> | null,
    description,
    requirements:   (form.get('requirements') as string).trim() || null,
    benefits:       (form.get('benefits') as string).trim() || null,
    status:         (form.get('status') as any),
    updatedAt:      new Date(),
  }).where(eq(jobs.id, job.id))

  cacheInvalidate(`board:${job.boardId}:`)
  return { ok: true }
}

export default function EditJob() {
  const { job, board, boardCategories } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const submitting = navigation.state === 'submitting'
  const [descriptionJson, setDescriptionJson] = useState<TiptapNode | string>(
    isTiptapDoc(job.descriptionJson) ? job.descriptionJson : (job.description ?? '')
  )

  return (
    <div className="p-10 max-w-2xl">
      <a href={`/dashboard/boards/${board.id}`}
        className="text-sm no-underline block mb-4" style={{ color: 'var(--color-text-muted)' }}>
        ← {board.name}
      </a>
      <h1 className="text-2xl font-extrabold mb-8" style={{ color: 'var(--color-text-primary)' }}>
        Edit job
      </h1>

      {actionData?.error && (
        <div className="mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
          {actionData.error}
        </div>
      )}
      {actionData?.ok && (
        <div className="mb-6 px-4 py-3 rounded-lg text-sm"
          style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          Saved.
        </div>
      )}

      <Form method="post" className="flex flex-col gap-5">
        <input type="hidden" name="intent" value="save" />

        <Field label="Status">
          <select name="status" defaultValue={job.status} className="input w-full">
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="closed">Closed</option>
          </select>
        </Field>

        <Field label="Job title" required>
          <input name="title" defaultValue={job.title} className="input w-full" required />
        </Field>

        <Field label="Company">
          <input name="company" defaultValue={job.company ?? ''} className="input w-full" />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Location">
            <input name="location" defaultValue={job.location ?? ''} className="input w-full" />
          </Field>
          <Field label="Remote policy">
            <select name="remotePolicy" defaultValue={job.remotePolicy} className="input w-full">
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </Field>
        </div>

        <Field label="Employment type">
          <select name="employmentType" defaultValue={job.employmentType} className="input w-full">
            <option value="full-time">Full-time</option>
            <option value="part-time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="freelance">Freelance</option>
            <option value="internship">Internship</option>
          </select>
        </Field>

        <Field label="Category" hint={boardCategories.length === 0 ? 'Add board categories in Appearance before assigning jobs.' : undefined}>
          <select name="primaryCategory" defaultValue={job.primaryCategory ?? ''} className="input w-full" disabled={!boardCategories.length}>
            <option value="">No category</option>
            {boardCategories.map((category) => (
              <option key={category} value={category}>{titleCaseCategory(category)}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Salary min (£)">
            <input name="salaryMin" type="number" defaultValue={job.salaryMin ?? ''} className="input w-full" />
          </Field>
          <Field label="Salary max (£)">
            <input name="salaryMax" type="number" defaultValue={job.salaryMax ?? ''} className="input w-full" />
          </Field>
        </div>

        <Field label="Description" required hint="Rich text supported">
          <RichTextEditor value={descriptionJson} onChange={setDescriptionJson} />
          <input
            type="hidden"
            name="descriptionJson"
            value={typeof descriptionJson === 'string' ? '' : JSON.stringify(descriptionJson)}
          />
          <input
            type="hidden"
            name="description"
            value={tiptapDocToPlainText(descriptionJson).trim()}
          />
        </Field>

        <Field label="Requirements">
          <textarea name="requirements" defaultValue={job.requirements ?? ''} className="input w-full" rows={4} />
        </Field>

        <Field label="Benefits">
          <textarea name="benefits" defaultValue={job.benefits ?? ''} className="input w-full" rows={4} />
        </Field>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </Form>

      <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button type="button" className="text-sm font-medium"
              style={{ color: 'var(--color-danger)', background: 'none', border: 'none', cursor: 'pointer' }}>
              Delete this job
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogTitle className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Delete this role?
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              This permanently removes the role and any related applications. This action cannot be undone.
            </AlertDialogDescription>
            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <AlertDialogFooter>
                <AlertDialogCancel asChild>
                  <button type="button" className="btn-outline text-sm">Cancel</button>
                </AlertDialogCancel>
                <AlertDialogAction asChild>
                  <button
                    type="submit"
                    className="w-full"
                  >
                    Delete role
                  </button>
                </AlertDialogAction>
              </AlertDialogFooter>
            </Form>
          </AlertDialogContent>
        </AlertDialog>
      </div>
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
