import { NavLink, Outlet, useLoaderData, useNavigate } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { useClerk } from '@clerk/react-router'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args, { type: 'job-seeker' })
  return { user }
}

const NAV = [
  { to: '/candidate', label: 'Overview', end: true },
  { to: '/candidate/saved', label: 'Saved jobs' },
  { to: '/candidate/applications', label: 'Applications' },
  { to: '/candidate/profile', label: 'Profile' },
]

export default function CandidateLayout() {
  const { user } = useLoaderData<typeof loader>()
  const { signOut } = useClerk()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <header className="border-b sticky top-0 z-30" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="board-container h-[62px] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold"
              style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }}>
              {(user.name ?? user.email).slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                {user.name ?? user.email}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>Job seeker</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <NavLink to="/jobs" className="btn-outline text-sm px-3 py-2">Browse jobs</NavLink>
            <button
              type="button"
              className="btn-outline text-sm px-3 py-2"
              onClick={() => signOut(() => navigate('/sign-in'))}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="board-container py-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-6">
        <aside className="card p-3 h-fit md:sticky md:top-[78px]">
          <nav className="flex flex-col gap-1">
            {NAV.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
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
        <main><Outlet /></main>
      </div>
    </div>
  )
}
