import { Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { getDb } from '@jobuki/db'
import { findPublicCandidateProfileByHandle } from '../lib/public-candidate-profile.server'
import { CandidateProfileBackground } from '../components/candidate-profile-background'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const handle = params.handle ?? ''
  const db = getDb()
  const profile = await findPublicCandidateProfileByHandle(db, handle)

  if (!profile) {
    throw new Response('Not found', { status: 404 })
  }

  // Generate privacy-safe art seed using SHA256 of normalized email
  // This way the actual email is never exposed to the browser
  const normalizedEmail = profile.userId.toLowerCase().trim()
  const encoder = new TextEncoder()
  const data = encoder.encode(normalizedEmail)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  const artSeed = parseInt(hashHex.substring(0, 8), 16) // Use first 8 hex chars

  return { profile, requestUrl: request.url, artSeed }
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) => {
  if (!data) {
    return [
      { title: 'Candidate Profile | Jobuki' },
      { name: 'description', content: 'Public candidate profile.' },
    ]
  }

  const name = data.profile.name?.trim() || 'Candidate'
  const headline = data.profile.headline?.trim()
  const description = headline || `View ${name}'s public candidate profile.`

  const url = new URL(location)
  const canonicalUrl = `${url.protocol}//${url.hostname}${url.pathname.split('?')[0]}`

  const tags: any[] = [
    { title: `${name} | Candidate Profile` },
    { name: 'description', content: description },
    { rel: 'canonical', href: canonicalUrl },
    // OG tags for social sharing
    { property: 'og:title', content: `${name} - Candidate Profile` },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'profile' },
    { property: 'og:url', content: canonicalUrl },
    { property: 'profile:username', content: data.profile.userId },
  ]

  // JSON-LD: Person schema
  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name,
    ...(headline && { jobTitle: headline }),
    ...(data.profile.location && { address: { '@type': 'PostalAddress', addressLocality: data.profile.location } }),
    ...(data.profile.bio && { description: data.profile.bio }),
    ...(data.profile.linkedinUrl && { sameAs: data.profile.linkedinUrl }),
    ...(data.profile.skills && data.profile.skills.length > 0 && {
      knowsAbout: Array.from(new Set(data.profile.skills.filter(Boolean))),
    }),
  }

  tags.push({
    tag: 'script',
    props: {
      type: 'application/ld+json',
      dangerouslySetInnerHTML: { __html: JSON.stringify(personSchema) },
    },
  })

  return tags
}

export default function PublicProfilePage() {
  const { profile, artSeed } = useLoaderData<typeof loader>()
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
        <section className="relative overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
          <CandidateProfileBackground artSeed={artSeed} />

          <div className="relative z-10">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Public Candidate Profile
            </p>

            <h1 className="mt-3 text-4xl font-bold text-zinc-950">
              {name}
            </h1>

            {headline && (
              <p className="mt-3 text-lg text-zinc-600">
                {headline}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-2">
              {location && (
                <span className="rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-zinc-600">
                  {location}
                </span>
              )}

              {skills.length > 0 && (
                <span className="rounded-full bg-white/70 px-4 py-2 text-sm font-medium text-zinc-600">
                  {skills.length} skill{skills.length === 1 ? '' : 's'}
                </span>
              )}
            </div>
          </div>
        </section>

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
