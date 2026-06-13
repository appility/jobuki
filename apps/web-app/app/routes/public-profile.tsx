import { Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { getDb } from '@jobuki/db'
import { findPublicCandidateProfileByHandle } from '../lib/public-candidate-profile.server'

export async function loader({ params }: LoaderFunctionArgs) {
  const handle = params.handle ?? ''
  const db = getDb()
  const profile = await findPublicCandidateProfileByHandle(db, handle)

  if (!profile) {
    throw new Response('Not found', { status: 404 })
  }

  return { profile }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [
      { title: 'Candidate Profile | Jobuki' },
      { name: 'description', content: 'Public candidate profile.' },
    ]
  }

  const name = data.profile.name?.trim() || 'Candidate'
  const headline = data.profile.headline?.trim()

  return [
    { title: `${name} | Candidate Profile` },
    { name: 'description', content: headline || `View ${name}'s public candidate profile.` },
  ]
}

export default function PublicProfilePage() {
  const { profile } = useLoaderData<typeof loader>()
  const name = profile.name?.trim() || 'Anonymous candidate'
  const headline = profile.headline?.trim()
  const location = profile.location?.trim()
  const bio = profile.bio?.trim()
  const linkedinUrl = profile.linkedinUrl?.trim()
  const skills = Array.isArray(profile.skills)
    ? Array.from(new Set(profile.skills.map((skill) => skill.trim()).filter(Boolean))).slice(0, 24)
    : []

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          'radial-gradient(1200px 400px at 20% -10%, color-mix(in srgb, var(--color-primary) 12%, transparent), transparent 60%), var(--color-background)',
      }}
    >
      <main className="max-w-5xl mx-auto px-6 lg:px-10 py-10 lg:py-14 space-y-6">
        <header
          className="rounded-[20px] border p-6 md:p-8"
          style={{
            borderColor: 'var(--color-border)',
            background:
              'linear-gradient(140deg, color-mix(in srgb, var(--color-surface) 88%, var(--color-primary) 12%), var(--color-surface))',
          }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--color-text-muted)' }}>
            Public candidate profile
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold font-display mt-2" style={{ color: 'var(--color-text-primary)' }}>
            {name}
          </h1>
          {headline && (
            <p className="text-sm md:text-base mt-3 max-w-3xl" style={{ color: 'var(--color-text-secondary)' }}>
              {headline}
            </p>
          )}

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {location && (
              <span
                className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)' }}
              >
                {location}
              </span>
            )}
            {skills.length > 0 && (
              <span
                className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
                style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)' }}
              >
                {skills.length} skill{skills.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <section className="lg:col-span-8 space-y-6">
            {bio && (
              <section className="card p-6 md:p-7">
                <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  About
                </h2>
                <p className="text-sm mt-3 whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                  {bio}
                </p>
              </section>
            )}

            {skills.length > 0 && (
              <section className="card p-6 md:p-7">
                <h2 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  Skills
                </h2>
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)' }}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </section>

          <aside className="lg:col-span-4 space-y-6">
            <section className="card p-6">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Contact links
              </h2>
              <div className="mt-3 space-y-3">
                {linkedinUrl ? (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-semibold inline-flex items-center"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    LinkedIn profile
                  </a>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No public social links added yet.
                  </p>
                )}
              </div>
            </section>

            <section className="card p-6">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Looking for talent?
              </h2>
              <p className="text-sm mt-2" style={{ color: 'var(--color-text-secondary)' }}>
                Explore active roles and discover more candidate profiles on Jobuki.
              </p>
              <Link to="/jobs" className="btn-outline mt-4 text-sm px-4 py-2 inline-flex no-underline">
                Browse jobs
              </Link>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}
