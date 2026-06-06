'use client'
import { useState } from 'react'
import Nav from '../components/Nav'
import SearchBar from '../components/SearchBar'
import { JOBS } from '../data/jobs'

const FILTERS = ['All', 'Engineering', 'Product', 'Design', 'Data & ML', 'DevOps', 'Security']
const LOCATIONS = ['Anywhere', 'London', 'Manchester', 'Bristol', 'Remote only']
const SALARIES = ['Any salary', '£50k+', '£75k+', '£100k+', '£130k+']
const LEVELS = ['All levels', 'Junior', 'Mid', 'Senior', 'Lead / Staff', 'Head / Director']

const modeClass = {
  Remote:   'badge badge-remote',
  Hybrid:   'badge badge-hybrid',
  'On-site':'badge badge-onsite',
} as const

export default function SearchResults() {
  const [activeFilter, setActiveFilter] = useState('All')
  const [activeSort, setActiveSort]     = useState('Most recent')
  const [savedIds, setSavedIds]         = useState<Set<string>>(new Set())

  function toggleSave(id: string) {
    setSavedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <>
      <Nav />

      {/* ── SEARCH HEADER ── */}
      <div className="bg-surface border-b-[length:var(--border-width)] border-text">
        <div className="max-w-[1280px] mx-auto px-gutter py-8">

          {/* breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-semibold text-muted mb-5">
            <a href="/" className="hover:text-text transition-colors">Home</a>
            <span className="text-faint">›</span>
            <span className="text-text">Search results</span>
          </div>

          <div className="flex items-end justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-[clamp(24px,3vw,36px)] tracking-[-0.03em] leading-tight mb-1">
                2,847 <span className="text-accent">tech roles</span> in the UK
              </h1>
              <p className="text-sm text-muted font-medium">Showing all disciplines · Anywhere · All levels</p>
            </div>
            <div className="shrink-0">
              <SearchBar />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-gutter py-6 flex gap-7 items-start">

        {/* ── SIDEBAR FILTERS ── */}
        <aside className="w-[220px] shrink-0 sticky top-[78px]">

          <div className="card p-5 flex flex-col gap-6">

            {/* Discipline */}
            <div>
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-muted mb-3">Discipline</div>
              <div className="flex flex-col gap-0.5">
                {FILTERS.map(f => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`text-left px-3 py-[7px] rounded-[length:var(--radius-md)] text-sm font-semibold transition-colors
                      ${activeFilter === f
                        ? 'bg-accent text-white'
                        : 'text-muted hover:bg-bg hover:text-text'
                      }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1.5px] bg-surface-alt" />

            {/* Location */}
            <div>
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-muted mb-3">Location</div>
              <div className="flex flex-col gap-0.5">
                {LOCATIONS.map(l => (
                  <button key={l} className="text-left px-3 py-[7px] rounded-[length:var(--radius-md)] text-sm font-semibold text-muted hover:bg-bg hover:text-text transition-colors">
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1.5px] bg-surface-alt" />

            {/* Salary */}
            <div>
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-muted mb-3">Salary</div>
              <div className="flex flex-col gap-0.5">
                {SALARIES.map(s => (
                  <button key={s} className="text-left px-3 py-[7px] rounded-[length:var(--radius-md)] text-sm font-semibold text-muted hover:bg-bg hover:text-text transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1.5px] bg-surface-alt" />

            {/* Level */}
            <div>
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-muted mb-3">Level</div>
              <div className="flex flex-col gap-0.5">
                {LEVELS.map(l => (
                  <button key={l} className="text-left px-3 py-[7px] rounded-[length:var(--radius-md)] text-sm font-semibold text-muted hover:bg-bg hover:text-text transition-colors">
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-[1.5px] bg-surface-alt" />

            {/* Work type toggles */}
            <div>
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-muted mb-3">Work type</div>
              <div className="flex flex-col gap-2">
                {['Remote', 'Hybrid', 'On-site'].map(t => (
                  <label key={t} className="flex items-center gap-2.5 cursor-pointer group">
                    <div className="w-4 h-4 rounded-sm border-[1.5px] border-border group-hover:border-text transition-colors bg-surface flex items-center justify-center shrink-0" />
                    <span className="text-sm font-semibold text-muted group-hover:text-text transition-colors">{t}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Visa sponsorship */}
            <div>
              <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-muted mb-3">Other</div>
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <div className="w-4 h-4 rounded-sm border-[1.5px] border-border group-hover:border-text transition-colors bg-surface shrink-0" />
                <span className="text-sm font-semibold text-muted group-hover:text-text transition-colors">Visa sponsorship</span>
              </label>
            </div>

          </div>

          {/* Alert card */}
          <div className="alert-card mt-3">
            <div className="font-display font-bold text-[12px] tracking-wide mb-1.5">SAVE THIS SEARCH</div>
            <p className="text-xs text-muted leading-relaxed mb-3">Get new matches by email as they go live.</p>
            <div className="alert-row">
              <input className="alert-input" type="email" placeholder="you@email.com" />
              <button className="alert-go text-xs">Go</button>
            </div>
          </div>

        </aside>

        {/* ── RESULTS ── */}
        <div className="flex-1 min-w-0">

          {/* sort / count bar */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-muted">
              <strong className="text-text">{JOBS.length}</strong> roles shown
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted uppercase tracking-wider">Sort:</span>
              {['Most recent', 'Salary ↓', 'Best match'].map(s => (
                <button
                  key={s}
                  onClick={() => setActiveSort(s)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-[length:var(--radius-md)] transition-colors
                    ${activeSort === s ? 'bg-text text-surface' : 'text-muted hover:text-text'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* job rows */}
          <div className="flex flex-col gap-2.5">
            {JOBS.map((job, i) => (
              <a
                key={job.id}
                href={`/jobs/${job.id}`}
                className="card block p-0 overflow-hidden group no-underline"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <div className="flex items-stretch">

                  {/* accent bar */}
                  <div className="w-1 shrink-0 bg-border group-hover:bg-accent transition-colors duration-150" />

                  {/* main content */}
                  <div className="flex-1 min-w-0 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">

                        {/* top row */}
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="font-display font-bold text-[16px] leading-tight tracking-[-0.02em] text-text group-hover:text-accent transition-colors">
                            {job.title}
                          </span>
                          {i === 0 && (
                            <span className="badge bg-accent text-white">Featured</span>
                          )}
                          {job.ago.includes('h') && (
                            <span className="badge bg-accent-100 text-accent-600">New</span>
                          )}
                        </div>

                        {/* company / location */}
                        <div className="flex items-center gap-2 text-sm text-muted font-medium flex-wrap mb-3">
                          <strong className="text-text font-semibold">{job.company}</strong>
                          <span className="text-faint">·</span>
                          <span>{job.location}</span>
                          <span className="text-faint">·</span>
                          <span>{job.sector}</span>
                        </div>

                        {/* skills */}
                        <div className="flex gap-1.5 flex-wrap">
                          {job.skills.slice(0, 4).map(s => (
                            <span key={s} className="jc-tag">{s}</span>
                          ))}
                          {job.skills.length > 4 && (
                            <span className="jc-tag text-faint">+{job.skills.length - 4}</span>
                          )}
                        </div>
                      </div>

                      {/* right col */}
                      <div className="text-right shrink-0 flex flex-col items-end gap-2">
                        <div className="font-display font-extrabold text-[18px] leading-none tracking-[-0.04em]">
                          {job.salary}
                        </div>
                        <span className={modeClass[job.mode]}>{job.mode}</span>
                        <div className="text-[11px] text-faint font-semibold">{job.ago}</div>
                      </div>
                    </div>
                  </div>

                  {/* save button */}
                  <button
                    onClick={e => { e.preventDefault(); toggleSave(job.id) }}
                    className={`w-12 flex items-center justify-center border-l border-border shrink-0 transition-colors
                      ${savedIds.has(job.id) ? 'bg-accent-100' : 'hover:bg-bg'}`}
                    aria-label="Save job"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"
                      className={savedIds.has(job.id) ? 'text-accent' : 'text-faint'}>
                      <path d="M3 2h10a1 1 0 011 1v10.5l-6-3-6 3V3a1 1 0 011-1z"
                        stroke="currentColor" strokeWidth="1.5"
                        fill={savedIds.has(job.id) ? 'currentColor' : 'none'} />
                    </svg>
                  </button>

                </div>
              </a>
            ))}
          </div>

          {/* pagination */}
          <div className="flex items-center justify-center gap-2 mt-8 pb-16">
            <button className="load-more">Load 25 more →</button>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="footer-root">
        <div className="footer-logo">
          <div className="w-2 h-2 rounded-full bg-accent" />
          TECH ROUNDABOUT
        </div>
        <div className="flex gap-5 flex-wrap">
          {['Browse','Companies','Salaries','Employers','About','Privacy'].map(l => (
            <a key={l} href="#" className="footer-link">{l}</a>
          ))}
        </div>
        <div className="text-xs text-faint font-semibold">© 2025 Tech Roundabout Ltd</div>
      </footer>
    </>
  )
}
