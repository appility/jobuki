import { useLoaderData, useOutletContext, Form, useActionData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { redirect } from 'react-router'
import { getDb, jobs, applications } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import type { Board } from '@jobuki/types'

export async function loader({ params }: LoaderFunctionArgs) {
  const db = getDb()
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, params.jobId!) })
  if (!job || job.status !== 'published') throw new Response('Not found', { status: 404 })
  if (job.externalApplyUrl || job.externalListingUrl) throw new Response('Not found', { status: 404 })
  return { job }
}

export async function action({ params, request }: ActionFunctionArgs) {
  const db = getDb()
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, params.jobId!) })
  if (!job || job.status !== 'published') throw new Response('Not found', { status: 404 })

  const form = await request.formData()
  const candidateName  = (form.get('candidateName') as string).trim()
  const candidateEmail = (form.get('candidateEmail') as string).trim()

  if (!candidateName)  return { error: 'Name is required.' }
  if (!candidateEmail) return { error: 'Email is required.' }

  await db.insert(applications).values({
    jobId:          job.id,
    boardId:        job.boardId,
    candidateName,
    candidateEmail,
    candidatePhone: (form.get('candidatePhone') as string).trim() || null,
    coverLetter:    (form.get('coverLetter') as string).trim() || null,
    cvUrl:          (form.get('cvUrl') as string).trim() || null,
    linkedinUrl:    (form.get('linkedinUrl') as string).trim() || null,
  })

  return redirect(`/apply/${job.id}/success`)
}

export default function Apply() {
  const { job } = useLoaderData<typeof loader>()
  const { board } = useOutletContext<{ board: Board }>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const submitting  = navigation.state === 'submitting'

  return (
    <div className="min-h-screen bg-background font-body">

      <main className="board-container py-12">
        <div className="max-w-lg">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold mb-1 font-display text-text-primary">
              Apply for this role
            </h1>
            <p className="text-sm text-text-secondary">
              {job.title}{job.company ? ` at ${job.company}` : ''}
            </p>
          </div>

          {actionData?.error && (
            <div className="mb-6 px-4 py-3 rounded-xl text-sm bg-danger-bg text-danger">
              {actionData.error}
            </div>
          )}

          <Form method="post" className="flex flex-col gap-5">
            <FormField label="Full name" required>
              <input name="candidateName" className="input w-full"
                placeholder="Jane Smith" required autoFocus />
            </FormField>

            <FormField label="Email address" required>
              <input name="candidateEmail" type="email" className="input w-full"
                placeholder="jane@example.com" required />
            </FormField>

            <FormField label="Phone number" hint="Optional">
              <input name="candidatePhone" type="tel" className="input w-full"
                placeholder="+44 7700 900000" />
            </FormField>

            <FormField label="CV / Resume" hint="Paste a link to your CV (Google Drive, Dropbox, etc.)">
              <input name="cvUrl" type="url" className="input w-full"
                placeholder="https://drive.google.com/..." />
            </FormField>

            <FormField label="LinkedIn" hint="Optional">
              <input name="linkedinUrl" type="url" className="input w-full"
                placeholder="https://linkedin.com/in/..." />
            </FormField>

            <FormField label="Cover letter" hint="Optional — tell us why you'd be a great fit">
              <textarea name="coverLetter" className="input w-full" rows={6}
                placeholder="I'm excited to apply because…" />
            </FormField>

            <button type="submit" disabled={submitting}
              className="btn-primary w-full py-3 text-base mt-2">
              {submitting ? 'Submitting…' : 'Submit application →'}
            </button>
          </Form>
        </div>
      </main>

      <footer className="board-container py-8 border-t border-border">
        <p className="text-xs text-center text-text-muted">
          {board.footerText || (
            <>Powered by <span className="font-extrabold text-text-secondary">Jobuki</span></>
          )}
        </p>
      </footer>
    </div>
  )
}

function FormField({ label, hint, required, children }: {
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
