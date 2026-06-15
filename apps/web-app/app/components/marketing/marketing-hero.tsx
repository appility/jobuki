import { Link } from 'react-router'
import { useState, useEffect } from 'react'

const PRESETS = {
  Minimal: { swatch: '#5b3df5', accent: '#5b3df5', display: "'Unbounded', sans-serif", body: "'Plus Jakarta Sans', sans-serif", radius: '13px', brand: 'Northwind', domain: 'careers.yourbrand.com', bg: '#ffffff', bar: '#faf8f5', chip: '#ffffff', border: '#e7e0d6', text: '#1c1a17', soft: '#6b6459', dot: '#e7e0d6' },
  Editorial: { swatch: '#e8643c', accent: '#e8643c', display: "'Fraunces', serif", body: "'Newsreader', serif", radius: '20px', brand: 'Maker & Co', domain: 'jobs.maker.co', bg: '#fdf8f3', bar: '#f9efe6', chip: '#fffdfb', border: '#efdfd1', text: '#2a1c14', soft: '#8a6f5e', dot: '#e7cdb9' },
  Community: { swatch: '#3ec9a0', accent: '#2fa886', display: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif", radius: '8px', brand: 'DevHub', domain: 'hiring.devhub.io', bg: '#f5fbf9', bar: '#eaf6f1', chip: '#ffffff', border: '#d4ece2', text: '#10241d', soft: '#5a7068', dot: '#c4e6d9' },
  Technical: { swatch: '#1c1a17', accent: '#7c6bff', display: "'DM Mono', monospace", body: "'IBM Plex Sans', sans-serif", radius: '2px', brand: 'studio_os', domain: 'work.studio.com', bg: '#16151a', bar: '#1f1d24', chip: '#211f28', border: '#322f3c', text: '#f2f0f7', soft: '#9a96a8', dot: '#3a3744' },
} as const

const JOBS = [
  { title: 'Senior Product Designer', meta: 'Remote · Full-time', pay: '£75k', grad: 'linear-gradient(135deg,#ffd9b3,#ff9e57)' },
  { title: 'Backend Engineer', meta: 'London · Hybrid', pay: '£90k', grad: 'linear-gradient(135deg,#c8c2ff,#5b3df5)' },
  { title: 'Growth Marketer', meta: 'Berlin · Full-time', pay: '€68k', grad: 'linear-gradient(135deg,#b6e8d8,#3ec9a0)' },
]

export function MarketingHero() {
  const [theme, setTheme] = useState<keyof typeof PRESETS>('Minimal')
  const currentPreset = PRESETS[theme]
  const presetNames = Object.keys(PRESETS) as (keyof typeof PRESETS)[]

  // Auto-cycle through themes every 4.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTheme((current) => {
        const currentIndex = presetNames.indexOf(current)
        const nextIndex = (currentIndex + 1) % presetNames.length
        return presetNames[nextIndex]
      })
    }, 4500)

    return () => clearInterval(interval)
  }, [presetNames])

  const boardVars = {
    '--board-accent': currentPreset.accent,
    '--board-font': currentPreset.display,
    '--board-body-font': currentPreset.body,
    '--board-radius': currentPreset.radius,
    '--board-bg': currentPreset.bg,
    '--board-bar': currentPreset.bar,
    '--board-chip': currentPreset.chip,
    '--board-border': currentPreset.border,
    '--board-text': currentPreset.text,
    '--board-soft': currentPreset.soft,
    '--board-dot': currentPreset.dot,
  } as React.CSSProperties

  // Add rocking animation
  const rockingAnimation = `
    @keyframes rock3d {
      0% { transform: perspective(1600px) rotateY(-11deg) rotateX(2deg); }
      50% { transform: perspective(1600px) rotateY(-7deg) rotateX(4deg); }
      100% { transform: perspective(1600px) rotateY(-11deg) rotateX(2deg); }
    }
    .rock-board {
      animation: rock3d 4s ease-in-out infinite;
    }
  `

  return (
    <section style={{ padding: 'clamp(2rem, 4vw, 3.5rem) 0 clamp(2.5rem, 5vw, 4.5rem)' }}>
      <style>{rockingAnimation}</style>
      <div style={{ maxWidth: '1180px', margin: '0 auto', padding: '0 clamp(1rem, 4vw, 1.5rem)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'clamp(2rem, 4vw, 3.5rem)', alignItems: 'center' }}>
        <div>
          <span style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#4b35d6', marginBottom: '22px', display: 'inline-flex', alignItems: 'center', gap: '8px', position: 'relative', paddingLeft: '34px' }}>
            <span style={{ content: '""', width: '26px', height: '2px', background: '#4b35d6', borderRadius: '2px', position: 'absolute', left: 0 }} />
            Hiring platform
          </span>
          <h1 style={{ fontFamily: "'Unbounded', sans-serif", fontWeight: 800, fontSize: 'clamp(40px, 6vw, 68px)', lineHeight: 1.02, letterSpacing: '-.03em', marginBottom: '22px' }}>
            Build a branded<br />job board <span style={{ color: '#5b3df5' }}>in minutes.</span>
          </h1>
          <p style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)', color: '#6b6459', maxWidth: '440px', marginBottom: 'clamp(1.5rem, 3vw, 2rem)', lineHeight: 1.6 }}>
            Jobuki gives recruiters, companies, and communities a board that looks like theirs — with hiring workflows tuned to how they actually work.
          </p>
          <div style={{ display: 'flex', gap: 'clamp(0.875rem, 2vw, 1rem)', alignItems: 'center', flexWrap: 'wrap' }}>
            <Link to="/dashboard" style={{ background: '#5b3df5', color: '#fff', border: 'none', cursor: 'pointer', padding: 'clamp(0.875rem, 2vw, 1rem) clamp(1.5rem, 3vw, 1.75rem)', borderRadius: '14px', fontWeight: 700, fontSize: 'clamp(0.875rem, 2vw, 1rem)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '9px', boxShadow: '0 10px 26px -8px rgba(91, 61, 245, .55)', transition: 'transform .15s, box-shadow .15s' }}>
              Create your board →
            </Link>
            <Link to="/for/communities" style={{ color: '#1c1a17', fontWeight: 600, fontSize: 'clamp(0.875rem, 2vw, 1rem)', textDecoration: 'none', padding: 'clamp(0.875rem, 2vw, 1rem) clamp(0.75rem, 1.5vw, 1rem)' }}>
              See live boards
            </Link>
          </div>
          <p style={{ marginTop: '30px', fontSize: '13px', color: '#6b6459', display: 'flex', gap: '8px', alignItems: 'center' }}>
            Your domain, your theme, your rules — <b style={{ color: '#1c1a17' }}>no code.</b>
          </p>
        </div>

        {/* Board Preview */}
        <div style={{ position: 'relative', perspective: '1600px' }} className="hidden lg:block">
          <div className="rock-board" style={{ background: currentPreset.bg, borderRadius: '22px', boxShadow: '0 30px 70px -30px rgba(28, 26, 23, .28)', border: `1px solid ${currentPreset.border}`, overflow: 'hidden', transformStyle: 'preserve-3d', transition: 'background .35s ease, border-color .35s ease', minHeight: '400px' }}>
            <div style={{ height: '46px', display: 'flex', alignItems: 'center', gap: '7px', padding: '0 16px', borderBottom: `1px solid ${currentPreset.border}`, background: currentPreset.bar, transition: 'background .35s ease, border-color .35s ease' }}>
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: currentPreset.dot, display: 'block' }} />
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: currentPreset.dot, display: 'block' }} />
              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: currentPreset.dot, display: 'block' }} />
              <span style={{ marginLeft: '12px', fontSize: '12px', color: currentPreset.soft, background: currentPreset.chip, border: `1px solid ${currentPreset.border}`, padding: '4px 12px', borderRadius: '8px', transition: 'background .35s ease, color .35s ease, border-color .35s ease' }}>
                {currentPreset.domain}
              </span>
            </div>
            <div style={{ padding: '22px', fontFamily: currentPreset.body }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <span style={{ width: '26px', height: '26px', background: currentPreset.accent, borderRadius: '6px', display: 'grid', placeItems: 'center', position: 'relative', transition: 'background .35s ease, border-radius .3s ease' }} />
                  <span style={{ fontFamily: currentPreset.display, fontWeight: 700, fontSize: '16px', color: currentPreset.text, transition: 'color .35s ease' }}>
                    {currentPreset.brand}
                  </span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '5px 11px', borderRadius: '999px', background: `color-mix(in srgb, ${currentPreset.accent} 14%, transparent)`, color: currentPreset.accent, transition: 'background .35s ease, color .35s ease' }}>
                  12 live
                </span>
              </div>
              {JOBS.map((job) => (
                <div key={job.title} style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '13px', borderRadius: currentPreset.radius, border: `1px solid ${currentPreset.border}`, marginBottom: '10px', background: currentPreset.chip, transition: 'border-radius .3s, background .35s ease, border-color .35s ease' }}>
                  <span style={{ width: '38px', height: '38px', borderRadius: `calc(${currentPreset.radius} * .6)`, flexShrink: 0, transition: 'border-radius .3s', display: 'block', background: job.grad }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <b style={{ fontSize: '13.5px', fontWeight: 600, display: 'block', color: currentPreset.text, transition: 'color .35s ease' }}>{job.title}</b>
                    <span style={{ fontSize: '12px', color: currentPreset.soft, transition: 'color .35s ease' }}>{job.meta}</span>
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: currentPreset.soft, whiteSpace: 'nowrap', transition: 'color .35s ease' }}>{job.pay}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Theme Switcher */}
          <div style={{ position: 'absolute', bottom: '-26px', left: '50%', transform: 'translateX(-50%)', background: '#fff', border: '1px solid #e7e0d6', borderRadius: '999px', padding: '9px 14px', display: 'flex', gap: '9px', alignItems: 'center', boxShadow: '0 14px 30px -14px rgba(28, 26, 23, .3)', zIndex: 3 }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#1c1a17', marginRight: '5px', minWidth: '62px', transition: 'color .2s' }}>
              {theme}
            </span>
            {Object.keys(PRESETS).map((presetName: any) => (
              <button
                key={presetName}
                type="button"
                style={{ width: '20px', height: '20px', borderRadius: '6px', cursor: 'pointer', border: presetName === theme ? '2px solid #1c1a17' : '2px solid transparent', padding: 0, transition: 'transform .15s', background: PRESETS[presetName as keyof typeof PRESETS].swatch }}
                onClick={() => setTheme(presetName as keyof typeof PRESETS)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
