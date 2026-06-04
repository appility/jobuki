import { Link, NavLink, Outlet, useLoaderData, useNavigate } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requirePosterAccess } from '../../lib/auth.server'
import { useClerk } from '@clerk/react-router'

export async function loader(args: LoaderFunctionArgs) {
  return requirePosterAccess(args)
}

const posterNav = [
  { to: '/posters', label: 'Overview' },
  { to: '/posters/listings', label: 'Listings' },
  { to: '/posters/billing', label: 'Billing' },
  { to: '/posters/status', label: 'Status' },
]

export default function PosterLayout() {
  const { user } = useLoaderData<typeof loader>()
  const { signOut } = useClerk()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <header className="border-b" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="board-container py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--color-text-muted)' }}>
              Job poster dashboard
            </p>
            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {user.name ?? user.email}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/" className="btn-outline text-sm px-3 py-2">Browse jobs</Link>
            <button
              type="button"
              className="btn-outline text-sm px-3 py-2"
              onClick={() => signOut(() => navigate('/sign-in?type=job-poster'))}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="board-container py-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-6">
        <aside className="card p-3 h-fit md:sticky md:top-4">
          <nav className="flex flex-col gap-1">
            {posterNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/posters'}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm no-underline transition-all ${isActive ? 'font-semibold' : 'font-medium'}`
                }
                style={({ isActive }) => ({
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  backgroundColor: isActive ? 'color-mix(in srgb, var(--color-primary) 10%, transparent)' : 'transparent',
                })}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
