import { useLoaderData, Link } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireWorkspaceAccess } from '../../lib/auth.server'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  return { workspace }
}

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: '£0',
    period: 'forever',
    description: 'Get started with one board and manual job posting.',
    features: ['1 job board', 'Manual job posting', 'Basic analytics', 'Community support'],
    cta: 'Current plan',
    ctaDisabled: true,
  },
  {
    key: 'growth',
    name: 'Growth',
    price: '£49',
    period: 'per month',
    description: 'Scale your board with more listings and monetization.',
    features: ['5 job boards', 'Paid listings (monetization)', 'Import from external sources', 'Priority support'],
    cta: 'Upgrade to Growth',
    ctaDisabled: false,
  },
  {
    key: 'scale',
    name: 'Scale',
    price: '£149',
    period: 'per month',
    description: 'Everything in Growth, plus custom domains and white-label.',
    features: ['Unlimited job boards', 'Custom domains', 'White-label branding', 'Dedicated support'],
    cta: 'Upgrade to Scale',
    ctaDisabled: false,
  },
]

export default function BillingPage() {
  const { workspace } = useLoaderData<typeof loader>()
  const currentPlan = workspace.plan

  return (
    <div className="w-full p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Plan &amp; Billing
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          You are currently on the <strong className="capitalize">{currentPlan}</strong> plan.
          Stripe billing integration coming soon.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        {PLANS.map(plan => {
          const isCurrent = plan.key === currentPlan
          return (
            <div
              key={plan.key}
              className="rounded-[18px] border p-6 flex flex-col"
              style={{
                borderColor: isCurrent ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: isCurrent
                  ? 'color-mix(in srgb, var(--color-primary) 5%, var(--color-surface))'
                  : 'var(--color-surface)',
              }}
            >
              {isCurrent && (
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded-full self-start mb-3"
                  style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}>
                  Current plan
                </span>
              )}
              <h2 className="text-lg font-extrabold mb-0.5 font-display" style={{ color: 'var(--color-text-primary)' }}>
                {plan.name}
              </h2>
              <p className="text-2xl font-extrabold mb-0.5 font-display" style={{ color: 'var(--color-text-primary)' }}>
                {plan.price}
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--color-text-muted)' }}>
                  {plan.period}
                </span>
              </p>
              <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                {plan.description}
              </p>
              <ul className="space-y-1.5 mb-6 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <span style={{ color: 'var(--color-primary)' }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={plan.ctaDisabled || isCurrent}
                className={isCurrent ? 'btn-outline text-sm opacity-50 cursor-not-allowed' : 'btn-primary text-sm'}
              >
                {isCurrent ? 'Current plan' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      <div className="rounded-[14px] border px-5 py-4 text-sm"
        style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)' }}>
        Stripe billing integration is coming soon. To upgrade your plan early, contact{' '}
        <a href="mailto:hello@jobuki.com" style={{ color: 'var(--color-primary)' }}>hello@jobuki.com</a>.
      </div>
    </div>
  )
}
