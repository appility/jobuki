import { Link, useNavigate } from 'react-router'
import { useState, useRef, useEffect } from 'react'
import { useClerk, useUser } from '@clerk/react-router'
import type { JobBoardThemeConfig } from '@jobuki/types'

type BoardSharedHeaderProps = {
  boardName: string
  logoUrl?: string | null
  boardConfig: JobBoardThemeConfig
  navMode?: 'full' | 'browse-only'
}

type BoardSharedFooterProps = {
  boardName: string
  boardConfig: JobBoardThemeConfig
  footerText?: string | null
}

function getPortalHref(accountType?: string) {
  if (accountType === 'candidate') return '/candidate'
  if (accountType === 'publisher') return '/hiring'
  if (accountType === 'board_creator') return '/dashboard'
  // Support old values for backward compatibility
  if (accountType === 'job_seeker') return '/candidate'
  if (accountType === 'job_poster') return '/hiring'
  return null
}

export function BoardSharedHeader({ boardName, logoUrl, boardConfig, navMode = 'full' }: BoardSharedHeaderProps) {
  const { user } = useUser()
  const { signOut, openUserProfile } = useClerk()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const hasLogo = Boolean((logoUrl ?? '').trim())
  const accountType = user?.unsafeMetadata?.accountType as string | undefined
  const portalHref = getPortalHref(accountType)
  const initials = (user?.fullName ?? user?.primaryEmailAddress?.emailAddress ?? '?').slice(0, 1).toUpperCase()

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
    <header
      className="sticky top-0 z-40"
      style={{
        backgroundColor: 'color-mix(in srgb, var(--color-surface) var(--board-header-surface-mix), transparent)',
        borderBottom: '1px solid var(--color-border)',
        backdropFilter: 'blur(var(--board-header-blur))',
        boxShadow: '0 1px 0 color-mix(in srgb, var(--color-border) 85%, transparent)',
      }}
    >
      <div className="max-w-[1280px] mx-auto h-[62px] px-6 lg:px-10 flex items-center justify-between gap-4">

        <div className="w-8 lg:hidden" />

        <Link to="/" className="no-underline flex items-center gap-2.5 min-w-0 lg:flex-1">
          {hasLogo ? (
            <img
              src={logoUrl ?? undefined}
              alt={boardName}
              width={156}
              height={36}
              loading="eager"
              decoding="async"
              fetchpriority="high"
              style={{ height: 36, width: 'auto', display: 'block', objectFit: 'contain' }}
            />
          ) : (
            <>
              <svg className="w-7 h-7 shrink-0" viewBox="0 0 28 28" fill="none" aria-hidden="true">
                <circle cx="14" cy="14" r="3" fill="var(--color-primary)" />
                <circle cx="14" cy="14" r="7" stroke="var(--color-primary)" strokeWidth="2" fill="none" strokeDasharray="3 2" />
                <circle cx="14" cy="14" r="12" stroke="var(--color-border)" strokeWidth="1.5" fill="none" />
              </svg>
              <span className="truncate text-[13px] font-extrabold tracking-[0.01em] font-display text-text-primary">
                {boardName}
              </span>
            </>
          )}
        </Link>

        <div className="hidden lg:flex items-center gap-0.5">
          <Link to="/jobs" className="px-3.5 py-2 text-[13px] font-medium rounded-[10px] transition-colors text-text-secondary">
            Browse
          </Link>
          {navMode === 'full' && (
            <>
              <Link to="/about" className="px-3.5 py-2 text-[13px] font-medium rounded-[10px] transition-colors text-text-secondary">
                About
              </Link>
              <Link to="/privacy" className="px-3.5 py-2 text-[13px] font-medium rounded-[10px] transition-colors text-text-secondary">
                Privacy
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-2" ref={menuRef}>
          {user ? (
            <>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
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
                  ? <img src={user.imageUrl} alt={user.fullName ?? ''} className="w-full h-full object-cover" />
                  : initials
                }
              </button>

              {menuOpen && (
                <div
                  className="absolute top-[58px] right-4 lg:right-10 w-52 rounded-[14px] border shadow-lg z-50 overflow-hidden py-1"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                >
                  <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {user.fullName ?? user.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>

                  {portalHref && (
                    <MenuLinkItem to={portalHref} onNavigate={() => setMenuOpen(false)}>
                      My dashboard
                    </MenuLinkItem>
                  )}
                  <MenuLinkItem to="/jobs" onNavigate={() => setMenuOpen(false)}>Browse jobs</MenuLinkItem>
                  <MenuItem onClick={() => { setMenuOpen(false); openUserProfile() }}>Manage account</MenuItem>

                  <div className="border-t my-1" style={{ borderColor: 'var(--color-border)' }} />

                  <MenuItem
                    onClick={() => { setMenuOpen(false); signOut(() => navigate('/sign-in')) }}
                    danger
                  >
                    Sign out
                  </MenuItem>
                </div>
              )}
            </>
          ) : boardConfig.emptyState.ctaUrl ? (
            <a
              href={boardConfig.emptyState.ctaUrl}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 text-[12px] font-bold rounded-[10px] no-underline bg-primary text-primary-fg"
            >
              Post a role
            </a>
          ) : (
            <div className="w-8" />
          )}
        </div>
      </div>
    </header>
  )
}

export function BoardSharedFooter({ boardName, boardConfig, footerText }: BoardSharedFooterProps) {
  return (
    <footer className="border-t mt-10" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
      <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {footerText || <>Powered by <span className="font-semibold" style={{ color: 'var(--color-text-secondary)' }}>Jobuki</span></>}
        </p>
        <nav className="flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          <Link to="/jobs" className="no-underline hover:underline">Browse</Link>
          {boardConfig.pages?.about?.enabled && <Link to="/about" className="no-underline hover:underline">About</Link>}
          {boardConfig.pages?.privacy?.enabled && <Link to="/privacy" className="no-underline hover:underline">Privacy</Link>}
          {boardConfig.footer.showPoweredBy && (
            <a href="https://jobuki.com" target="_blank" rel="noreferrer" className="no-underline hover:underline">Jobuki</a>
          )}
        </nav>
      </div>
    </footer>
  )
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-2.5 text-[13px] font-medium transition-colors"
      style={{ color: danger ? 'var(--color-danger)' : 'var(--color-text-primary)', backgroundColor: 'transparent' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-subtle)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {children}
    </button>
  )
}

function MenuLinkItem({ children, to, onNavigate }: { children: React.ReactNode; to: string; onNavigate: () => void }) {
  return (
    <Link
      to={to}
      prefetch="intent"
      onClick={onNavigate}
      className="block w-full text-left px-4 py-2.5 text-[13px] font-medium no-underline transition-colors"
      style={{ color: 'var(--color-text-primary)', backgroundColor: 'transparent' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--color-surface-subtle)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      {children}
    </Link>
  )
}
