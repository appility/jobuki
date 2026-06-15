import { Link } from 'react-router'
import { Zap } from 'lucide-react'

export function MarketingNav() {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1180px', margin: '0 auto', padding: 'clamp(1rem, 3vw, 1.5rem) clamp(1rem, 4vw, 1.5rem)' }}>
      <div style={{ fontFamily: "var(--font-brand, 'Unbounded', sans-serif)", fontWeight: 900, fontSize: 'clamp(1.25rem, 5vw, 1.75rem)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        <Zap size={24} style={{ color: 'var(--color-primary)' }} />
        Jobuki
      </div>
      <div style={{ display: 'flex', gap: 'clamp(1.5rem, 4vw, 2rem)', alignItems: 'center' }}>
        <a href="#" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: 500, fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Boards</a>
        <a href="#" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: 500, fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Pricing</a>
        <a href="#" style={{ color: 'var(--color-text-secondary)', textDecoration: 'none', fontWeight: 500, fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>Docs</a>
        <Link to="/dashboard" style={{ background: 'var(--color-text-primary)', color: 'var(--color-background)', padding: 'clamp(0.625rem, 1.5vw, 0.75rem) clamp(1rem, 3vw, 1.25rem)', borderRadius: '999px', fontWeight: 600, fontSize: 'clamp(0.875rem, 2vw, 1rem)', textDecoration: 'none' }}>Create your board</Link>
      </div>
    </nav>
  )
}
