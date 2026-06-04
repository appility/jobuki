import { redirect, Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { requireUser, getWorkspaceForUser } from '../../lib/auth.server'
import { getDb, workspaces, workspaceMembers } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { toSlug } from './boards/new'

type MarketSegment = 'recruiter' | 'company' | 'community'

const MARKET_CONFIG: Record<MarketSegment, {
  heading: string
  description: string
  suggestedName: string
}> = {
  recruiter: {
    heading: 'Create your recruiter workspace',
    description: 'Set up a branded board you can offer to client companies as a paid listing channel.',
    suggestedName: 'Acme Talent Board',
  },
  company: {
    heading: 'Create your company workspace',
    description: 'Launch a branded careers hub for your team and publish openings from one place.',
    suggestedName: 'Acme Careers',
  },
  community: {
    heading: 'Create your community workspace',
    description: 'Build a mission-led jobs board and support your community with focused opportunities.',
    suggestedName: 'Acme Community Jobs',
  },
}

function parseMarketSegment(value: string | null): MarketSegment | null {
  if (value === 'recruiter' || value === 'company' || value === 'community') return value
  return null
}

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args)
  const existing = await getWorkspaceForUser(user.id)
  if (existing) throw redirect('/dashboard')
  const url = new URL(args.request.url)
  const market = parseMarketSegment(url.searchParams.get('market'))
  return { market }
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
  const { market } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const submitting = navigation.state === 'submitting'
  const marketConfig = market ? MARKET_CONFIG[market] : null

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
            {marketConfig?.heading ?? 'Create your workspace'}
          </h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
            {marketConfig?.description ?? 'A workspace holds all your job boards, jobs, and applications.'}
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
                defaultValue={marketConfig?.suggestedName ?? ''}
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
