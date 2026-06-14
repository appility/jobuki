import { Outlet, NavLink, useLoaderData, useNavigate, Link, useLocation, useMatches } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireWorkspaceAccess } from '../../lib/auth.server'
import { useClerk } from '@clerk/react-router'
import { useUser } from '@clerk/react-router'
import { useState, useRef, useEffect } from 'react'

export async function loader(args: LoaderFunctionArgs) {
  return requireWorkspaceAccess(args)
}

const navItems = [
  { to: '/dashboard',              label: 'Overview',     icon: '▦' },
  { to: '/dashboard/boards',       label: 'Job Boards',   icon: '⊞' },
  { to: '/dashboard/jobs',         label: 'Jobs',         icon: '✦' },
  { to: '/dashboard/monetization', label: 'Monetization', icon: '¤' },
  { to: '/dashboard/applications', label: 'Applications', icon: '◎' },
]

function getBoardIdFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/dashboard\/boards\/([^/]+)/) ??
            pathname.match(/^\/dashboard\/appearance\/([^/]+)/)
  return m?.[1] ?? null
}

function boardNavItems(id: string) {
  return [
    { to: `/dashboard/boards/${id}`,             label: 'Overview',    icon: '▦', end: true },
    { to: `/dashboard/jobs?boardId=${id}`,       label: 'Jobs',        icon: '✦', end: false },
    { to: `/dashboard/boards/${id}/content`,     label: 'Content',     icon: '✎', end: false },
    { to: `/dashboard/boards/${id}/import`,      label: 'Import jobs', icon: '↓', end: false },
    { to: `/dashboard/boards/${id}/appearance`,  label: 'Appearance',  icon: '◑', end: false },
    { to: `/dashboard/boards/${id}/domain`,      label: 'Domain',      icon: '◉', end: false },
    { to: `/dashboard/boards/${id}/integrations`,label: 'Integrations',icon: '⬡', end: false },
    { to: `/dashboard/boards/${id}/settings`,    label: 'Settings',    icon: '⚙', end: false },
  ]
}

export default function AdminLayout() {
  const { workspace, user } = useLoaderData<typeof loader>()
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const location = useLocation()
  const matches = useMatches()

  const isNewBoard = location.pathname === '/dashboard/boards/new'
  const boardId = isNewBoard ? null : getBoardIdFromPath(location.pathname)
  const boardName = boardId
    ? (matches.map(m => (m.data as any)?.board?.name).filter(Boolean).at(-1) as string | undefined)
    : undefined

  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen md:flex" style={{ backgroundColor: 'var(--color-background)' }}>
      <aside className="hidden md:flex w-56 shrink-0 flex-col h-screen sticky top-0 border-r"
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
        {boardId
          ? <BoardNav boardId={boardId} boardName={boardName} />
          : <DashboardNav />}

        {/* User menu */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <UserMenu user={user} workspace={workspace} />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="md:hidden sticky top-0 z-40 px-4 py-3 border-b flex items-center justify-between"
          style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: 'var(--color-surface-subtle)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
            }}
            aria-label="Open dashboard navigation"
          >
            ☰
          </button>

          <div className="min-w-0 text-center px-2">
            <p className="text-[11px] uppercase tracking-[0.08em]" style={{ color: 'var(--color-text-muted)' }}>
              Workspace
            </p>
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {workspace.name}
            </p>
          </div>

          <Link
            to="/dashboard"
            className="w-9 h-9 rounded-lg flex items-center justify-center no-underline"
            style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
            aria-label="Go to dashboard overview"
          >
            J
          </Link>
        </header>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>

      {mobileNavOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <button
            type="button"
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(17, 24, 39, 0.38)' }}
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close dashboard navigation"
          />

          <div
            className="relative h-full w-[84vw] max-w-[320px] flex flex-col border-r"
            style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
          >
            <div className="px-5 pt-6 pb-4" style={{ borderBottom: `1px solid var(--color-border)` }}>
              <div className="flex items-center justify-between gap-2.5 mb-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: 'var(--color-primary)' }}>
                    <span className="text-white text-sm font-extrabold">J</span>
                  </div>
                  <span className="text-base font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                    Jobuki
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileNavOpen(false)}
                  className="w-8 h-8 rounded-lg"
                  style={{
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-text-secondary)',
                    border: '1px solid var(--color-border)',
                  }}
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                {workspace.name}
              </p>
            </div>

            {boardId
              ? <BoardNav boardId={boardId} boardName={boardName} onNavigate={() => setMobileNavOpen(false)} />
              : <DashboardNav onNavigate={() => setMobileNavOpen(false)} />}

            <div className="p-3 border-t mt-auto" style={{ borderColor: 'var(--color-border)' }}>
              <UserMenu user={user} workspace={workspace} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex-1 p-2.5">
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === '/dashboard'}
          onClick={onNavigate}
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
  )
}

function BoardNav({ boardId, boardName, onNavigate }: {
  boardId: string
  boardName?: string
  onNavigate?: () => void
}) {
  const items = boardNavItems(boardId)
  return (
    <nav className="flex-1 p-2.5 flex flex-col">
      {/* Back link */}
      <Link
        to="/dashboard/boards"
        onClick={onNavigate}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold no-underline mb-3 transition-colors"
        style={{ color: 'var(--color-text-muted)' }}
      >
        ← Job Boards
      </Link>

      {/* Board name */}
      {boardName && (
        <p className="px-3 mb-2 text-[11px] font-bold uppercase tracking-[0.08em] truncate"
          style={{ color: 'var(--color-text-muted)' }}>
          {boardName}
        </p>
      )}

      <div className="h-px mb-2" style={{ backgroundColor: 'var(--color-border)' }} />

      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
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
  )
}

function UserMenu({ user, workspace }: {
  user: { name: string | null; email: string; imageUrl: string | null; isPlatformAdmin?: boolean }
  workspace: { name: string; plan: string }
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { signOut, openUserProfile } = useClerk()
  const { user: clerkUser } = useUser()
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
  const avatarSrc = clerkUser?.imageUrl ?? user.imageUrl

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
        <Avatar src={avatarSrc} initials={initials} size={32} />
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
            <Avatar src={avatarSrc} initials={initials} size={36} />
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
            {user.isPlatformAdmin && (
              <MenuItem icon="♢" as="link" href="/admin" onClick={() => setOpen(false)}>
                Platform admin
              </MenuItem>
            )}
            <MenuItem icon="⊞" as="link" href="/dashboard/boards" onClick={() => setOpen(false)}>
              My boards
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
