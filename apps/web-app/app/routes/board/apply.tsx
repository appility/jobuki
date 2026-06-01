import { useLoaderData, useOutletContext, Form, useActionData, useNavigation, Link } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { getDb, jobs, applications } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import type { Board } from '@jobuki/types'

export async function loader({ params }: LoaderFunctionArgs) {
  const db = getDb()
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, params.jobId!) })
  if (!job || job.status !== 'published') throw new Response('Not found', { status: 404 })
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

  return { submitted: true }
}

export default function Apply() {
  const { job } = useLoaderData<typeof loader>()
  const { board } = useOutletContext<{ board: Board }>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const submitting  = navigation.state === 'submitting'

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)', fontFamily: 'var(--font-body)' }}>

      <main className="board-container py-12">
        {actionData?.submitted ? (
          /* Success state */
          <div className="max-w-md mx-auto text-center py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl"
              style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              ✓
            </div>
            <h1 className="text-2xl font-extrabold mb-2"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              Application submitted
            </h1>
            <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>
              Thanks for applying to <strong>{job.title}</strong>. We'll review your application and be in touch.
            </p>
            <Link to="/" className="btn-primary">← Back to all roles</Link>
          </div>
        ) : (
          <div className="max-w-lg">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
                Apply for this role
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                {job.title}{job.company ? ` at ${job.company}` : ''}
              </p>
            </div>

            {actionData?.error && (
              <div className="mb-6 px-4 py-3 rounded-xl text-sm"
                style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
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
        )}
      </main>

      <footer className="board-container py-8" style={{ borderTop: '1px solid var(--color-border)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          {board.footerText || (
            <>Powered by <span className="font-extrabold" style={{ color: 'var(--color-text-secondary)' }}>Jobuki</span></>
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
        <label className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {label}{required && <span style={{ color: 'var(--color-danger)' }}> *</span>}
        </label>
        {hint && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}
