import { Link } from 'react-router'

export function MarketingNav() {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '1180px', margin: '0 auto', padding: '22px 24px' }}>
      <div style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 800, fontSize: '22px', letterSpacing: '-.02em', display: 'flex', alignItems: 'center', gap: '9px' }}>
        <span style={{ width: '11px', height: '11px', borderRadius: '3px', background: '#5b3df5', display: 'inline-block', transform: 'rotate(12deg)' }} />
        Jobuki
      </div>
      <div style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
        <a href="#" style={{ color: '#6b6459', textDecoration: 'none', fontWeight: 500, fontSize: '15px' }}>Boards</a>
        <a href="#" style={{ color: '#6b6459', textDecoration: 'none', fontWeight: 500, fontSize: '15px' }}>Pricing</a>
        <a href="#" style={{ color: '#6b6459', textDecoration: 'none', fontWeight: 500, fontSize: '15px' }}>Docs</a>
        <Link to="/dashboard" style={{ background: '#1c1a17', color: '#fff', padding: '11px 20px', borderRadius: '999px', fontWeight: 600, fontSize: '14px', textDecoration: 'none' }}>Create your board</Link>
      </div>
    </nav>
  )
}
