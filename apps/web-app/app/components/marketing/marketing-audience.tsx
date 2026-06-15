import { Link } from 'react-router'
import { UserCircle, Building2, Users } from 'lucide-react'

const AUDIENCE_CARDS = [
  { id: 'recruiters', Icon: UserCircle, title: 'For recruiters', body: 'Spin up a branded board per client, manage pipelines, and share shortlists without spreadsheets.', cta: 'Explore recruiter boards', iconBg: '#ece9fd', iconColor: '#4b35d6', linkColor: '#4b35d6', to: '/for/recruiters' },
  { id: 'companies', Icon: Building2, title: 'For companies', body: 'Put your careers page on your own domain, match your brand, and run applications in one place.', cta: 'Explore company boards', iconBg: '#fdeee4', iconColor: '#e8643c', linkColor: '#e8643c', to: '/for/companies' },
  { id: 'communities', Icon: Users, title: 'For communities', body: 'Launch a niche board for your audience — crypto, AI, or any vertical — and monetise listings.', cta: 'Explore community boards', iconBg: '#e6f6f0', iconColor: '#3ec9a0', linkColor: '#2fa886', to: '/for/communities' },
]

export function MarketingAudience() {
  return (
    <section style={{ padding: 'clamp(2rem, 4vw, 4rem) 0 clamp(1.5rem, 3vw, 2rem)' }}>
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 1.5rem)' }}>
        <p style={{ fontSize: 'clamp(0.8125rem, 1.5vw, 0.8125rem)', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#6b6459', textAlign: 'center', marginBottom: 'clamp(0.75rem, 1.5vw, 0.75rem)' }}>
          Choose your audience
        </p>
        <h2 style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 700, fontSize: 'clamp(1.625rem, 5vw, 2.375rem)', textAlign: 'center', letterSpacing: '-.02em', marginBottom: 'clamp(1.5rem, 3vw, 2.5rem)' }}>
          One platform, three ways to hire
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(1rem, 2vw, 1.125rem)' }}>
          {AUDIENCE_CARDS.map((card) => (
            <Link key={card.id} to={card.to} style={{ background: '#fff', border: '1px solid #e7e0d6', borderRadius: '22px', padding: 'clamp(1.5rem, 3vw, 1.625rem)', transition: 'transform .18s, box-shadow .18s', cursor: 'pointer', textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <span style={{ width: 'clamp(2.5rem, 5vw, 2.625rem)', height: 'clamp(2.5rem, 5vw, 2.625rem)', borderRadius: '12px', display: 'grid', placeItems: 'center', marginBottom: 'clamp(1rem, 2vw, 1rem)', background: card.iconBg, color: card.iconColor }}>
                <card.Icon size={24} />
              </span>
              <h3 style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 600, fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', marginBottom: 'clamp(0.5rem, 1vw, 0.5rem)' }}>
                {card.title}
              </h3>
              <p style={{ fontSize: 'clamp(0.875rem, 1.5vw, 0.875rem)', color: '#6b6459', marginBottom: 'clamp(1rem, 2vw, 1.125rem)', lineHeight: 1.55 }}>
                {card.body}
              </p>
              <span style={{ fontWeight: 700, fontSize: 'clamp(0.875rem, 1.5vw, 0.875rem)', display: 'inline-flex', gap: '6px', color: card.linkColor }}>
                {card.cta} →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
