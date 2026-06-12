import { Form, Link, useNavigate } from 'react-router'
import { useState, type CSSProperties } from 'react'
import { resolveJobBoardThemeConfig } from '@jobuki/types'
import { DEFAULT_THEME } from '@jobuki/types'
import type { BoardLoaderData } from '../routes/marketing/home'
import { hexToHsl, hslToHex, isValidHex, readableFg } from '../lib/color'
import { publicJobPath } from '../lib/public-job-path'
import { getGoogleFontsImport } from '../lib/fonts'

const STYLES_BASE = `

.jp-board, .jp-board * { box-sizing: border-box; }
.jp-board {
  --bg: #F0EBE3;
  --bg2: #E8E1D8;
  --white: #FAF8F4;
  --ink: #16120E;
  --mid: #5E5248;
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
  font-family: var(--font-body), sans-serif;
  font-weight: 400;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

.jp-board a { text-decoration: none; color: inherit; }
.jp-board button, .jp-board input, .jp-board select { font-family: inherit; }
.jp-shell { max-width: 1280px; margin: 0 auto; }

.jp-nav {
  background: color-mix(in srgb, var(--white) 88%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--rule);
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
}
.jp-nav-inner {
  max-width: 1280px;
  margin: 0 auto;
  height: 62px;
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.jp-logo {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display), sans-serif;
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 0.01em;
}
.jp-logo-icon { width: 28px; height: 28px; flex-shrink: 0; }
.jp-nav-r { display: flex; align-items: center; gap: 2px; }
.jp-nl {
  font-size: 13px;
  font-weight: 500;
  color: var(--mid);
  padding: 8px 14px;
  border-radius: 10px;
  transition: background 0.1s, color 0.1s;
}
.jp-nl:hover { background: var(--bg); color: var(--ink); }
.jp-ncta {
  margin-left: 6px;
  border: none;
  border-radius: 8px;
  padding: 7px 14px;
  background: var(--color-primary);
  color: var(--color-primary-fg);
  font-size: 12px;
  font-weight: 700;
  transition: filter 0.15s, transform 0.15s;
  text-decoration: none;
  white-space: nowrap;
}
.jp-ncta-short { display: none; }
.jp-ncta:visited { color: var(--color-primary-fg); text-decoration: none; }
.jp-ncta:hover, .jp-ncta:focus-visible {
  filter: brightness(1.12);
  color: var(--color-primary-fg);
  text-decoration: none;
  transform: translateY(-1px);
}

.jp-hero {
  width: 100%;
}
.jp-hero-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 60px 40px 48px;
  display: grid;
  grid-template-columns: 1fr 420px;
  gap: 32px;
}
.jp-live {
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
.jp-live-pip {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--vio);
  display: flex;
  align-items: center;
  justify-content: center;
}
.jp-live-pip svg { width: 10px; height: 10px; fill: #fff; }
.jp-h1 {
  font-family: 'Unbounded', var(--font-display), sans-serif;
  font-weight: 800;
  font-size: clamp(40px, 5.5vw, 66px);
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0 0 22px;
}
.jp-h-vio { color: var(--vio); }
.jp-h-acc { color: var(--cta-accent); }
.jp-h-dim { color: var(--rule); }
.jp-sub {
  margin: 0 0 20px;
  font-size: 16px;
  line-height: 1.75;
  color: var(--mid);
  max-width: 460px;
}
.jp-hero-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 28px;
}
.jp-hero-tag {
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  border-radius: 999px;
  border: 1px solid var(--rule);
  background: var(--white);
  color: var(--mid);
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: border-color 0.12s, color 0.12s;
}
.jp-hero-tag:hover {
  border-color: var(--vio);
  color: var(--vio);
}
.jp-search {
  display: flex;
  align-items: stretch;
  min-height: 48px;
  background: var(--white);
  border: 1.5px solid var(--rule);
  border-radius: 14px;
  overflow: hidden;
  max-width: 560px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  transition: border-color .15s, box-shadow .15s;
}
.jp-search:focus-within { border-color: var(--vio); box-shadow: 0 0 0 3px var(--vio-l); }
.jp-search input { border: none; outline: none; background: transparent; }
.jp-sgo {
  border: none;
  background: var(--vio);
  color: #fff;
  padding: 13px 22px;
  font-size: 13px;
  font-weight: 700;
}

.jp-panel {
  background: var(--white);
  border: 1px solid var(--rule);
  border-radius: 24px;
  padding: 22px;
  box-shadow: 0 4px 24px rgba(0,0,0,.07);
}
.jp-panel-h {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.jp-panel-t { font-family: var(--font-display), sans-serif; font-size: 12px; font-weight: 700; }
.jp-panel-s { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mid); }
.jp-mj {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 9px 8px;
  border-radius: 10px;
  margin: 0 -8px;
  transition: background .1s;
}
.jp-mj:hover { background: var(--bg); }
.jp-mj-ico {
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
.jp-mj-b { flex: 1; min-width: 0; }
.jp-mj-t { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.jp-mj-m { font-size: 11px; font-weight: 500; color: var(--mid); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 180px; }
.jp-mj-r { text-align: right; }
.jp-mj-s { font-size: 13px; font-weight: 600; }
.jp-badge {
  display: inline-block;
  margin-top: 2px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 2px 7px;
  border-radius: 5px;
}
.jp-badge-r { background: var(--grn-l); color: var(--grn); }
.jp-badge-h { background: var(--sky-l); color: var(--sky); }
.jp-badge-o { background: var(--amb-l); color: var(--amber); }
.jp-panel-divider { height: 1px; background: var(--rule); margin: 14px 0; }
.jp-stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.jp-stat { background: var(--bg); border-radius: 10px; padding: 11px; text-align: center; }
.jp-stat-n { font-family: var(--font-display), sans-serif; font-size: 20px; font-weight: 800; line-height: 1; }
.jp-stat-l { margin-top: 3px; font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--mid); }

.jp-filters {
  padding: 18px 40px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.jp-chip {
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
.jp-chip-on { background: var(--chip-on-bg); color: var(--chip-on-fg); border-color: var(--chip-on-bg); }
.jp-chip:hover { border-color: var(--ink); color: var(--ink); }
.jp-chip-on:hover { background: var(--chip-on-bg); color: var(--chip-on-fg); border-color: var(--chip-on-bg); }

.jp-bento { padding: 40px 40px 80px; }
.jp-bento-h { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.jp-bento-t { font-family: var(--font-display), sans-serif; font-size: 13px; font-weight: 700; }
.jp-bento-c { font-size: 12px; font-weight: 600; color: var(--mid); }
.jp-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 10px; }
.jp-boxes { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
.jp-list { display: grid; gap: 10px; }
.jp-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border: 1px solid var(--rule);
  border-radius: 14px;
  background: var(--white);
}
.jp-list-main { min-width: 0; }
.jp-list-title {
  font-family: var(--font-display), sans-serif;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.2;
  margin-bottom: 6px;
}
.jp-list-meta { font-size: 12px; color: var(--mid); display: flex; gap: 6px; flex-wrap: wrap; }
.jp-list-right { text-align: right; flex-shrink: 0; }
.jp-list-salary { font-size: 13px; font-weight: 600; }
.jp-s3 { grid-column: span 3; }
.jp-s4 { grid-column: span 4; }
.jp-s5 { grid-column: span 5; }
.jp-s7 { grid-column: span 7; }
.jp-s8 { grid-column: span 8; }
.jp-s12 { grid-column: span 12; }

.jp-card {
  background: var(--white);
  border: 1px solid var(--rule);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,.05);
  transition: transform .18s ease, box-shadow .18s ease;
}
.jp-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,.1); }
.jp-cj { padding: 22px; }
.jp-cj-cat {
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
.jp-cj-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--vio); }
.jp-cj-t { font-family: var(--font-display), sans-serif; font-size: 16px; font-weight: 700; line-height: 1.2; margin-bottom: 8px; }
.jp-cj-m { font-size: 12px; color: var(--mid); margin-bottom: 14px; display: flex; gap: 4px; flex-wrap: wrap; align-items: center; }
.jp-cj-m strong { color: var(--ink); font-weight: 600; }
.jp-loc { display: inline-flex; align-items: center; gap: 2px; font-size: 11px; }
.jp-loc svg { flex-shrink: 0; opacity: 0.6; }
.jp-cj-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
.jp-cj-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 7px;
  background: var(--bg);
  color: var(--mid);
  border: 1px solid var(--rule);
}
.jp-cj-foot {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  border-top: 1px solid var(--bg2);
  padding-top: 14px;
}
.jp-cj-sal { font-size: 17px; font-weight: 700; letter-spacing: -0.02em; }
.jp-cj-r { text-align: right; }
.jp-cj-ago { margin-top: 4px; font-size: 11px; color: var(--rule); font-weight: 600; }

.jp-card-vio { background: var(--vio); border-color: var(--vio-d); }
.jp-card-vio .jp-cj-t, .jp-card-vio .jp-cj-sal { color: #fff; }
.jp-card-vio .jp-cj-cat { color: rgba(255,255,255,0.55); }
.jp-card-vio .jp-cj-dot { background: rgba(255,255,255,0.5); }
.jp-card-vio .jp-cj-m { color: rgba(255,255,255,0.6); }
.jp-card-vio .jp-cj-m strong { color: rgba(255,255,255,0.9); }
.jp-card-vio .jp-cj-tag { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.15); color: #fff; }
.jp-card-vio .jp-cj-foot { border-top-color: rgba(255,255,255,0.15); }
.jp-card-vio .jp-cj-ago { color: rgba(255,255,255,0.35); }
.jp-card-vio .jp-badge-h { background: rgba(255,255,255,0.15); color: #fff; }

.jp-card-stone { background: #2A251F; border-color: #3A342C; }
.jp-card-stone .jp-cj-t, .jp-card-stone .jp-cj-sal { color: var(--white); }
.jp-card-stone .jp-cj-cat { color: rgba(250,248,244,0.45); }
.jp-card-stone .jp-cj-m { color: rgba(250,248,244,0.5); }
.jp-card-stone .jp-cj-m strong { color: rgba(250,248,244,0.85); }
.jp-card-stone .jp-cj-tag { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.1); color: rgba(250,248,244,0.7); }
.jp-card-stone .jp-cj-foot { border-top-color: rgba(255,255,255,0.08); }
.jp-card-stone .jp-cj-ago { color: rgba(255,255,255,0.2); }

.jp-cstat { padding: 24px; display: flex; flex-direction: column; justify-content: space-between; min-height: 148px; }
.jp-cstat-l { font-size: 10px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--mid); }
.jp-cstat-n { margin-top: 8px; font-family: var(--font-display), sans-serif; font-size: 48px; font-weight: 800; line-height: 1; letter-spacing: -0.05em; }
.jp-cstat-s { font-size: 12px; font-weight: 600; color: var(--mid); }

.jp-card-alert { background: var(--vio-l); border-color: rgba(108,59,255,0.2); padding: 22px; }
.jp-ca-t { margin-bottom: 6px; font-family: var(--font-display), sans-serif; font-size: 14px; font-weight: 700; }
.jp-ca-s { margin-bottom: 14px; font-size: 13px; color: var(--mid); line-height: 1.6; }
.jp-ca-row { display: flex; background: var(--white); border: 1px solid var(--rule); border-radius: 10px; overflow: hidden; }
.jp-ca-row input { flex: 1; border: none; outline: none; background: transparent; padding: 10px 14px; font-size: 13px; }
.jp-ca-btn { border: none; background: var(--vio); color: #fff; padding: 10px 16px; font-size: 13px; font-weight: 700; }

.jp-card-cta { background: var(--cta-bg); padding: 26px 28px; display: flex; align-items: center; justify-content: space-between; gap: 20px; }
.jp-cta-t { color: var(--cta-fg); font-family: var(--font-display), sans-serif; font-size: 17px; font-weight: 700; line-height: 1.25; max-width: 240px; }
.jp-cta-btn { border: none; border-radius: 10px; background: var(--cta-fg); color: var(--cta-bg); padding: 12px 22px; font-size: 13px; font-weight: 700; white-space: nowrap; }

.jp-load { padding: 0 40px 80px; display: flex; justify-content: center; }
.jp-load-btn {
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
.jp-load-btn:hover { border-color: var(--ink); color: var(--ink); transform: translateY(-1px); }

.jp-footer {
  border-top: 1px solid var(--rule);
  padding: 28px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.jp-f-logo { display: flex; align-items: center; gap: 8px; font-family: 'Unbounded', var(--font-display), sans-serif; font-size: 12px; font-weight: 800; }
.jp-f-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--vio); }
.jp-f-links { display: flex; gap: 20px; flex-wrap: wrap; }
.jp-f-links a { font-size: 12px; font-weight: 600; color: var(--mid); transition: color .1s; }
.jp-f-links a:hover { color: var(--ink); }
.jp-f-copy { font-size: 11px; font-weight: 600; color: var(--mid); }

@media (max-width: 960px) {
  .jp-nav-inner, .jp-hero-inner, .jp-filters, .jp-bento, .jp-load, .jp-footer { padding-left: 20px; padding-right: 20px; }
  .jp-hero-inner { grid-template-columns: 1fr; }
  .jp-panel { display: none; }
  .jp-grid { grid-template-columns: repeat(6, 1fr); }
  .jp-boxes { grid-template-columns: repeat(1, 1fr); }
  .jp-s3, .jp-s4, .jp-s5, .jp-s7, .jp-s8, .jp-s12 { grid-column: span 6; }
  .jp-nl { display: none; }
  .jp-ncta-full { display: none; }
  .jp-ncta-short { display: inline; }
  .jp-ncta { padding: 7px 12px; font-size: 11px; }
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
  remote: 'jp-badge jp-badge-r',
  hybrid: 'jp-badge jp-badge-h',
  onsite: 'jp-badge jp-badge-o',
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

function shortLocation(location: string | null): string {
  const loc = location?.trim() || 'Flexible'
  // Take just the first city/word before comma, slash, or "Worldwide"
  return loc.split(/[/,]/)[0].trim().replace(/^worldwide$/i, 'Remote').slice(0, 20)
}

function shortMeta(company: string | null, location: string | null) {
  const left = company?.trim() || 'Direct'
  const right = shortLocation(location)
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
  const { board, jobs: publishedJobs, css, totalOpen, totalCompanies, filters, filterOptions } = data
  const navigate = useNavigate()
  const [searchQ, setSearchQ] = useState(filters.q ?? '')
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

  const liveCopy = `${formatCount(totalOpen)} live UK tech roles right now`

  const basePrimary = isValidHex(boardConfig.brandColor) ? boardConfig.brandColor : '#6C3BFF'
  const baseAccent = isValidHex(boardConfig.accentColor || '') ? boardConfig.accentColor as string : '#F97316'
  const onPrimary = readableFg(basePrimary)
  // A highlight colour that's always readable over the primary brand colour

  const styles: CSSProperties = {
    '--vio':        'var(--color-primary)',
    '--vio-d':      'var(--color-primary)',
    '--vio-l':      'color-mix(in srgb, var(--color-primary) 15%, var(--color-surface))',
    '--grn':        '#1B7A4E',
    '--grn-l':      '#E2F4EB',
    '--sky':        '#1760C8',
    '--sky-l':      '#E2EEFB',
    '--amber':      '#C47B00',
    '--amb-l':      '#FEF3DC',
    '--bg':         'var(--color-background)',
    '--bg2':        'color-mix(in srgb, var(--color-background) 86%, var(--color-surface) 14%)',
    '--ink':        'var(--color-text-primary)',
    '--white':      'var(--color-surface)',
    '--rule':       'var(--color-border)',
    '--mid':        'var(--color-text-secondary)',
    '--cta-bg':        'var(--color-primary)',
    '--cta-fg':        'var(--color-primary-fg)',
    '--cta-accent':    'var(--color-accent)',
    '--cta-accent-fg': 'var(--color-accent-fg)',
    '--chip-on-bg':    'var(--color-primary)',
    '--chip-on-fg':    'var(--color-primary-fg)',
  }

  const resolvedTheme = { ...DEFAULT_THEME, ...board.theme }
  const fontImport = getGoogleFontsImport(resolvedTheme.fontDisplay, resolvedTheme.fontBody)
  const v6Styles = fontImport + '\n' + STYLES_BASE

  return (
    <div className="jp-board" style={styles}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <style dangerouslySetInnerHTML={{ __html: v6Styles }} />

      <section
          className="jp-hero"
          style={boardConfig.headerImageUrl ? {
            backgroundImage: `url(${boardConfig.headerImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          } : undefined}
        >
          <div className="jp-hero-inner">
          {boardConfig.headerImageUrl && (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.3) 100%)', pointerEvents: 'none' }} />
          )}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div className="jp-live">
              <span className="jp-live-pip"><svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="3" /></svg></span>
              {liveCopy}
            </div>

            {boardConfig.heroHeadline ? (
              <h1
                className="jp-h1"
                dangerouslySetInnerHTML={{ __html: boardConfig.heroHeadline }}
              />
            ) : (
              <h1 className="jp-h1">
                Your <span className="jp-h-vio">next role</span><br />
                is <span className="jp-h-acc">right here</span>.
              </h1>
            )}

            <p className="jp-sub" style={boardConfig.taglineColor ? { color: boardConfig.taglineColor } : undefined}>{boardConfig.tagline || 'Every serious tech job in the UK. No agency markup, no recruiter walls. Apply direct - always.'}</p>

            {boardConfig.showSearch && (
              <Form method="get" className="jp-search">
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <input
                    name="q"
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Role, skill or company..."
                    style={{ flex: 1, border: 'none', outline: 'none', padding: '13px 18px', fontSize: 14, color: 'var(--ink)', background: 'transparent', paddingRight: searchQ ? 36 : 18 }}
                  />
                  {searchQ && (
                    <button
                      type="button"
                      aria-label="Clear search"
                      onClick={() => {
                        setSearchQ('')
                        const params = new URLSearchParams()
                        if (filters.location) params.set('location', filters.location)
                        if (filters.category) params.set('category', filters.category)
                        navigate(`?${params.toString()}`)
                      }}
                      style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mid)', padding: 4, lineHeight: 1, fontSize: 16 }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Location — pin icon visible, select invisible but clickable */}
                <div style={{ position: 'relative', width: 44, flexShrink: 0, borderLeft: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width="16" height="16" style={{ pointerEvents: 'none', color: filters.location ? 'var(--vio)' : 'var(--mid)' }}>
                    <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.386 1.445-.966 2.274-1.765C14.97 15.232 17 12.553 17 9A7 7 0 103 9c0 3.552 2.03 6.232 3.354 7.585.83.799 1.654 1.379 2.274 1.765.311.193.57.337.757.433a5.74 5.74 0 00.281.14l.018.008.006.003zM10 11.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" />
                  </svg>
                  <select
                    name="location"
                    defaultValue={filters.location}
                    aria-label="Filter by location"
                    style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer', fontSize: 16, appearance: 'none', WebkitAppearance: 'none' } as React.CSSProperties}
                  >
                    <option value="">Anywhere</option>
                    {filterOptions.locations.map((option) => (
                      <option key={option} value={option.toLowerCase()}>{option}</option>
                    ))}
                  </select>
                </div>

                {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
                <button className="jp-sgo" type="submit">Search →</button>
              </Form>
            )}
          </div>

          <aside className="jp-panel" style={{ position: 'relative', zIndex: 1 }}>
            <div className="jp-panel-h">
              <p className="jp-panel-t">Latest roles</p>
              <p className="jp-panel-s">Just added</p>
            </div>
            {topJobs.map((job) => (
              <Link className="jp-mj" key={`top-${job.id}`} to={publicJobPath(job)}>
                <div className="jp-mj-ico">{job.employmentType === 'full-time' ? '🏦' : job.employmentType === 'contract' ? '⚙️' : job.employmentType === 'part-time' ? '📊' : '💼'}</div>
                <div className="jp-mj-b">
                  <div className="jp-mj-t">{job.title}</div>
                  <div className="jp-mj-m">{shortMeta(job.company, job.location)}</div>
                </div>
                <div className="jp-mj-r">
                  <div className="jp-mj-s">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) || 'Salary DOE'}</div>
                  <div className={REMOTE_CLASS[job.remotePolicy] || 'jp-badge jp-badge-h'}>{job.remotePolicy}</div>
                </div>
              </Link>
            ))}

            <div className="jp-panel-divider" />
            <div className="jp-stats">
              <div className="jp-stat"><div className="jp-stat-n">{totalOpen}</div><div className="jp-stat-l">Open</div></div>
              <div className="jp-stat"><div className="jp-stat-n">{filterOptions.locations.length}</div><div className="jp-stat-l">Locations</div></div>
              <div className="jp-stat"><div className="jp-stat-n">{totalCompanies}</div><div className="jp-stat-l">Companies</div></div>
            </div>
          </aside>
          </div>
      </section>

      <main className="jp-shell">

        <section className="jp-bento" id="roles">
          {jobs.length === 0 ? (
            <div className="jp-card jp-cj">
              <div className="jp-cj-t">{boardConfig.emptyState.title}</div>
              <p className="jp-cj-m">{boardConfig.emptyState.description}</p>
            </div>
          ) : jobsLayout === 'list' ? (
            <div className="jp-list">
              {jobs.slice(0, 8).map((job) => (
                <Link key={`list-${job.id}`} className="jp-list-item" to={publicJobPath(job)}>
                  <div className="jp-list-main">
                    <div className="jp-list-title">{job.title}</div>
                    <div className="jp-list-meta">
                      <strong>{job.company || boardConfig.boardName}</strong>
                      <span>·</span>
                      <span className="jp-loc"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>{shortLocation(job.location)}</span>
                      <span>·</span>
                      <span>{TYPE_LABEL[job.employmentType] ?? job.employmentType}</span>
                    </div>
                  </div>
                  <div className="jp-list-right">
                    <div className="jp-list-salary">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) || 'Salary DOE'}</div>
                    <span className={REMOTE_CLASS[job.remotePolicy] || 'jp-badge jp-badge-h'}>{job.remotePolicy}</span>
                  </div>
                </Link>
              ))}

              <div className="jp-card jp-card-cta" style={{ marginTop: 6 }}>
                <p className="jp-cta-t">Post a role and reach everyone following this board.</p>
                <a className="jp-cta-btn" href={boardConfig.emptyState.ctaUrl || '#'} target="_blank" rel="noreferrer">Post a role →</a>
              </div>
            </div>
          ) : jobsLayout === 'boxes' ? (
            <div className="jp-boxes">
              {jobs.slice(0, 6).map((job, idx) => (
                <Link
                  key={`box-${job.id}`}
                  className={`jp-card jp-cj ${idx === 0 ? 'jp-card-vio' : idx === 3 ? 'jp-card-stone' : ''}`}
                  to={publicJobPath(job)}
                >
                  <div className="jp-cj-cat"><span className="jp-cj-dot" />{TYPE_LABEL[job.employmentType] ?? job.employmentType}</div>
                  <div className="jp-cj-t">{job.title}</div>
                  <div className="jp-cj-m"><strong>{job.company || boardConfig.boardName}</strong><span>·</span><span className="jp-loc"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>{shortLocation(job.location)}</span></div>
                  <div className="jp-cj-tags">
                    <span className="jp-cj-tag">{job.remotePolicy}</span>
                    {job.salaryMin || job.salaryMax ? <span className="jp-cj-tag">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span> : null}
                  </div>
                  <div className="jp-cj-foot">
                    <div className="jp-cj-sal">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) || 'Salary DOE'}</div>
                    <div className="jp-cj-r"><span className={REMOTE_CLASS[job.remotePolicy] || 'jp-badge jp-badge-h'}>{job.remotePolicy}</span></div>
                  </div>
                </Link>
              ))}

              <div className="jp-card jp-card-cta">
                <p className="jp-cta-t">Post a role and reach everyone following this board.</p>
                <a className="jp-cta-btn" href={boardConfig.emptyState.ctaUrl || '#'} target="_blank" rel="noreferrer">Post a role →</a>
              </div>

              <div className="jp-card jp-cstat">
                <div className="jp-cstat-l">Companies</div>
                <div className="jp-cstat-n">{totalCompanies}</div>
                <div className="jp-cstat-s">hiring now</div>
              </div>
            </div>
          ) : (
            <div className="jp-grid">
              {featuredJob && (
                <Link className="jp-card jp-card-vio jp-cj jp-s8" to={publicJobPath(featuredJob)}>
                  <div className="jp-cj-cat"><span className="jp-cj-dot" />Featured</div>
                  <div className="jp-cj-t">{featuredJob.title}</div>
                  <div className="jp-cj-m"><strong>{featuredJob.company || boardConfig.boardName}</strong><span>·</span>{featuredJob.location || 'Flexible'}</div>
                  <div className="jp-cj-tags">
                    <span className="jp-cj-tag">{TYPE_LABEL[featuredJob.employmentType] ?? featuredJob.employmentType}</span>
                    <span className="jp-cj-tag">{featuredJob.remotePolicy}</span>
                  </div>
                  <div className="jp-cj-foot">
                    <div className="jp-cj-sal">{formatSalary(featuredJob.salaryMin, featuredJob.salaryMax, featuredJob.salaryCurrency) || 'Salary DOE'}</div>
                    <div className="jp-cj-r"><span className="jp-badge jp-badge-h">{featuredJob.remotePolicy}</span><div className="jp-cj-ago">{timeAgo((featuredJob as any).createdAt)}</div></div>
                  </div>
                </Link>
              )}

              <div className="jp-card jp-cstat jp-s4">
                <div className="jp-cstat-l">Companies</div>
                <div className="jp-cstat-n">{totalCompanies}</div>
                <div className="jp-cstat-s">hiring now</div>
              </div>

              <div className="jp-card jp-card-alert jp-s4">
                <div className="jp-ca-t">Get job alerts</div>
                <div className="jp-ca-s">Right roles in your inbox the moment they go live.</div>
                <div className="jp-ca-row"><input placeholder="you@email.com" /><button className="jp-ca-btn" type="button">Go →</button></div>
              </div>

              {jobs.slice(1, 3).map((job) => (
                <Link key={job.id} className="jp-card jp-cj jp-s4" to={publicJobPath(job)}>
                  <div className="jp-cj-cat"><span className="jp-cj-dot" />{TYPE_LABEL[job.employmentType] ?? job.employmentType}</div>
                  <div className="jp-cj-t">{job.title}</div>
                  <div className="jp-cj-m"><strong>{job.company || boardConfig.boardName}</strong><span>·</span><span className="jp-loc"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>{shortLocation(job.location)}</span></div>
                  <div className="jp-cj-tags">
                    <span className="jp-cj-tag">{job.remotePolicy}</span>
                    {job.salaryMin || job.salaryMax ? <span className="jp-cj-tag">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span> : null}
                  </div>
                  <div className="jp-cj-foot">
                    <div className="jp-cj-sal">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) || 'Salary DOE'}</div>
                    <div className="jp-cj-r"><span className={REMOTE_CLASS[job.remotePolicy] || 'jp-badge jp-badge-h'}>{job.remotePolicy}</span><div className="jp-cj-ago">{timeAgo((job as any).createdAt)}</div></div>
                  </div>
                </Link>
              ))}

              {jobs[3] && (
                <Link className="jp-card jp-card-stone jp-cj jp-s8" to={publicJobPath(jobs[3])}>
                  <div className="jp-cj-cat"><span className="jp-cj-dot" />{TYPE_LABEL[jobs[3].employmentType] ?? jobs[3].employmentType}</div>
                  <div className="jp-cj-t">{jobs[3].title}</div>
                  <div className="jp-cj-m"><strong>{jobs[3].company || boardConfig.boardName}</strong><span>·</span>{jobs[3].location || 'Flexible'}</div>
                  <div className="jp-cj-tags">
                    <span className="jp-cj-tag">{jobs[3].remotePolicy}</span>
                    {jobs[3].salaryMin || jobs[3].salaryMax ? <span className="jp-cj-tag">{formatSalary(jobs[3].salaryMin, jobs[3].salaryMax, jobs[3].salaryCurrency)}</span> : null}
                  </div>
                  <div className="jp-cj-foot">
                    <div className="jp-cj-sal">{formatSalary(jobs[3].salaryMin, jobs[3].salaryMax, jobs[3].salaryCurrency) || 'Salary DOE'}</div>
                    <div className="jp-cj-r"><span className={REMOTE_CLASS[jobs[3].remotePolicy] || 'jp-badge jp-badge-h'}>{jobs[3].remotePolicy}</span><div className="jp-cj-ago">{timeAgo((jobs[3] as any).createdAt)}</div></div>
                  </div>
                </Link>
              )}

              <div className="jp-card jp-cstat jp-s4">
                <div className="jp-cstat-l">Companies</div>
                <div className="jp-cstat-n" style={{ color: 'var(--vio)' }}>{formatCount(totalCompanies)}</div>
                <div className="jp-cstat-s">hiring now</div>
              </div>

              <div className="jp-card jp-card-cta jp-s12">
                <p className="jp-cta-t">Post a role and reach everyone following this board.</p>
                <a className="jp-cta-btn" href={boardConfig.emptyState.ctaUrl || '#'} target="_blank" rel="noreferrer">Post a role →</a>
              </div>

              {jobs.slice(4, 7).map((job) => (
                <Link key={`tail-${job.id}`} className="jp-card jp-cj jp-s4" to={publicJobPath(job)}>
                  <div className="jp-cj-cat"><span className="jp-cj-dot" />{TYPE_LABEL[job.employmentType] ?? job.employmentType}</div>
                  <div className="jp-cj-t">{job.title}</div>
                  <div className="jp-cj-m"><strong>{job.company || boardConfig.boardName}</strong><span>·</span><span className="jp-loc"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>{shortLocation(job.location)}</span></div>
                  <div className="jp-cj-tags">
                    <span className="jp-cj-tag">{job.remotePolicy}</span>
                    {job.salaryMin || job.salaryMax ? <span className="jp-cj-tag">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)}</span> : null}
                  </div>
                  <div className="jp-cj-foot">
                    <div className="jp-cj-sal">{formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency) || 'Salary DOE'}</div>
                    <div className="jp-cj-r"><span className={REMOTE_CLASS[job.remotePolicy] || 'jp-badge jp-badge-h'}>{job.remotePolicy}</span><div className="jp-cj-ago">{timeAgo((job as any).createdAt)}</div></div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="jp-load">
          <Link className="jp-load-btn" to="/jobs">Browse all roles →</Link>
        </div>

      </main>

    </div>
  )
}
