import Nav from '../../components/Nav'
import { JOBS, getJob, getSimilar } from '../../data/jobs'
import JobCard from '../../components/JobCard'

const modeClass = {
  Remote:   'badge badge-remote',
  Hybrid:   'badge badge-hybrid',
  'On-site':'badge badge-onsite',
} as const

// Required for Next.js static generation with dynamic routes
export function generateStaticParams() {
  return JOBS.map(j => ({ id: j.id }))
}

export default function JobDetail({ params }: { params: { id: string } }) {
  const job = getJob(params.id) ?? JOBS[0]
  const similar = getSimilar(job.similar_ids)

  const metaItems = [
    { label: 'Salary',    value: job.salary },
    { label: 'Level',     value: job.level },
    { label: 'Type',      value: job.type },
    { label: 'Posted',    value: job.posted },
    { label: 'Closes',    value: job.closes },
    { label: 'Location',  value: job.remote_detail },
    ...(job.equity ? [{ label: 'Equity', value: job.equity }] : []),
    { label: 'Visa sponsorship', value: job.visa ? 'Yes' : 'No' },
  ]

  return (
    <>
      <Nav />

      {/* ── BREADCRUMB ── */}
      <div className="max-w-[1280px] mx-auto px-gutter pt-5 pb-0">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted">
          <a href="/" className="hover:text-text transition-colors">Home</a>
          <span className="text-faint">›</span>
          <a href="/jobs" className="hover:text-text transition-colors">Jobs</a>
          <span className="text-faint">›</span>
          <span className="text-text truncate max-w-[300px]">{job.title}</span>
        </div>
      </div>

      {/* ── HERO HEADER ── */}
      <div className="max-w-[1280px] mx-auto px-gutter pt-7 pb-8">
        <div className="flex items-start justify-between gap-8 flex-wrap">

          <div className="flex-1 min-w-0">
            {/* sector badge */}
            <div className="flex items-center gap-2 mb-3">
              <div className="jc-cat !mb-0">
                <div className="jc-dot" />
                {job.sector}
              </div>
              <span className={modeClass[job.mode]}>{job.mode}</span>
              {job.visa && (
                <span className="badge bg-primary-100 text-muted">Visa OK</span>
              )}
            </div>

            {/* title */}
            <h1 className="font-display font-bold text-[clamp(28px,4vw,44px)] tracking-[-0.035em] leading-[1.05] mb-3">
              {job.title}
            </h1>

            {/* company + location */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-lg font-bold">{job.company}</span>
              <span className="text-faint">·</span>
              <span className="text-base text-muted font-medium">{job.location}</span>
              <span className="text-faint">·</span>
              <span className="text-sm text-faint font-medium">Posted {job.posted}</span>
            </div>
          </div>

          {/* apply CTA block */}
          <div className="card p-6 flex flex-col gap-4 min-w-[260px] shrink-0">
            <div className="font-display font-extrabold text-[28px] tracking-[-0.05em] leading-none">
              {job.salary}
            </div>
            {job.equity && (
              <div className="text-sm text-muted font-medium">+ {job.equity} equity</div>
            )}
            <button className="w-full bg-accent text-white font-bold text-sm py-3.5
              rounded-[length:var(--radius-md)] border-[length:var(--border-width)] border-accent-700
              shadow-[var(--shadow-md)] transition-all duration-[120ms]
              hover:bg-accent-600 hover:-translate-x-px hover:-translate-y-px hover:shadow-[var(--shadow-lg)]">
              Apply now →
            </button>
            <button className="w-full bg-surface text-text font-bold text-sm py-3
              rounded-[length:var(--radius-md)] border-[length:var(--border-width)] border-border
              shadow-[var(--shadow-sm)] transition-all duration-[120ms]
              hover:-translate-x-px hover:-translate-y-px hover:shadow-[var(--shadow-md)]">
              Save role
            </button>
            <div className="text-[11px] text-faint font-medium text-center">
              Closes {job.closes} · Direct application
            </div>
          </div>

        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-[1280px] mx-auto px-gutter pb-20 flex gap-7 items-start">

        {/* left col — content */}
        <div className="flex-1 min-w-0 flex flex-col gap-5">

          {/* skills strip */}
          <div className="card p-5">
            <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-muted mb-3">Skills & technologies</div>
            <div className="flex gap-2 flex-wrap">
              {job.skills.map(s => (
                <span key={s} className="jc-tag text-sm px-3 py-1.5">{s}</span>
              ))}
            </div>
          </div>

          {/* about company */}
          <div className="card p-6">
            <SectionTitle>About {job.company}</SectionTitle>
            <p className="text-sm text-muted leading-[1.8] font-normal">{job.about_company}</p>
          </div>

          {/* about role */}
          <div className="card p-6">
            <SectionTitle>About the role</SectionTitle>
            <p className="text-sm text-muted leading-[1.8] font-normal">{job.about_role}</p>
          </div>

          {/* responsibilities */}
          <div className="card p-6">
            <SectionTitle>What you'll do</SectionTitle>
            <ul className="flex flex-col gap-3">
              {job.responsibilities.map((r, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted leading-[1.7]">
                  <div className="w-[6px] h-[6px] rounded-full bg-accent mt-[7px] shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {/* requirements */}
          <div className="card p-6">
            <SectionTitle>What we're looking for</SectionTitle>
            <ul className="flex flex-col gap-3 mb-6">
              {job.requirements.map((r, i) => (
                <li key={i} className="flex gap-3 text-sm text-muted leading-[1.7]">
                  <div className="w-[6px] h-[6px] rounded-full bg-accent mt-[7px] shrink-0" />
                  {r}
                </li>
              ))}
            </ul>

            {job.nice_to_have.length > 0 && (
              <>
                <div className="text-[11px] font-bold tracking-[0.08em] uppercase text-muted mb-3 pt-4 border-t border-surface-alt">
                  Nice to have
                </div>
                <ul className="flex flex-col gap-3">
                  {job.nice_to_have.map((r, i) => (
                    <li key={i} className="flex gap-3 text-sm text-muted leading-[1.7]">
                      <div className="w-[6px] h-[6px] rounded-full bg-border mt-[7px] shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          {/* benefits */}
          <div className="card p-6">
            <SectionTitle>Benefits</SectionTitle>
            <div className="grid grid-cols-2 gap-2.5">
              {job.benefits.map((b, i) => (
                <div key={i} className="flex gap-2.5 items-start bg-bg rounded-[length:var(--radius-md)] p-3 text-sm font-medium text-muted">
                  <div className="w-[6px] h-[6px] rounded-full bg-accent mt-[5px] shrink-0" />
                  {b}
                </div>
              ))}
            </div>
          </div>

          {/* interview process */}
          <div className="card p-6">
            <SectionTitle>Interview process</SectionTitle>
            <div className="flex flex-col gap-0">
              {job.interview_stages.map((stage, i) => (
                <div key={i} className="flex gap-4 items-start py-3.5 border-b border-surface-alt last:border-b-0">
                  <div className="flex flex-col items-center shrink-0 pt-0.5">
                    <div className="w-7 h-7 rounded-full bg-accent text-white font-display font-bold text-[11px]
                      flex items-center justify-center shadow-[var(--shadow-sm)]">
                      {i + 1}
                    </div>
                    {i < job.interview_stages.length - 1 && (
                      <div className="w-[2px] h-full bg-border mt-1.5 flex-1 min-h-[20px]" />
                    )}
                  </div>
                  <div className="text-sm font-medium text-muted leading-[1.6] pt-1">{stage}</div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* right col — meta sidebar */}
        <aside className="w-[260px] shrink-0 sticky top-[78px] flex flex-col gap-4">

          {/* meta card */}
          <div className="card p-5 flex flex-col gap-0 divide-y divide-surface-alt">
            {metaItems.map(m => (
              <div key={m.label} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="text-[11px] font-bold tracking-[0.06em] uppercase text-muted shrink-0">{m.label}</div>
                <div className="text-sm font-semibold text-text text-right">{m.value}</div>
              </div>
            ))}
          </div>

          {/* share */}
          <div className="card p-5">
            <div className="text-[10px] font-bold tracking-[0.1em] uppercase text-muted mb-3">Share this role</div>
            <div className="flex gap-2">
              {['LinkedIn', 'Twitter', 'Copy link'].map(s => (
                <button key={s} className="flex-1 text-[11px] font-bold text-muted
                  bg-bg border border-border rounded-[length:var(--radius-md)]
                  py-2 text-center transition-colors hover:border-text hover:text-text">
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* report */}
          <div className="text-center">
            <button className="text-[11px] text-faint font-medium hover:text-muted transition-colors">
              Report this listing
            </button>
          </div>

        </aside>

      </div>

      {/* ── SIMILAR ROLES ── */}
      <div className="border-t-[length:var(--border-width)] border-text bg-surface py-12">
        <div className="max-w-[1280px] mx-auto px-gutter">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display font-bold text-[18px] tracking-[-0.02em]">Similar roles</h2>
            <a href="/jobs" className="text-sm font-bold text-accent hover:text-accent-600 transition-colors">
              See all →
            </a>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {similar.map(j => (
              <a key={j.id} href={`/jobs/${j.id}`} className="block no-underline">
                <JobCard job={j} />
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-[3px] h-[18px] rounded-full bg-accent shrink-0" />
      <h2 className="font-display font-bold text-[15px] tracking-[-0.02em]">{children}</h2>
    </div>
  )
}
