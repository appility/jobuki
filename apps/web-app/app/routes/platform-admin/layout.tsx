import { Link, NavLink, Outlet } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requirePlatformAdmin } from '../../lib/auth.server'

export async function loader(args: LoaderFunctionArgs) {
  await requirePlatformAdmin(args)
  return null
}

const NAV_ITEMS = [
  { to: '/admin', label: 'Permissions' },
  { to: '/admin/tiers', label: 'Tiers' },
  { to: '/admin/publishers', label: 'Publishers' },
  { to: '/admin/candidates', label: 'Candidates' },
]

export default function PlatformAdminLayout() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-10">
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="text-sm no-underline"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ← Back to dashboard
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)] items-start">
          <aside className="rounded-2xl border p-3 sticky top-6" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
            <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--color-text-muted)' }}>
              Platform Admin
            </p>
            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/admin'}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold no-underline"
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? 'var(--color-primary)22' : 'transparent',
                    color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
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
    </div>
  )
}
