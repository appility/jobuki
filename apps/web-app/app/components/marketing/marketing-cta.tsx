import { Link } from 'react-router'

export function MarketingCTA() {
  return (
    <section style={{ maxWidth: '1180px', margin: 'clamp(2rem, 4vw, 4.5rem) auto clamp(1.5rem, 3vw, 3rem)', background: '#1c1a17', borderRadius: '28px', padding: 'clamp(2rem, 4vw, 3.5rem) clamp(1.5rem, 3vw, 2.5rem)', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div style={{ content: '""', position: 'absolute', width: '340px', height: '340px', background: 'radial-gradient(circle, rgba(91, 61, 245, .5), transparent 70%)', top: '-120px', right: '-80px', borderRadius: '50%' }} />
      <h2 style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 700, fontSize: 'clamp(1.5rem, 4vw, 2.125rem)', letterSpacing: '-.02em', marginBottom: 'clamp(0.875rem, 1.5vw, 0.875rem)', position: 'relative', zIndex: 1 }}>
        Your board could be live before lunch.
      </h2>
      <p style={{ color: '#c8c3ba', marginBottom: 'clamp(1rem, 2vw, 1.625rem)', position: 'relative', zIndex: 1, fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
        Pick a theme, point your domain, post your first role.
      </p>
      <Link to="/dashboard" style={{ background: '#5b3df5', color: '#fff', border: 'none', cursor: 'pointer', padding: 'clamp(0.875rem, 2vw, 1rem) clamp(1.5rem, 3vw, 1.75rem)', borderRadius: '14px', fontWeight: 700, fontSize: 'clamp(0.875rem, 2vw, 1rem)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '9px', boxShadow: '0 10px 26px -8px rgba(91, 61, 245, .55)', transition: 'transform .15s, box-shadow .15s', position: 'relative', zIndex: 1 }}>
        Create your board →
      </Link>
    </section>
  )
}
