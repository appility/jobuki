import { redirect, Form, useActionData, useNavigation, useLoaderData } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { requireWorkspaceAccess } from '../../../lib/auth.server'
import { getDb, boards, jobs } from '@jobuki/db'
import { eq } from 'drizzle-orm'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const db = getDb()

  const workspaceBoards = await db.query.boards.findMany({
    where: eq(boards.workspaceId, workspace.id),
  })

  const url = new URL(args.request.url)
  const preselectedBoardId = url.searchParams.get('boardId') ?? ''

  return { boards: workspaceBoards, preselectedBoardId }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const form = await args.request.formData()

  const boardId = form.get('boardId') as string
  const title = (form.get('title') as string).trim()
  const description = (form.get('description') as string).trim()

  if (!boardId) return { error: 'Select a board.' }
  if (!title) return { error: 'Job title is required.' }
  if (!description) return { error: 'Job description is required.' }

  const db = getDb()

  // Verify board belongs to workspace
  const board = await db.query.boards.findFirst({ where: eq(boards.id, boardId) })
  if (!board || board.workspaceId !== workspace.id) return { error: 'Invalid board.' }

  const salaryMin = form.get('salaryMin') ? Number(form.get('salaryMin')) : null
  const salaryMax = form.get('salaryMax') ? Number(form.get('salaryMax')) : null

  const [job] = await db.insert(jobs).values({
    boardId,
    title,
    company:        (form.get('company') as string).trim() || null,
    location:       (form.get('location') as string).trim() || null,
    remotePolicy:   (form.get('remotePolicy') as any) || 'onsite',
    employmentType: (form.get('employmentType') as any) || 'full-time',
    salaryMin,
    salaryMax,
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
          <select name="boardId" defaultValue={preselectedBoardId} className="input w-full" required>
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

        <div className="grid grid-cols-2 gap-4">
          <Field label="Salary min (£)">
            <input name="salaryMin" type="number" className="input w-full" placeholder="40000" />
          </Field>
          <Field label="Salary max (£)">
            <input name="salaryMax" type="number" className="input w-full" placeholder="60000" />
          </Field>
        </div>

        <Field label="Description" required hint="Markdown supported">
          <textarea name="description" className="input w-full" rows={8}
            placeholder="About the role…" required />
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
