import { Outlet, NavLink, useLoaderData, useNavigate, Link } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireWorkspaceAccess } from '../../lib/auth.server'
import { useClerk } from '@clerk/react-router'
import { useState, useRef, useEffect } from 'react'

export async function loader(args: LoaderFunctionArgs) {
  return requireWorkspaceAccess(args)
}

const navItems = [
  { to: '/dashboard',              label: 'Overview',     icon: '▦' },
  { to: '/dashboard/boards',       label: 'Job Boards',   icon: '⊞' },
  { to: '/dashboard/jobs',         label: 'Jobs',         icon: '✦' },
  { to: '/dashboard/applications', label: 'Applications', icon: '◎' },
]

export default function AdminLayout() {
  const { workspace, user } = useLoaderData<typeof loader>()

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <aside className="w-56 shrink-0 flex flex-col h-screen sticky top-0 border-r"
        style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>

        {/* Logo + workspace */}
        <div className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid var(--color-border)` }}>
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-primary)' }}>
              <span className="text-white text-sm font-extrabold">J</span>
            </div>
            <span className="text-base font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
              Jobuki
            </span>
          </div>
          <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
            {workspace.name}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-2.5">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm mb-0.5 no-underline transition-all ${
                  isActive ? 'font-semibold' : 'font-normal'
                }`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--color-primary)18' : 'transparent',
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              })}
            >
              <span className="text-xs">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* User menu */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <UserMenu user={user} workspace={workspace} />
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

function UserMenu({ user, workspace }: {
  user: { name: string | null; email: string; imageUrl: string | null }
  workspace: { name: string; plan: string }
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { signOut, openUserProfile } = useClerk()
  const navigate = useNavigate()

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const initials = user.name
    ? user.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : user.email[0].toUpperCase()

  const PLAN_LABEL: Record<string, string> = { free: 'Free', growth: 'Growth', scale: 'Scale' }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl transition-all text-left"
        style={{
          backgroundColor: open ? 'var(--color-surface-subtle)' : 'transparent',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <Avatar src={user.imageUrl} initials={initials} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
            {user.name ?? user.email.split('@')[0]}
          </p>
          <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
            {PLAN_LABEL[workspace.plan] ?? workspace.plan} plan
          </p>
        </div>
        <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          {open ? '▴' : '▾'}
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute left-0 right-0 rounded-xl overflow-hidden"
          style={{
            bottom: 'calc(100% + 6px)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 50,
          }}
        >
          {/* User info header */}
          <div className="px-3 py-3 flex items-center gap-2.5"
            style={{ borderBottom: '1px solid var(--color-border)' }}>
            <Avatar src={user.imageUrl} initials={initials} size={36} />
            <div className="min-w-0">
              {user.name && (
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                  {user.name}
                </p>
              )}
              <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                {user.email}
              </p>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1">
            <MenuItem icon="⚙" onClick={() => { openUserProfile(); setOpen(false) }}>
              Account settings
            </MenuItem>
            <MenuItem icon="⊞" as="link" href="/dashboard/boards" onClick={() => setOpen(false)}>
              My boards
            </MenuItem>
            <MenuItem icon="◈" as="link" href="/dashboard/billing" onClick={() => setOpen(false)}>
              Plan &amp; billing
              <span className="ml-auto text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
                  color: 'var(--color-primary)',
                }}>
                {PLAN_LABEL[workspace.plan] ?? workspace.plan}
              </span>
            </MenuItem>
          </div>

          <div className="p-1" style={{ borderTop: '1px solid var(--color-border)' }}>
            <MenuItem
              icon="→"
              danger
              onClick={() => signOut(() => navigate('/sign-in'))}
            >
              Sign out
            </MenuItem>
          </div>
        </div>
      )}
    </div>
  )
}

function Avatar({ src, initials, size }: { src: string | null; initials: string; size: number }) {
  return src ? (
    <img src={src} alt="" width={size} height={size}
      className="rounded-full object-cover shrink-0"
      style={{ width: size, height: size }} />
  ) : (
    <div className="rounded-full flex items-center justify-center shrink-0 text-white font-bold"
      style={{
        width: size, height: size,
        fontSize: size * 0.38,
        backgroundColor: 'var(--color-primary)',
      }}>
      {initials}
    </div>
  )
}

const PLAN_LABEL: Record<string, string> = { free: 'Free', growth: 'Growth', scale: 'Scale' }

function MenuItem({ icon, children, onClick, as, href, danger }: {
  icon: string
  children: React.ReactNode
  onClick?: () => void
  as?: 'link'
  href?: string
  danger?: boolean
}) {
  const style = {
    color: danger ? 'var(--color-danger)' : 'var(--color-text-secondary)',
  }
  const cls = `flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-xs font-medium transition-all no-underline`

  if (as === 'link' && href) {
    return (
      <Link to={href} onClick={onClick} className={cls} style={style}
        onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-subtle)')}
        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
        <span>{icon}</span>
        {children}
      </Link>
    )
  }

  return (
    <button onClick={onClick} className={cls}
      style={{ ...style, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-subtle)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
      <span>{icon}</span>
      {children}
    </button>
  )
}
