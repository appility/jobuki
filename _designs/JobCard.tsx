export type WorkMode = 'Remote' | 'Hybrid' | 'On-site'
export type CardVariant = 'default' | 'accent' | 'ink' | 'ochre'

export interface Job {
  num:      string
  title:    string
  company:  string
  location: string
  sector:   string
  salary:   string
  mode:     WorkMode
  ago:      string
  skills:   string[]
  variant?: CardVariant
  featured?: boolean
}

const modeClass: Record<WorkMode, string> = {
  Remote:   'badge-remote',
  Hybrid:   'badge-hybrid',
  'On-site':'badge-onsite',
}

const variantClass: Record<CardVariant, string> = {
  default: 'card',
  accent:  'card-accent',
  ink:     'card-ink',
  ochre:   'card-ochre',
}

// On coloured cards, invert text colours
const variantText: Record<CardVariant, { title: string; salary: string; cat: string; meta: string; tag: string; footer: string; ago: string; dot: string }> = {
  default: {
    title:  'text-text',
    salary: 'text-text',
    cat:    'text-muted',
    meta:   'text-muted',
    tag:    'bg-bg text-muted border-border',
    footer: 'border-surface-alt',
    ago:    'text-faint',
    dot:    'bg-accent',
  },
  accent: {
    title:  'text-white',
    salary: 'text-white',
    cat:    'text-white/55',
    meta:   'text-white/60',
    tag:    'bg-white/10 text-white border-white/15',
    footer: 'border-white/15',
    ago:    'text-white/30',
    dot:    'bg-white/50',
  },
  ink: {
    title:  'text-primary-50',
    salary: 'text-primary-50',
    cat:    'text-primary-50/40',
    meta:   'text-primary-50/50',
    tag:    'bg-white/5 text-primary-50/70 border-white/10',
    footer: 'border-white/10',
    ago:    'text-white/20',
    dot:    'bg-accent',
  },
  ochre: {
    title:  'text-text',
    salary: 'text-text',
    cat:    'text-text/50',
    meta:   'text-text/60',
    tag:    'bg-black/7 text-text border-black/12',
    footer: 'border-black/10',
    ago:    'text-black/25',
    dot:    'bg-text/40',
  },
}

export default function JobCard({ job }: { job: Job }) {
  const v = job.variant ?? 'default'
  const vt = variantText[v]
  const modeOverride = v !== 'default'
    ? 'bg-white/15 text-white rounded-sm px-[7px] py-[2px] text-[10px] font-bold tracking-[0.04em] uppercase inline-block'
    : `badge ${modeClass[job.mode]}`

  return (
    <div className={`${variantClass[v]} card-reveal jc-wrap flex flex-col`}>
      {job.featured && (
        <div className={`jc-cat ${vt.cat}`}>
          <div className={`jc-dot ${vt.dot}`} />
          Featured
        </div>
      )}
      {!job.featured && (
        <div className={`jc-cat ${vt.cat}`}>
          <div className={`jc-dot ${vt.dot}`} />
          {job.sector}
        </div>
      )}

      <div className={`jc-title ${vt.title}`}>{job.title}</div>

      <div className={`jc-meta ${vt.meta}`}>
        <strong className={v === 'default' ? 'text-text font-semibold' : 'text-white/90 font-semibold'}>
          {job.company}
        </strong>
        <span className="text-faint">·</span>
        {job.location}
      </div>

      <div className="jc-tags">
        {job.skills.map(s => (
          <span key={s} className={`jc-tag ${vt.tag}`}>{s}</span>
        ))}
      </div>

      <div className={`jc-footer ${vt.footer} mt-auto`}>
        <div className={`jc-salary ${vt.salary}`}>{job.salary}</div>
        <div className="text-right">
          <span className={modeOverride}>{job.mode}</span>
          <div className={`text-[11px] font-semibold mt-1 ${vt.ago}`}>{job.ago}</div>
        </div>
      </div>
    </div>
  )
}
