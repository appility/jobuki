import { Link } from 'react-router'

export function MarketingCTA() {
  return (
    <section style={{ maxWidth: '1180px', margin: '70px auto 50px', background: '#1c1a17', borderRadius: '28px', padding: '54px 40px', textAlign: 'center', color: '#fff', position: 'relative', overflow: 'hidden' }}>
      <div style={{ content: '""', position: 'absolute', width: '340px', height: '340px', background: 'radial-gradient(circle, rgba(91, 61, 245, .5), transparent 70%)', top: '-120px', right: '-80px', borderRadius: '50%' }} />
      <h2 style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 700, fontSize: 'clamp(24px, 3.5vw, 34px)', letterSpacing: '-.02em', marginBottom: '14px', position: 'relative', zIndex: 1 }}>
        Your board could be live before lunch.
      </h2>
      <p style={{ color: '#c8c3ba', marginBottom: '26px', position: 'relative', zIndex: 1 }}>
        Pick a theme, point your domain, post your first role.
      </p>
      <Link to="/dashboard" style={{ background: '#5b3df5', color: '#fff', border: 'none', cursor: 'pointer', padding: '16px 28px', borderRadius: '14px', fontWeight: 700, fontSize: '16px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '9px', boxShadow: '0 10px 26px -8px rgba(91, 61, 245, .55)', transition: 'transform .15s, box-shadow .15s', position: 'relative', zIndex: 1 }}>
        Create your board →
      </Link>
    </section>
  )
}
