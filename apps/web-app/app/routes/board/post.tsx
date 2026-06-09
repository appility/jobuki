import { Form, Link, redirect, useActionData, useLoaderData, useNavigation, useOutletContext } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { getDb, boards, jobs, workspaces } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import type { Board } from '@jobuki/types'
import { getOptionalUser } from '../../lib/auth.server'
import { validateJobTitle } from '../../lib/content-moderation.server'
import { guessCompanyLogoUrl } from '../../lib/logo'

export async function loader({ request }: LoaderFunctionArgs) {
  const boardSlug     = request.headers.get('x-board-slug')
  const boardHostname = request.headers.get('x-board-hostname')
  const boardType     = request.headers.get('x-board-type')
  const db = getDb()

  let board = null
  if (boardType === 'custom' && boardHostname) {
    board = await db.query.boards.findFirst({ where: eq(boards.customDomain, boardHostname) })
  } else if (boardSlug) {
    board = await db.query.boards.findFirst({ where: eq(boards.slug, boardSlug) })
  }
  if (!board || board.status !== 'live') throw new Response('Not found', { status: 404 })

  const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, board.workspaceId) })
  const plan = workspace?.plan ?? 'free'
  const canPost = plan !== 'free'

  const user = await getOptionalUser(request)

  return { board, plan, canPost, isSignedIn: Boolean(user), userName: user?.name ?? null }
}

export async function action({ request }: ActionFunctionArgs) {
  const boardSlug     = request.headers.get('x-board-slug')
  const boardHostname = request.headers.get('x-board-hostname')
  const boardType     = request.headers.get('x-board-type')
  const db = getDb()

  let board = null
  if (boardType === 'custom' && boardHostname) {
    board = await db.query.boards.findFirst({ where: eq(boards.customDomain, boardHostname) })
  } else if (boardSlug) {
    board = await db.query.boards.findFirst({ where: eq(boards.slug, boardSlug) })
  }
  if (!board || board.status !== 'live') throw new Response('Not found', { status: 404 })

  const workspace = await db.query.workspaces.findFirst({ where: eq(workspaces.id, board.workspaceId) })
  if (!workspace || workspace.plan === 'free') {
    return { error: 'Job posting is not available on this board.' }
  }

  const user = await getOptionalUser(request)
  if (!user) return redirect(`/sign-in?redirectTo=/post`)

  const form = await request.formData()
  const title         = (form.get('title') as string ?? '').trim()
  const company       = (form.get('company') as string ?? '').trim()
  const location      = (form.get('location') as string ?? '').trim()
  const remotePolicy  = (form.get('remotePolicy') as string ?? 'onsite')
  const employmentType = (form.get('employmentType') as string ?? 'full-time')
  const salaryMin     = Number(form.get('salaryMin') ?? '') || null
  const salaryMax     = Number(form.get('salaryMax') ?? '') || null
  const description   = (form.get('description') as string ?? '').trim()
  const applyUrl      = (form.get('applyUrl') as string ?? '').trim()
  const logoUrl       = (form.get('logoUrl') as string ?? '').trim() || null

  if (!title)       return { error: 'Job title is required.' }
  if (!company)     return { error: 'Company name is required.' }
  if (!description) return { error: 'Job description is required.' }
  if (!applyUrl)    return { error: 'Application URL is required.' }

  const titleError = validateJobTitle(title)
  if (titleError) return { error: titleError }

  try { new URL(applyUrl) } catch { return { error: 'Application URL must be a valid URL.' } }

  await db.insert(jobs).values({
    boardId:         board.id,
    title,
    company:         company || null,
    companyLogoUrl:  logoUrl ?? guessCompanyLogoUrl(company),
    location:        location || null,
    remotePolicy:    remotePolicy as any,
    employmentType:  employmentType as any,
    salaryMin,
    salaryMax,
    salaryCurrency:  'GBP',
    description,
    externalApplyUrl: applyUrl,
    status:          'published',
  })

  return redirect('/post/success')
}

const REMOTE_OPTIONS = [
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'onsite', label: 'On-site' },
]

const TYPE_OPTIONS = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
]

export default function PostJob() {
  const { board, canPost, isSignedIn, plan } = useLoaderData<typeof loader>()
  const { board: layoutBoard } = useOutletContext<{ board: Board }>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const submitting = navigation.state === 'submitting'

  if (!canPost) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-[20px] border border-border bg-surface p-8 text-center">
          <p className="text-3xl mb-4">🔒</p>
          <h1 className="text-xl font-extrabold font-display mb-2 text-text-primary">
            Job posting unavailable
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            This board is on the free plan. Upgrade to Growth or Scale to enable public job posting.
          </p>
          <Link to="/" className="btn-outline text-sm px-5 py-2.5">← Back to board</Link>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-[20px] border border-border bg-surface p-8 text-center">
          <h1 className="text-xl font-extrabold font-display mb-2 text-text-primary">
            Sign in to post a role
          </h1>
          <p className="text-sm text-text-secondary mb-6">
            Create an account or sign in to post a job on {board.name}.
          </p>
          <Link to="/sign-in?redirectTo=/post" className="btn-primary text-sm px-6 py-2.5">
            Sign in →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[680px] mx-auto px-6 pt-10 pb-20">
        <Link to="/" className="inline-flex items-center gap-2 text-[13px] font-semibold rounded-[10px] px-4 py-2 border mb-7 text-text-secondary bg-surface border-border">
          ← Back
        </Link>

        <h1 className="text-2xl font-extrabold font-display mb-1 text-text-primary">Post a role</h1>
        <p className="text-sm text-text-secondary mb-8">
          Your listing will go live immediately on {board.name}.
        </p>

        {actionData?.error && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium"
            style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
            {actionData.error}
          </div>
        )}

        <Form method="post" className="space-y-5">
          <div className="rounded-[20px] border border-border bg-surface p-6 space-y-5">
            <h2 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-secondary">Role details</h2>

            <Field label="Job title" required>
              <input name="title" className="input w-full" placeholder="e.g. Senior Solidity Engineer" required autoFocus />
            </Field>

            <Field label="Company name" required>
              <input name="company" className="input w-full" placeholder="e.g. Acme Labs" required />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Location">
                <input name="location" className="input w-full" placeholder="e.g. London, UK" />
              </Field>
              <Field label="Work style">
                <select name="remotePolicy" className="input w-full">
                  {REMOTE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Employment type">
              <select name="employmentType" className="input w-full">
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Salary min" hint="GBP, annual">
                <input name="salaryMin" type="number" className="input w-full" placeholder="60000" />
              </Field>
              <Field label="Salary max" hint="GBP, annual">
                <input name="salaryMax" type="number" className="input w-full" placeholder="80000" />
              </Field>
            </div>
          </div>

          <div className="rounded-[20px] border border-border bg-surface p-6 space-y-5">
            <h2 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-secondary">Description</h2>
            <Field label="Job description" required>
              <textarea
                name="description"
                rows={10}
                className="input w-full resize-y"
                placeholder="Describe the role, responsibilities, and what you're looking for…"
                required
              />
            </Field>
          </div>

          <div className="rounded-[20px] border border-border bg-surface p-6 space-y-5">
            <h2 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-secondary">Application</h2>

            <Field label="Application URL" required hint="Where candidates apply">
              <input name="applyUrl" type="url" className="input w-full" placeholder="https://yoursite.com/apply" required />
            </Field>

            <Field label="Company logo URL" hint="Optional — paste a direct image URL">
              <input name="logoUrl" type="url" className="input w-full" placeholder="https://yoursite.com/logo.png" />
            </Field>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full py-3.5 text-base font-bold"
          >
            {submitting ? 'Publishing…' : 'Publish role →'}
          </button>

          <p className="text-xs text-center text-text-muted">
            Your role will be live immediately. The board owner can edit or remove it.
          </p>
        </Form>
      </main>

      <footer className="py-8 border-t border-border">
        <p className="text-xs text-center text-text-muted">
          {layoutBoard.footerText || <>Powered by <span className="font-extrabold text-text-secondary">Jobuki</span></>}
        </p>
      </footer>
    </div>
  )
}

function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-sm font-semibold text-text-primary">
          {label}{required && <span className="text-danger"> *</span>}
        </label>
        {hint && <span className="text-xs text-text-muted">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
