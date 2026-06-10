import { Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { useState } from 'react'
import { getDb, candidateProfiles } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { requireUser } from '../../lib/auth.server'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args, { type: 'job-seeker' })
  const db = getDb()
  const profile = await db.query.candidateProfiles.findFirst({
    where: eq(candidateProfiles.userId, user.id),
  })
  return { profile }
}

export async function action(args: ActionFunctionArgs) {
  const user = await requireUser(args, { type: 'job-seeker' })
  const db = getDb()
  const form = await args.request.formData()

  const name        = (form.get('name') as string).trim()
  const headline    = (form.get('headline') as string).trim()
  const location    = (form.get('location') as string).trim()
  const bio         = (form.get('bio') as string).trim()
  const cvUrl       = (form.get('cvUrl') as string).trim()
  const linkedinUrl = (form.get('linkedinUrl') as string).trim()
  const skillsRaw   = (form.get('skills') as string).trim()
  const skills      = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : []

  const existing = await db.query.candidateProfiles.findFirst({
    where: eq(candidateProfiles.userId, user.id),
  })

  if (existing) {
    await db.update(candidateProfiles)
      .set({ name, headline, location, bio, cvUrl, linkedinUrl, skills, updatedAt: new Date() })
      .where(eq(candidateProfiles.userId, user.id))
  } else {
    await db.insert(candidateProfiles)
      .values({ userId: user.id, name, headline, location, bio, cvUrl, linkedinUrl, skills })
  }

  return { ok: true }
}

export default function CandidateProfile() {
  const { profile } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const saving = navigation.state === 'submitting'
  const [skillsInput, setSkillsInput] = useState((profile?.skills ?? []).join(', '))

  return (
    <div className="space-y-5 max-w-xl">
      <h2 className="text-xl font-extrabold font-display" style={{ color: 'var(--color-text-primary)' }}>
        Your profile
      </h2>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Used to pre-fill apply forms and generate personalised cover letters.
      </p>

      {actionData?.ok && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          Profile saved.
        </div>
      )}

      <Form method="post" className="card p-6 space-y-5">
        <Field label="Full name">
          <input name="name" defaultValue={profile?.name ?? ''} className="input w-full" placeholder="Jane Smith" />
        </Field>
        <Field label="Headline" hint="e.g. Senior Solidity Engineer">
          <input name="headline" defaultValue={profile?.headline ?? ''} className="input w-full" placeholder="Senior Engineer" />
        </Field>
        <Field label="Location">
          <input name="location" defaultValue={profile?.location ?? ''} className="input w-full" placeholder="London, UK" />
        </Field>
        <Field label="Bio" hint="2-3 sentences about your background">
          <textarea name="bio" defaultValue={profile?.bio ?? ''} rows={4} className="input w-full resize-y" placeholder="I'm a backend engineer with 6 years of experience…" />
        </Field>
        <Field label="Skills" hint="Comma-separated, e.g. Solidity, TypeScript, DeFi">
          <input
            name="skills"
            value={skillsInput}
            onChange={e => setSkillsInput(e.target.value)}
            className="input w-full"
            placeholder="Solidity, TypeScript, React"
          />
        </Field>
        <Field label="CV URL" hint="Google Drive, Dropbox, or any public link">
          <input name="cvUrl" type="url" defaultValue={profile?.cvUrl ?? ''} className="input w-full" placeholder="https://drive.google.com/…" />
        </Field>
        <Field label="LinkedIn URL">
          <input name="linkedinUrl" type="url" defaultValue={profile?.linkedinUrl ?? ''} className="input w-full" placeholder="https://linkedin.com/in/…" />
        </Field>

        <button type="submit" disabled={saving} className="btn-primary w-full py-3">
          {saving ? 'Saving…' : 'Save profile'}
        </button>
      </Form>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{label}</label>
        {hint && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}
