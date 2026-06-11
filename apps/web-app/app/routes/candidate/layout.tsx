import { NavLink, Outlet, useLoaderData, useNavigate, Link } from 'react-router'
import { useState, useRef, useEffect } from 'react'
import type { LoaderFunctionArgs } from 'react-router'
import { requireUser } from '../../lib/auth.server'
import { getDb, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { useClerk } from '@clerk/react-router'
import { resolveJobBoardThemeConfig } from '@jobuki/types'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args, { type: 'job-seeker' })

  // Try to resolve the board from request headers (set by the reverse proxy)
  const boardSlug     = args.request.headers.get('x-board-slug')
  const boardHostname = args.request.headers.get('x-board-hostname')
  const boardType     = args.request.headers.get('x-board-type')
  const db = getDb()
  let board = null
  if (boardType === 'custom' && boardHostname) {
    board = await db.query.boards.findFirst({ where: eq(boards.customDomain, boardHostname) })
  } else if (boardSlug) {
    board = await db.query.boards.findFirst({ where: eq(boards.slug, boardSlug) })
  }

  const logoUrl = board
    ? (resolveJobBoardThemeConfig(board.boardConfig, { boardName: board.name }).logoUrl ?? null)
    : null

  return { user, boardName: board?.name ?? null, logoUrl }
}

const NAV = [
  { to: '/candidate',              label: 'Overview',     end: true },
  { to: '/candidate/saved',        label: 'Saved jobs' },
  { to: '/candidate/applications', label: 'Applications' },
  { to: '/candidate/profile',      label: 'Profile' },
]

export default function CandidateLayout() {
  const { user, boardName, logoUrl } = useLoaderData<typeof loader>()
  const { signOut, openUserProfile } = useClerk()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const initials = (user.name ?? user.email).slice(0, 1).toUpperCase()

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <header className="border-b sticky top-0 z-30" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="max-w-[1280px] mx-auto h-[62px] px-6 lg:px-10 flex items-center justify-between gap-4">

          {/* Left — Browse jobs on desktop, spacer on mobile */}
          <div className="w-[120px] hidden lg:flex items-center">
            <Link
              to="/jobs"
              className="text-[13px] font-medium no-underline transition-colors"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              ← Browse jobs
            </Link>
          </div>
          <div className="w-8 lg:hidden" />

          {/* Centre — board logo or name */}
          <Link to="/" className="no-underline flex items-center gap-2 min-w-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={boardName ?? 'Home'}
                height={32}
                style={{ height: 32, width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            ) : (
              <span className="text-[14px] font-extrabold tracking-tight font-display" style={{ color: 'var(--color-text-primary)' }}>
                {boardName ?? 'Jobuki'}
              </span>
            )}
          </Link>

          {/* Right — avatar dropdown */}
          <div className="w-[120px] flex justify-end" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(o => !o)}
              className="relative w-9 h-9 rounded-full flex items-center justify-center text-xs font-extrabold border-2 transition-all"
              style={{
                backgroundColor: user.imageUrl ? 'transparent' : 'color-mix(in srgb, var(--color-primary) 12%, transparent)',
                color: 'var(--color-primary)',
                borderColor: menuOpen ? 'var(--color-primary)' : 'transparent',
                overflow: 'hidden',
              }}
              aria-label="Account menu"
            >
              {user.imageUrl
                ? <img src={user.imageUrl} alt={user.name ?? ''} className="w-full h-full object-cover" />
                : initials
              }
            </button>

            {menuOpen && (
              <div
                className="absolute top-[58px] right-4 lg:right-10 w-52 rounded-[14px] border shadow-lg z-50 overflow-hidden py-1"
                style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
              >
                {/* User info */}
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                  <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {user.name ?? user.email}
                  </p>
                  {user.name && (
                    <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>{user.email}</p>
                  )}
                </div>

                <MenuItem onClick={() => { setMenuOpen(false); navigate('/candidate') }}>My hub</MenuItem>
                <MenuItem onClick={() => { setMenuOpen(false); navigate('/jobs') }}>Browse jobs</MenuItem>
                <MenuItem onClick={() => { setMenuOpen(false); openUserProfile() }}>Manage account</MenuItem>

                <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }} />

                <MenuItem
                  onClick={() => { setMenuOpen(false); signOut(() => navigate('/sign-in?type=job-seeker')) }}
                  danger
                >
                  Sign out
                </MenuItem>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-6 grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-6">
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

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors"
      style={{ color: danger ? 'var(--color-danger)' : 'var(--color-text-primary)', backgroundColor: 'transparent' }}
      onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-surface-subtle)')}
      onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {children}
    </button>
  )
}
