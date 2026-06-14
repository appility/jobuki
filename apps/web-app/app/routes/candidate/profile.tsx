import { Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { useEffect, useRef, useState } from 'react'
import { getDb, candidateProfiles } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { requireUser } from '../../lib/auth.server'
import { toPublicProfileHandle } from '../../lib/public-candidate-profile'
import { Button } from '../../components/ui/Button'
import { CvUploadCard } from '../../components/cv-upload-card'
import { clearApplyAiCacheForUser } from '../../lib/apply-prep-cache.server'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args, { type: 'candidate' })
  const db = getDb()
  const profile = await db.query.candidateProfiles.findFirst({
    where: eq(candidateProfiles.userId, user.id),
  }).catch(() => null)
  return { profile }
}

export async function action(args: ActionFunctionArgs) {
  const user = await requireUser(args, { type: 'candidate' })
  const db = getDb()
  const form = await args.request.formData()
  const intent = (form.get('intent') as string | null) ?? 'save'

  const name        = (form.get('name') as string || '').trim()
  const headline    = (form.get('headline') as string || '').trim()
  const location    = (form.get('location') as string || '').trim()
  const bio         = (form.get('bio') as string || '').trim()
  const cvUrl       = (form.get('cvUrl') as string || '').trim()
  const linkedinUrl = (form.get('linkedinUrl') as string || '').trim()
  const skillsRaw   = (form.get('skills') as string || '').trim()
  const skills      = skillsRaw ? skillsRaw.split(',').map(s => s.trim()).filter(Boolean) : []
  const publicProfileEnabled = form.get('publicProfileEnabled') === 'on'

  const existing = await db.query.candidateProfiles.findFirst({
    where: eq(candidateProfiles.userId, user.id),
  })

  if (existing) {
    await db.update(candidateProfiles)
      .set({ name, headline, location, bio, cvUrl, linkedinUrl, skills, publicProfileEnabled, updatedAt: new Date() })
      .where(eq(candidateProfiles.userId, user.id))
  } else {
    await db.insert(candidateProfiles)
      .values({ userId: user.id, name, headline, location, bio, cvUrl, linkedinUrl, skills, publicProfileEnabled })
  }

  clearApplyAiCacheForUser(user.id)

  return { ok: true, intent: 'save' }
}

export default function CandidateProfile() {
  const { profile } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const saving = navigation.state === 'submitting'
  const pendingIntent = navigation.state === 'submitting'
    ? (navigation.formData?.get('intent') ?? 'save')
    : null
  const [skillsInput, setSkillsInput] = useState((profile?.skills ?? []).join(', '))
  const [publicProfileEnabled, setPublicProfileEnabled] = useState(Boolean(profile?.publicProfileEnabled))
  const [copied, setCopied] = useState(false)
  const urlInputRef = useRef<HTMLInputElement>(null)
  const publicHandle = profile?.id && publicProfileEnabled ? toPublicProfileHandle(profile.id) : null
  const publicUrlPath = publicHandle ? `/profile/${publicHandle}` : null
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const publicUrlFull = publicUrlPath ? `${origin}${publicUrlPath}` : null

  function updateVisibility(nextValue: boolean) {
    setPublicProfileEnabled(nextValue)
  }

  function copyUrl() {
    if (!publicUrlFull) return
    navigator.clipboard.writeText(publicUrlFull).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  useEffect(() => {
    setPublicProfileEnabled(Boolean(profile?.publicProfileEnabled))
  }, [profile?.publicProfileEnabled])
  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold font-display" style={{ color: 'var(--color-text-primary)' }}>
          Your profile
        </h2>
        {publicUrlPath && (
          <a
            href={publicUrlPath}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold no-underline"
            style={{ color: 'var(--color-primary)' }}
          >
            View public profile ↗
          </a>
        )}
      </div>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        Used to pre-fill apply forms and generate personalised cover letters.
      </p>

      {actionData?.ok && actionData.intent === 'save' && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          Profile saved.
        </div>
      )}

      <Form method="post" className="card p-6 space-y-5">
        <input type="hidden" name="intent" value="save" />
        <input type="hidden" name="publicProfileEnabled" value={publicProfileEnabled ? 'on' : 'off'} />
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
        <Field label="LinkedIn URL">
          <input name="linkedinUrl" type="url" defaultValue={profile?.linkedinUrl ?? ''} className="input w-full" placeholder="https://linkedin.com/in/…" />
        </Field>

        <Button
          type="submit"
          variant="primary"
          size="md"
          className="w-full"
          loading={saving && pendingIntent === 'save'}
          loadingText="Saving…"
        >
          Save profile
        </Button>

        <div className="border-t pt-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Public profile</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {publicProfileEnabled
                  ? 'Your profile is public and visible from your shared link.'
                  : 'Your profile is hidden. Toggle on to make it public.'}
              </p>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={publicProfileEnabled}
                onChange={(e) => updateVisibility(e.target.checked)}
                className="sr-only peer"
              />
              <div className="h-6 w-11 rounded-full border-2 transition-colors peer-checked:bg-primary peer-checked:border-primary border-border bg-surface-subtle after:absolute after:left-[3px] after:top-[3px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>

          {publicUrlFull && (
            <div className="flex items-center gap-2">
              <input
                ref={urlInputRef}
                type="text"
                readOnly
                value={publicUrlFull}
                className="input flex-1 text-xs font-mono"
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={copyUrl}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </Button>
            </div>
          )}
        </div>
      </Form>

      <CvUploadCard
        cvUrl={profile?.cvUrl}
        cvExtractedText={profile?.cvExtractedText}
        lastUpdated={profile?.updatedAt}
      />
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
