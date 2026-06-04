import { Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'

type TypePath = 'recruiters' | 'companies' | 'communities'

type TypeContent = {
  title: string
  subtitle: string
  body: string
  bullets: string[]
  cta: string
  onboardingTo: string
}

const TYPE_CONTENT: Record<TypePath, TypeContent> = {
  recruiters: {
    title: 'For Recruiters',
    subtitle: 'Turn your audience into a recurring listing channel',
    body: 'Run a branded jobs board your client companies trust, then monetize with paid slots and featured visibility.',
    bullets: ['Branded board with your own domain', 'Paid listings and promoted spots', 'Fast posting workflow for client teams'],
    cta: 'Start recruiter onboarding',
    onboardingTo: '/dashboard/onboarding?type=recruiter',
  },
  companies: {
    title: 'For Companies',
    subtitle: 'Own your hiring destination and brand experience',
    body: 'Launch a careers board that reflects your company and gives your team a clean workflow for publishing roles.',
    bullets: ['Branded careers experience', 'Simple team publishing flow', 'Designed for candidate conversion'],
    cta: 'Start company onboarding',
    onboardingTo: '/dashboard/onboarding?type=company',
  },
  communities: {
    title: 'For Communities & Charities',
    subtitle: 'Support your mission with opportunities and sponsorship revenue',
    body: 'Create a focused jobs destination for your members and fund operations with sponsored opportunities.',
    bullets: ['Mission-led board design', 'Sponsored listing model', 'Built for trusted community curation'],
    cta: 'Start community onboarding',
    onboardingTo: '/dashboard/onboarding?type=community',
  },
}

function parseTypePath(value: string | undefined): TypePath | null {
  if (value === 'recruiters' || value === 'companies' || value === 'communities') return value
  return null
}

export async function loader({ params }: LoaderFunctionArgs) {
  const type = parseTypePath(params.type)
  if (!type) throw new Response('Not found', { status: 404 })
  return { type, content: TYPE_CONTENT[type] }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [
      { title: 'Jobuki' },
      { name: 'description', content: 'Build branded job boards with Jobuki.' },
    ]
  }

  return [
    { title: `${data.content.title} | Jobuki` },
    { name: 'description', content: data.content.body },
  ]
}

export default function MarketLanding() {
  const { content } = useLoaderData<typeof loader>()

  return (
    <div
      className="min-h-screen px-6 py-12 md:py-14"
      style={{
        background:
          'radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--color-primary) 10%, transparent) 0%, transparent 42%), radial-gradient(circle at 90% 80%, color-mix(in srgb, var(--color-accent) 12%, transparent) 0%, transparent 44%), var(--color-background)',
      }}
    >
      <section className="w-full max-w-3xl mx-auto">
        <div
          className="rounded-[28px] px-7 py-10 md:px-10 md:py-12"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <p className="text-xs font-bold tracking-[0.14em] uppercase mb-3" style={{ color: 'var(--color-text-muted)' }}>
            Hiring audience
          </p>
          <h1 className="text-4xl md:text-5xl font-extrabold leading-[1.05]" style={{ color: 'var(--color-text-primary)' }}>
            {content.title}
          </h1>
          <p className="text-xl mt-4" style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>
            {content.subtitle}
          </p>
          <p className="text-base md:text-lg mt-5" style={{ color: 'var(--color-text-secondary)' }}>
            {content.body}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3">
            {content.bullets.map((bullet) => (
              <p
                key={bullet}
                className="rounded-[14px] px-4 py-3 text-sm"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-surface-subtle) 88%, transparent)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                {bullet}
              </p>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={content.onboardingTo} className="btn-primary text-base px-7 py-3">
              {content.cta}
            </Link>
            <Link to="/" className="btn-outline text-base px-6 py-3">
              Back to homepage
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
