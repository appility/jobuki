import { Form, Link } from 'react-router'
import type { CSSProperties } from 'react'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import type { BoardLoaderData } from '../routes/marketing/home'
import { hexToHsl, hslToHex, isValidHex, readableFg } from '../lib/color'

const V6_STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,700&family=Unbounded:wght@700;800;900&display=swap');

.v6-board, .v6-board * { box-sizing: border-box; }
.v6-board {
  --bg: #F0EBE3;
  --bg2: #E8E1D8;
  --white: #FAF8F4;
  --ink: #16120E;
  --mid: #7C7067;
  --rule: #D4CBBD;
  --vio: #6C3BFF;
  --vio-l: #EDE6FF;
  --vio-d: #4A22D4;
  --grn: #1B7A4E;
  --grn-l: #E2F4EB;
  --sky: #1760C8;
  --sky-l: #E2EEFB;
  --amber: #C47B00;
  --amb-l: #FEF3DC;

  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Plus Jakarta Sans', 'DM Sans', sans-serif;
  font-weight: 400;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.v6-board a { text-decoration: none; color: inherit; }
.v6-board button, .v6-board input, .v6-board select { font-family: inherit; }
.v6-shell { max-width: 1280px; margin: 0 auto; }

.v6-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 62px;
  padding: 0 40px;
  background: var(--white);
  border-bottom: 1px solid var(--rule);
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
}
.v6-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Unbounded', var(--font-display), sans-serif;
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.01em;
}
.v6-logo-icon { width: 28px; height: 28px; flex-shrink: 0; }
.v6-nav-r { display: flex; align-items: center; gap: 2px; }
.v6-nl {
  font-size: 13px;
  font-weight: 500;
  color: var(--mid);
  padding: 8px 14px;
  border-radius: 10px;
  transition: background 0.1s, color 0.1s;
}
.v6-nl:hover { background: var(--bg); color: var(--ink); }
.v6-ncta {
  margin-left: 8px;
  border: none;
  border-radius: 10px;
  padding: 9px 20px;
  background: var(--cta-bg);
  color: var(--cta-fg);
  font-size: 13px;
  font-weight: 700;
  transition: background 0.15s, transform 0.15s;
}
.v6-ncta:hover,
.v6-ncta:focus-visible,
.v6-ncta:visited {
  color: var(--cta-fg);
  text-decoration: none;
}
.v6-ncta:hover {
  background: var(--cta-accent);
  color: var(--cta-accent-fg);
  transform: translateY(-1px);
}

.v6-hero {
  padding: 60px 40px 48px;
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 32px;
}
.v6-live {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--white);
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 5px 14px 5px 7px;
  color: var(--mid);
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 28px;
}
.v6-live-pip {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--vio);
  display: flex;
  align-items: center;
  justify-content: center;
}
.v6-live-pip svg { width: 10px; height: 10px; fill: #fff; }
.v6-h1 {
  font-family: 'Unbounded', var(--font-display), sans-serif;
  font-weight: 800;
  font-size: clamp(40px, 5.5vw, 66px);
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0 0 22px;
}
.v6-h-vio { color: var(--vio); }
.v6-h-acc { color: var(--cta-accent); }
.v6-h-dim { color: var(--rule); }
.v6-sub {
  margin: 0 0 36px;
  font-size: 16px;
  line-height: 1.75;
  color: var(--mid);
  max-width: 460px;
}
.v6-search {
  display: flex;
  background: var(--white);
  border: 1.5px solid var(--rule);
  border-radius: 14px;
  overflow: hidden;
  max-width: 560px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: border-color .15s, box-shadow .15s;
}
.v6-search:focus-within { border-color: var(--vio); box-shadow: 0 0 0 3px var(--vio-l); }
.v6-search input {
  flex: 1;
  border: none;
  outline: none;
  padding: 13px 18px;
  font-size: 14px;
  color: var(--ink);
  background: transparent;
}
.v6-search select {
  border: none;
  outline: none;
  padding: 13px 14px;
  font-size: 13px;
  font-weight: 600;
  color: var(--mid);
  background: transparent;
}
.v6-sdiv { width: 1px; background: var(--rule); }
.v6-sgo {
  border: none;
  background: var(--vio);
  color: #fff;
  padding: 13px 22px;
  font-size: 13px;
  font-weight: 700;
}

.v6-panel {
  background: var(--white);
  border: 1px solid var(--rule);
  border-radius: 24px;
  padding: 22px;
  box-shadow: 0 4px 24px rgba(0,0,0,.07);
}
.v6-panel-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.v6-panel-t { font-family: 'Unbounded', sans-serif; font-size: 12px; font-weight: 700; }
.v6-panel-s { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mid); }
.v6-mj {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 8px;
  border-radius: 10px;
  margin: 0 -8px;
  transition: background .1s;
}
.v6-mj:hover { background: var(--bg); }
.v6-mj-ico {
  width: 34px;
  height: 34px;
  border-radius: 9px;
  background: var(--bg);
  border: 1px solid var(--rule);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--mid);
}
.v6-mj-b { flex: 1; min-width: 0; }
.v6-mj-t { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v6-mj-m { font-size: 11px; font-weight: 500; color: var(--mid); }
.v6-mj-r { text-align: right; }
.v6-mj-s { font-size: 13px; font-weight: 700; }
.v6-badge {
  display: inline-block;
  margin-top: 2px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 5px;
}
.v6-badge-r { background: var(--grn-l); color: var(--grn); }
.v6-badge-h { background: var(--sky-l); color: var(--sky); }
.v6-badge-o { background: var(--amb-l); color: var(--amber); }
.v6-panel-divider { height: 1px; background: var(--rule); margin: 14px 0; }
.v6-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.v6-stat { background: var(--bg); border-radius: 10px; padding: 11px; text-align: center; }
.v6-stat-n { font-family: 'Unbounded', sans-serif; font-size: 20px; font-weight: 800; line-height: 1; }
.v6-stat-l { margin-top: 3px; font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mid); }

.v6-filters {
  padding: 18px 40px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.v6-chip {
  font-size: 12px;
  font-weight: 700;
  color: var(--mid);
  background: var(--white);
  border: 1px solid var(--rule);
  border-radius: 999px;
  padding: 6px 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,.04);
  transition: all .1s;
}
.v6-chip-on { background: var(--chip-on-bg); color: var(--chip-on-fg); border-color: var(--chip-on-bg); }
.v6-chip:hover { border-color: var(--ink); color: var(--ink); }
.v6-chip-on:hover { background: var(--chip-on-bg); color: var(--chip-on-fg); border-color: var(--chip-on-bg); }

.v6-bento { padding: 4px 40px 80px; }
.v6-bento-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.v6-bento-t { font-family: 'Unbounded', var(--font-display), sans-serif; font-size: 13px; font-weight: 700; }
.v6-bento-c { font-size: 12px; font-weight: 600; color: var(--mid); }
.v6-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 10px; }
.v6-boxes { display: grid; grid-template-columns: repeat(12, 1fr); gap: 10px; }
.v6-list { display: grid; gap: 10px; }
.v6-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--rule);
  border-radius: 14px;
  background: var(--white);
}
.v6-list-main { min-width: 0; }
.v6-list-title {
  font-family: 'Unbounded', var(--font-display), sans-serif;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 6px;
}
.v6-list-meta { font-size: 12px; color: var(--mid); display: flex; gap: 6px; flex-wrap: wrap; }
.v6-list-right { text-align: right; flex-shrink: 0; }
.v6-list-salary {
  font-family: 'Unbounded', var(--font-display), sans-serif;
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.03em;
}
.v6-s3 { grid-column: span 3; }
.v6-s4 { grid-column: span 4; }
.v6-s5 { grid-column: span 5; }
.v6-s7 { grid-column: span 7; }

.v6-card {
  background: var(--white);
  border: 1px solid var(--rule);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,.05);
  transition: transform .18s ease, box-shadow .18s ease;
}
.v6-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.1); }
.v6-cj { padding: 22px; }
.v6-cj-cat {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--mid);
}
.v6-cj-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--vio); }
.v6-cj-t { font-family: 'Unbounded', var(--font-display), sans-serif; font-size: 16px; font-weight: 700; line-height: 1.2; margin-bottom: 8px; }
.v6-cj-m { font-size: 12px; color: var(--mid); margin-bottom: 14px; display: flex; gap: 6px; flex-wrap: wrap; }
.v6-cj-m strong { color: var(--ink); font-weight: 600; }
.v6-cj-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
.v6-cj-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 7px;
  background: var(--bg);
  color: var(--mid);
  border: 1px solid var(--rule);
}
.v6-cj-foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  border-top: 1px solid var(--bg2);
  padding-top: 14px;
}
.v6-cj-sal { font-family: 'Unbounded', var(--font-display), sans-serif; font-size: 18px; font-weight: 800; letter-spacing: -0.04em; }
.v6-cj-r { text-align: right; }
.v6-cj-ago { margin-top: 4px; font-size: 11px; color: var(--rule); font-weight: 600; }

.v6-card-vio { background: var(--vio); border-color: var(--vio-d); }
.v6-card-vio .v6-cj-t, .v6-card-vio .v6-cj-sal { color: #fff; }
.v6-card-vio .v6-cj-cat { color: rgba(255,255,255,0.55); }
.v6-card-vio .v6-cj-dot { background: rgba(255,255,255,0.5); }
.v6-card-vio .v6-cj-m { color: rgba(255,255,255,0.6); }
.v6-card-vio .v6-cj-m strong { color: rgba(255,255,255,0.9); }
.v6-card-vio .v6-cj-tag { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.15); color: #fff; }
.v6-card-vio .v6-cj-foot { border-top-color: rgba(255,255,255,0.15); }
.v6-card-vio .v6-cj-ago { color: rgba(255,255,255,0.35); }
.v6-card-vio .v6-badge-h { background: rgba(255,255,255,0.15); color: #fff; }

.v6-card-stone { background: #2A251F; border-color: #3A342C; }
.v6-card-stone .v6-cj-t, .v6-card-stone .v6-cj-sal { color: var(--white); }
.v6-card-stone .v6-cj-cat { color: rgba(250,248,244,0.45); }
.v6-card-stone .v6-cj-m { color: rgba(250,248,244,0.5); }
.v6-card-stone .v6-cj-m strong { color: rgba(250,248,244,0.85); }
.v6-card-stone .v6-cj-tag { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); color: rgba(250,248,244,0.7); }
.v6-card-stone .v6-cj-foot { border-top-color: rgba(255,255,255,0.08); }
.v6-card-stone .v6-cj-ago { color: rgba(255,255,255,0.2); }

.v6-cstat { padding: 24px; display: flex; flex-direction: column; justify-content: space-between; min-height: 148px; }
.v6-cstat-l { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mid); }
.v6-cstat-n { margin-top: 8px; font-family: 'Unbounded', var(--font-display), sans-serif; font-size: 48px; font-weight: 800; line-height: 1; letter-spacing: -0.05em; }
.v6-cstat-s { font-size: 12px; font-weight: 600; color: var(--mid); }

.v6-card-alert { background: var(--vio-l); border-color: rgba(108,59,255,0.2); padding: 22px; }
.v6-ca-t { margin-bottom: 6px; font-family: 'Unbounded', var(--font-display), sans-serif; font-size: 14px; font-weight: 700; }
.v6-ca-s { margin-bottom: 14px; font-size: 13px; color: var(--mid); line-height: 1.6; }
.v6-ca-row { display: flex; background: var(--white); border: 1px solid var(--rule); border-radius: 10px; overflow: hidden; }
.v6-ca-row input { flex: 1; border: none; outline: none; background: transparent; padding: 10px 14px; font-size: 13px; }
.v6-ca-btn { border: none; background: var(--vio); color: #fff; padding: 10px 16px; font-size: 13px; font-weight: 700; }

.v6-card-cta { background: var(--cta-bg); padding: 26px 28px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.v6-cta-t { color: var(--cta-fg); font-family: 'Unbounded', var(--font-display), sans-serif; font-size: 17px; font-weight: 700; line-height: 1.25; max-width: 240px; }
.v6-cta-t em { font-style: normal; color: var(--cta-accent); }
.v6-cta-btn { border: none; border-radius: 10px; background: var(--cta-accent); color: var(--cta-accent-fg); padding: 12px 22px; font-size: 13px; font-weight: 700; white-space: nowrap; }

.v6-load { padding: 0 40px 80px; display: flex; justify-content: center; }
.v6-load-btn {
  border: 1px solid var(--rule);
  border-radius: 10px;
  background: var(--white);
  color: var(--mid);
  padding: 13px 36px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0,0,0,.05);
  transition: border-color .12s, color .12s, transform .12s;
}
.v6-load-btn:hover { border-color: var(--ink); color: var(--ink); transform: translateY(-1px); }

.v6-footer {
  border-top: 1px solid var(--rule);
  padding: 28px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.v6-f-logo { display: flex; align-items: center; gap: 8px; font-family: 'Unbounded', var(--font-display), sans-serif; font-size: 12px; font-weight: 800; }
.v6-f-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--vio); }
.v6-f-links { display: flex; gap: 20px; flex-wrap: wrap; }
.v6-f-links a { font-size: 12px; font-weight: 600; color: var(--mid); transition: color .1s; }
.v6-f-links a:hover { color: var(--ink); }
.v6-f-copy { font-size: 11px; font-weight: 600; color: var(--rule); }

@media (max-width: 960px) {
  .v6-nav, .v6-hero, .v6-filters, .v6-bento, .v6-load, .v6-footer { padding-left: 20px; padding-right: 20px; }
  .v6-hero { grid-template-columns: 1fr; }
  .v6-panel { display: none; }
  .v6-grid { grid-template-columns: repeat(6, 1fr); }
  .v6-boxes { grid-template-columns: repeat(6, 1fr); }
  .v6-s3, .v6-s4 { grid-column: span 3; }
  .v6-s5, .v6-s7 { grid-column: span 6; }
}
`

function formatSalary(min: number | null, max: number | null, currency: string) {
  const fmt = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)
  if (min && max) return `${currency}${fmt(min)}-${currency}${fmt(max)}`
  if (min) return `From ${currency}${fmt(min)}`
  if (max) return `Up to ${currency}${fmt(max)}`
  return null
}

const REMOTE_CLASS: Record<string, string> = {
  remote: 'v6-badge v6-badge-r',
  hybrid: 'v6-badge v6-badge-h',
  onsite: 'v6-badge v6-badge-o',
}

const TYPE_LABEL: Record<string, string> = {
  'full-time': 'Full-time',
  'part-time': 'Part-time',
  contract: 'Contract',
  freelance: 'Freelance',
  internship: 'Internship',
}

function toCategoryLabel(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function shortMeta(company: string | null, location: string | null) {
  const left = company?.trim() || 'Direct'
  const right = location?.trim() || 'Flexible'
  return `${left} · ${right}`
}

function formatCount(n: number) {
  return new Intl.NumberFormat('en-GB').format(n)
}

function timeAgo(value: unknown) {
  if (!value) return ''
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return ''
  const deltaHours = Math.max(1, Math.floor((Date.now() - date.getTime()) / 3600000))
  if (deltaHours < 24) return `${deltaHours}h ago`
  const days = Math.max(1, Math.floor(deltaHours / 24))
  return `${days}d ago`
}

function shiftHex(hex: string, lightnessDelta: number, saturationDelta = 0) {
  if (!isValidHex(hex)) return hex
  const [h, s, l] = hexToHsl(hex)
  const nextS = Math.max(0, Math.min(100, s + saturationDelta))
  const nextL = Math.max(0, Math.min(100, l + lightnessDelta))
  return hslToHex(h, nextS, nextL)
}

export function PublicBoardHome({ data }: { data: BoardLoaderData }) {
  const { board, jobs: publishedJobs, css, totalOpen, filters, filterOptions } = data
  const boardConfig = resolveJobBoardThemeConfig(board.boardConfig, {
    boardName: board.name,
    tagline: board.introText ?? undefined,
    logoUrl: board.logoUrl ?? undefined,
    headerImageUrl: board.heroImageUrl ?? undefined,
    brandColor: (board.theme as any)?.colorPrimary,
    accentColor: (board.theme as any)?.colorAccent,
    backgroundColor: (board.theme as any)?.colorBackground,
  })

  const jobs = publishedJobs.slice(0, 10)
  const topJobs = publishedJobs.slice(0, 5)
  const featuredJob = jobs[0]
  const jobsLayout = boardConfig.jobsLayout ?? 'bento'

  const basePrimary = isValidHex(boardConfig.brandColor) ? boardConfig.brandColor : '#6C3BFF'
  const baseAccent = isValidHex(boardConfig.accentColor || '')
    ? (boardConfig.accentColor as string)
    : shiftHex(basePrimary, -16, 8)

  const primaryDark = shiftHex(basePrimary, -14, 6)
  const primaryLight = shiftHex(basePrimary, 42, -24)
  const ctaBg = shiftHex(basePrimary, -32, -8)
  const ctaFg = readableFg(ctaBg)
  const accentFg = readableFg(baseAccent)
  const liveCopy = `${formatCount(totalOpen)} live UK tech roles right now`

  const styles: CSSProperties = {
    '--vio': basePrimary,
    '--vio-d': primaryDark,
    '--vio-l': primaryLight,
    '--grn': '#1B7A4E',
    '--grn-l': '#E2F4EB',
    '--sky': '#1760C8',
    '--sky-l': '#E2EEFB',
    '--amber': '#C47B00',
    '--amb-l': '#FEF3DC',
    '--bg': 'var(--color-background)',
    '--bg2': 'color-mix(in srgb, var(--color-background) 86%, var(--color-surface) 14%)',
    '--ink': 'var(--color-text-primary)',
    '--white': 'var(--color-surface)',
    '--rule': 'var(--color-border)',
    '--mid': 'var(--color-text-secondary)',
    '--cta-bg': ctaBg,
    '--cta-fg': ctaFg,
    '--cta-accent': baseAccent,
    '--cta-accent-fg': accentFg,
    '--chip-on-bg': ctaBg,
    '--chip-on-fg': ctaFg,
  }

  return (
    <div className="v6-board" style={styles}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <style dangerouslySetInnerHTML={{ __html: V6_STYLES }} />

      <nav className="v6-nav">
        <div className="v6-logo">
          <svg className="v6-logo-icon" viewBox="0 0 28 28" fill="none" aria-hidden="true">
            <circle cx="14" cy="14" r="3" fill="var(--vio)" />
            <circle cx="14" cy="14" r="7" stroke="var(--vio)" strokeWidth="2" fill="none" strokeDasharray="3 2" />
            <circle cx="14" cy="14" r="12" stroke="var(--rule)" strokeWidth="1.5" fill="none" />
          </svg>
          TECH ROUNDABOUT
        </div>
        <div className="v6-nav-r">
          <Link className="v6-nl" to="/jobs">Browse</Link>
          <a className="v6-nl" href="#roles">Companies</a>
          <a className="v6-nl" href="#roles">Salaries</a>
          <a className="v6-ncta" href={boardConfig.emptyState.ctaUrl || '#'} target="_blank" rel="noreferrer">Post a role ↗</a>
        </div>
      </nav>

      <div className="v6-shell">
        
        <section className="v6-hero">
          <div>
            <div className="v6-live">
              <span className="v6-live-pip"><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3" /></svg></span>
              {liveCopy}
            </div>

            <h1 className="v6-h1">
              Your <span className="v6-h-vio">next role</span><br />
              is <span className="v6-h-acc">right here</span>.<br />
              <span className="v6-h-dim">No middlemen.</span>
            </h1>

            <p className="v6-sub">Every serious tech job in the UK. No agency markup, no recruiter walls. Apply direct - always.</p>

            {boardConfig.showSearch && (
              <Form method="get" className="v6-search">
                <input name="q" defaultValue={filters.q} placeholder="Role, skill or company..." />
                <div className="v6-sdiv" />
                <select name="location" defaultValue={filters.location}>
                  <option value="">Anywhere</option>
                  {filterOptions.locations.map((option) => (
                    <option key={option} value={option.toLowerCase()}>{option}</option>
                  ))}
                </select>
                {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
                <button className="v6-sgo" type="submit">Search →</button>
              </Form>
            )}
          </div>

          <aside className="v6-panel">
            <div className="v6-panel-h">
              <p className="v6-panel-t">Latest roles</p>
              <p className="v6-panel-s">Just added</p>
            </div>
            {topJobs.map((job) => (
              <Link className="v6-mj" key={`top-${job.id}`} to={`/jobs/${job.id}`}>
                <div className="v6-mj-ico">{job.employmentType === 'full-time' ? '🏦' : job.employmentType === 'contract' ? '⚙️' : job.employmentType === 'part-time' ? '📊' : '💼'}</div>
                <div className="v6-mj-b">
                  <div className="v6-mj-t">{job.title}</div>
                  <div className="v6-mj-m">{shortMeta(job.company, job.location)}</div>
                </div>
                <div className="v6-mj-r">
                  <div className="v6-mj-s">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) || 'Salary DOE'}</div>
                  <div className={REMOTE_CLASS[job.remotePolicy] || 'v6-badge v6-badge-h'}>{job.remotePolicy}</div>
                </div>
              </Link>
            ))}

            <div className="v6-panel-divider" />
            <div className="v6-stats">
              <div className="v6-stat"><div className="v6-stat-n">{totalOpen}</div><div className="v6-stat-l">Open</div></div>
              <div className="v6-stat"><div className="v6-stat-n">{filterOptions.locations.length}</div><div className="v6-stat-l">Locations</div></div>
              <div className="v6-stat"><div className="v6-stat-n">{Math.min(48, totalOpen)}</div><div className="v6-stat-l">New today</div></div>
            </div>
          </aside>
        </section>

        <div className="v6-filters">
          <Link className={`v6-chip ${!filters.category ? 'v6-chip-on' : ''}`} to="?">All roles</Link>
          {filterOptions.categories.slice(0, 6).map((option) => {
            const params = new URLSearchParams()
            if (filters.q) params.set('q', filters.q)
            if (filters.location) params.set('location', filters.location)
            params.set('category', option.value)
            const active = filters.category === option.value
            return (
              <Link key={`filter-${option.value}`} className={`v6-chip ${active ? 'v6-chip-on' : ''}`} to={`?${params.toString()}`}>
                {option.label || toCategoryLabel(option.value)}
              </Link>
            )
          })}
          <button className="v6-chip" type="button">Remote only</button>
          <button className="v6-chip" type="button">£100k+</button>
        </div>

        <section className="v6-bento" id="roles">
          <div className="v6-bento-h">
            <h2 className="v6-bento-t">All roles</h2>
            <p className="v6-bento-c">{publishedJobs.length} matched</p>
          </div>

          {jobs.length === 0 ? (
            <div className="v6-card v6-cj">
              <div className="v6-cj-t">{boardConfig.emptyState.title}</div>
              <p className="v6-cj-m">{boardConfig.emptyState.description}</p>
            </div>
          ) : jobsLayout === 'list' ? (
            <div className="v6-list">
              {jobs.slice(0, 8).map((job) => (
                <Link key={`list-${job.id}`} className="v6-list-item" to={`/jobs/${job.id}`}>
                  <div className="v6-list-main">
                    <div className="v6-list-title">{job.title}</div>
                    <div className="v6-list-meta">
                      <strong>{job.company || boardConfig.boardName}</strong>
                      <span>·</span>
                      <span>{job.location || 'Flexible'}</span>
                      <span>·</span>
                      <span>{TYPE_LABEL[job.employmentType] ?? job.employmentType}</span>
                    </div>
                  </div>
                  <div className="v6-list-right">
                    <div className="v6-list-salary">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) || 'Salary DOE'}</div>
                    <span className={REMOTE_CLASS[job.remotePolicy] || 'v6-badge v6-badge-h'}>{job.remotePolicy}</span>
                  </div>
                </Link>
              ))}

              <div className="v6-card v6-card-cta" style={{ marginTop: 6 }}>
                <p className="v6-cta-t">Reach <em>40,000</em> people already following this board.</p>
                <a className="v6-cta-btn" href={boardConfig.emptyState.ctaUrl || '#'} target="_blank" rel="noreferrer">Post a role →</a>
              </div>
            </div>
          ) : jobsLayout === 'boxes' ? (
            <div className="v6-boxes">
              {jobs.slice(0, 6).map((job, idx) => (
                <Link
                  key={`box-${job.id}`}
                  className={`v6-card v6-cj ${idx === 0 ? 'v6-card-vio v6-s5' : idx === 3 ? 'v6-card-stone v6-s5' : 'v6-s4'}`}
                  to={`/jobs/${job.id}`}
                >
                  <div className="v6-cj-cat"><span className="v6-cj-dot" />{TYPE_LABEL[job.employmentType] ?? job.employmentType}</div>
                  <div className="v6-cj-t">{job.title}</div>
                  <div className="v6-cj-m"><strong>{job.company || boardConfig.boardName}</strong><span>·</span>{job.location || 'Flexible'}</div>
                  <div className="v6-cj-tags">
                    <span className="v6-cj-tag">{job.remotePolicy}</span>
                    {job.salaryMin || job.salaryMax ? <span className="v6-cj-tag">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span> : null}
                  </div>
                  <div className="v6-cj-foot">
                    <div className="v6-cj-sal">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) || 'Salary DOE'}</div>
                    <div className="v6-cj-r"><span className={REMOTE_CLASS[job.remotePolicy] || 'v6-badge v6-badge-h'}>{job.remotePolicy}</span></div>
                  </div>
                </Link>
              ))}

              <div className="v6-card v6-card-cta v6-s7">
                <p className="v6-cta-t">Reach <em>40,000</em> people already following this board.</p>
                <a className="v6-cta-btn" href={boardConfig.emptyState.ctaUrl || '#'} target="_blank" rel="noreferrer">Post a role →</a>
              </div>

              <div className="v6-card v6-cstat v6-s3">
                <div className="v6-cstat-l">New today</div>
                <div className="v6-cstat-n">{Math.min(48, publishedJobs.length)}</div>
                <div className="v6-cstat-s">roles added</div>
              </div>
            </div>
          ) : (
            <div className="v6-grid">
              {featuredJob && (
                <Link className="v6-card v6-card-vio v6-cj v6-s5" to={`/jobs/${featuredJob.id}`}>
                  <div className="v6-cj-cat"><span className="v6-cj-dot" />Featured</div>
                  <div className="v6-cj-t">{featuredJob.title}</div>
                  <div className="v6-cj-m"><strong>{featuredJob.company || boardConfig.boardName}</strong><span>·</span>{featuredJob.location || 'Flexible'}</div>
                  <div className="v6-cj-tags">
                    <span className="v6-cj-tag">{TYPE_LABEL[featuredJob.employmentType] ?? featuredJob.employmentType}</span>
                    <span className="v6-cj-tag">{featuredJob.remotePolicy}</span>
                  </div>
                  <div className="v6-cj-foot">
                    <div className="v6-cj-sal">{formatSalary(featuredJob.salaryMin, featuredJob.salaryMax, featuredJob.salaryCurrency) || 'Salary DOE'}</div>
                    <div className="v6-cj-r"><span className="v6-badge v6-badge-h">{featuredJob.remotePolicy}</span><div className="v6-cj-ago">{timeAgo((featuredJob as any).createdAt)}</div></div>
                  </div>
                </Link>
              )}

              <div className="v6-card v6-cstat v6-s3">
                <div className="v6-cstat-l">New today</div>
                <div className="v6-cstat-n">{Math.min(48, publishedJobs.length)}</div>
                <div className="v6-cstat-s">roles added</div>
              </div>

              <div className="v6-card v6-card-alert v6-s4">
                <div className="v6-ca-t">Get job alerts</div>
                <div className="v6-ca-s">Right roles in your inbox the moment they go live.</div>
                <div className="v6-ca-row"><input placeholder="you@email.com" /><button className="v6-ca-btn" type="button">Go →</button></div>
              </div>

              {jobs.slice(1, 3).map((job) => (
                <Link key={job.id} className="v6-card v6-cj v6-s4" to={`/jobs/${job.id}`}>
                  <div className="v6-cj-cat"><span className="v6-cj-dot" />{TYPE_LABEL[job.employmentType] ?? job.employmentType}</div>
                  <div className="v6-cj-t">{job.title}</div>
                  <div className="v6-cj-m"><strong>{job.company || boardConfig.boardName}</strong><span>·</span>{job.location || 'Flexible'}</div>
                  <div className="v6-cj-tags">
                    <span className="v6-cj-tag">{job.remotePolicy}</span>
                    {job.salaryMin || job.salaryMax ? <span className="v6-cj-tag">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span> : null}
                  </div>
                  <div className="v6-cj-foot">
                    <div className="v6-cj-sal">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) || 'Salary DOE'}</div>
                    <div className="v6-cj-r"><span className={REMOTE_CLASS[job.remotePolicy] || 'v6-badge v6-badge-h'}>{job.remotePolicy}</span><div className="v6-cj-ago">{timeAgo((job as any).createdAt)}</div></div>
                  </div>
                </Link>
              ))}

              <div className="v6-card v6-cstat v6-s3">
                <div className="v6-cstat-l">Companies hiring</div>
                <div className="v6-cstat-n" style={{ color: 'var(--vio)' }}>{formatCount(filterOptions.locations.length * 52 || 312)}</div>
                <div className="v6-cstat-s">across the UK</div>
              </div>

              {jobs[3] && (
                <Link className="v6-card v6-card-stone v6-cj v6-s5" to={`/jobs/${jobs[3].id}`}>
                  <div className="v6-cj-cat"><span className="v6-cj-dot" />Engineering</div>
                  <div className="v6-cj-t">{jobs[3].title}</div>
                  <div className="v6-cj-m"><strong>{jobs[3].company || boardConfig.boardName}</strong><span>·</span>{jobs[3].location || 'Flexible'}</div>
                  <div className="v6-cj-tags">
                    <span className="v6-cj-tag">{jobs[3].remotePolicy}</span>
                    {jobs[3].salaryMin || jobs[3].salaryMax ? <span className="v6-cj-tag">{formatSalary(jobs[3].salaryMin, jobs[3].salaryMax, jobs[3].salaryCurrency)}</span> : null}
                  </div>
                  <div className="v6-cj-foot">
                    <div className="v6-cj-sal">{formatSalary(jobs[3].salaryMin, jobs[3].salaryMax, jobs[3].salaryCurrency) || 'Salary DOE'}</div>
                    <div className="v6-cj-r"><span className={REMOTE_CLASS[jobs[3].remotePolicy] || 'v6-badge v6-badge-h'}>{jobs[3].remotePolicy}</span><div className="v6-cj-ago">{timeAgo((jobs[3] as any).createdAt)}</div></div>
                  </div>
                </Link>
              )}

              <div className="v6-card v6-card-cta v6-s7">
                <p className="v6-cta-t">Reach <em>40,000</em> people already following this board.</p>
                <a className="v6-cta-btn" href={boardConfig.emptyState.ctaUrl || '#'} target="_blank" rel="noreferrer">Post a role →</a>
              </div>

              {jobs.slice(4, 7).map((job) => (
                <Link key={`tail-${job.id}`} className="v6-card v6-cj v6-s4" to={`/jobs/${job.id}`}>
                  <div className="v6-cj-cat"><span className="v6-cj-dot" />{TYPE_LABEL[job.employmentType] ?? job.employmentType}</div>
                  <div className="v6-cj-t">{job.title}</div>
                  <div className="v6-cj-m"><strong>{job.company || boardConfig.boardName}</strong><span>·</span>{job.location || 'Flexible'}</div>
                  <div className="v6-cj-tags">
                    <span className="v6-cj-tag">{job.remotePolicy}</span>
                    {job.salaryMin || job.salaryMax ? <span className="v6-cj-tag">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span> : null}
                  </div>
                  <div className="v6-cj-foot">
                    <div className="v6-cj-sal">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) || 'Salary DOE'}</div>
                    <div className="v6-cj-r"><span className={REMOTE_CLASS[job.remotePolicy] || 'v6-badge v6-badge-h'}>{job.remotePolicy}</span><div className="v6-cj-ago">{timeAgo((job as any).createdAt)}</div></div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="v6-load">
          <Link className="v6-load-btn" to="/jobs">Browse all roles →</Link>
        </div>

      </div>

      <footer className="v6-footer">
        <div className="v6-f-logo"><span className="v6-f-dot" />TECH ROUNDABOUT</div>
        <div className="v6-f-links">
          <a href="#roles">Browse</a>
          <a href="#roles">Companies</a>
          <a href="#roles">Salaries</a>
          <a href="#roles">Employers</a>
          <a href="#roles">About</a>
          <a href="#roles">Privacy</a>
        </div>
        <div className="v6-f-copy">© 2025 Tech Roundabout Ltd</div>
      </footer>
    </div>
  )
}
