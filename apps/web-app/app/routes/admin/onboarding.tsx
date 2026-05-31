import { redirect, Form, useActionData, useNavigation } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { requireUser, getWorkspaceForUser } from '../../lib/auth.server'
import { getDb, workspaces, workspaceMembers } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { toSlug } from './boards/new'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args)
  const existing = await getWorkspaceForUser(user.id)
  if (existing) throw redirect('/dashboard')
  return {}
}

export async function action(args: ActionFunctionArgs) {
  const user = await requireUser(args)
  const form = await args.request.formData()
  const name = (form.get('name') as string).trim()

  if (!name) return { error: 'Workspace name is required.' }

  let slug = toSlug(name)

  const db = getDb()

  // Ensure slug uniqueness
  const existing = await db.query.workspaces.findFirst({ where: eq(workspaces.slug, slug) })
  if (existing) slug = `${slug}-${Date.now().toString(36)}`

  const [workspace] = await db
    .insert(workspaces)
    .values({ name, slug, ownerUserId: user.id })
    .returning()

  await db.insert(workspaceMembers).values({
    workspaceId: workspace.id,
    userId: user.id,
    role: 'owner',
  })

  throw redirect('/dashboard')
}

export default function Onboarding() {
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const submitting = navigation.state === 'submitting'

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="w-full max-w-md px-4">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--color-primary)' }}>
            <span className="text-white text-sm font-extrabold">J</span>
          </div>
          <span className="text-xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>Jobuki</span>
        </div>

        <div className="card p-8">
          <h1 className="text-xl font-extrabold mb-1" style={{ color: 'var(--color-text-primary)' }}>
            Create your workspace
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            A workspace holds all your job boards, jobs, and applications.
          </p>

          {actionData?.error && (
            <div className="mb-4 px-4 py-3 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              {actionData.error}
            </div>
          )}

          <Form method="post" className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                Workspace name
              </label>
              <input
                name="name"
                className="input w-full"
                placeholder="Acme Corp"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full py-3"
            >
              {submitting ? 'Creating…' : 'Create workspace →'}
            </button>
          </Form>
        </div>
      </div>
    </div>
  )
}
