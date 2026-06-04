import { Link, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requirePosterAccess } from '../../lib/auth.server'

export async function loader(args: LoaderFunctionArgs) {
  return requirePosterAccess(args)
}

export default function JobPosterHome() {
  const { user } = useLoaderData<typeof loader>()

  return (
    <section className="card p-6 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.1em]" style={{ color: 'var(--color-text-muted)' }}>
        Overview
      </p>
      <h1 className="text-2xl font-extrabold mt-2" style={{ color: 'var(--color-text-primary)' }}>
        Welcome{user.name ? `, ${user.name.split(' ')[0]}` : ''}
      </h1>
      <p className="text-sm mt-3" style={{ color: 'var(--color-text-secondary)' }}>
        Manage paid posting activity across listings, billing, and status updates from this dashboard.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Listings</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>0</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Pending review</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>0</p>
        </div>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Published</p>
          <p className="text-xl font-bold mt-1" style={{ color: 'var(--color-text-primary)' }}>0</p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/posters/listings" className="btn-primary">Open listings</Link>
        <Link to="/posters/billing" className="btn-outline">View billing</Link>
      </div>
    </section>
  )
}
