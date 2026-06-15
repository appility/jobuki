import { Link } from 'react-router'

const AUDIENCE_CARDS = [
  { id: 'recruiters', icon: '👤', title: 'For recruiters', body: 'Spin up a branded board per client, manage pipelines, and share shortlists without spreadsheets.', cta: 'Explore recruiter boards', iconBg: '#ece9fd', iconColor: '#4b35d6', linkColor: '#4b35d6', to: '/for/recruiters' },
  { id: 'companies', icon: '🏢', title: 'For companies', body: 'Put your careers page on your own domain, match your brand, and run applications in one place.', cta: 'Explore company boards', iconBg: '#fdeee4', iconColor: '#e8643c', linkColor: '#e8643c', to: '/for/companies' },
  { id: 'communities', icon: '👥', title: 'For communities', body: 'Launch a niche board for your audience — crypto, AI, or any vertical — and monetise listings.', cta: 'Explore community boards', iconBg: '#e6f6f0', iconColor: '#3ec9a0', linkColor: '#2fa886', to: '/for/communities' },
]

export function MarketingAudience() {
  return (
    <section style={{ padding: '64px 0 30px' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 24px' }}>
        <p style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6b6459', textAlign: 'center', marginBottom: '10px' }}>
          Choose your audience
        </p>
        <h2 style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 700, fontSize: 'clamp(26px, 4vw, 38px)', textAlign: 'center', letterSpacing: '-.02em', marginBottom: '40px' }}>
          One platform, three ways to hire
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '18px' }}>
          {AUDIENCE_CARDS.map((card) => (
            <Link key={card.id} to={card.to} style={{ background: '#fff', border: '1px solid #e7e0d6', borderRadius: '22px', padding: '26px', transition: 'transform .18s, box-shadow .18s', cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <span style={{ width: '42px', height: '42px', borderRadius: '12px', display: 'grid', placeItems: 'center', marginBottom: '16px', fontSize: '20px', background: card.iconBg, color: card.iconColor }}>
                {card.icon}
              </span>
              <h3 style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 600, fontSize: '18px', marginBottom: '8px' }}>
                {card.title}
              </h3>
              <p style={{ fontSize: '14px', color: '#6b6459', marginBottom: '18px', lineHeight: 1.55 }}>
                {card.body}
              </p>
              <span style={{ fontWeight: 700, fontSize: '14px', display: 'inline-flex', gap: '6px', color: card.linkColor }}>
                {card.cta} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
