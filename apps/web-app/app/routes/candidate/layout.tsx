import { NavLink, Outlet } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireUser } from '../../lib/auth.server'

export async function loader(args: LoaderFunctionArgs) {
  await requireUser(args, { type: 'candidate' })
  return null
}

const NAV = [
  { to: '/candidate', label: 'Overview', end: true },
  { to: '/candidate/saved', label: 'Saved jobs' },
  { to: '/candidate/applications', label: 'Applications' },
  { to: '/candidate/alerts', label: 'Email alerts' },
  { to: '/candidate/profile', label: 'Profile' },
]

export default function CandidateLayout() {
  return (
    <div
      className="max-w-[1280px] w-full mx-auto px-6 lg:px-10 py-6 grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 md:gap-6"
    >
      <aside
        className="p-3 h-fit md:sticky md:top-[78px] rounded-[16px] border"
        style={{
          borderColor: 'var(--color-border)',
          backgroundColor: 'color-mix(in srgb, var(--color-surface) 92%, transparent)',
          backdropFilter: 'blur(2px)',
        }}
      >
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

      <main>
        <Outlet />
      </main>
    </div>
  )
}
