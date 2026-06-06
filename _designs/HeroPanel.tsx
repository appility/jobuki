import { WorkMode } from './JobCard'

const MINI_JOBS = [
  { ico: '🏦', title: 'Staff Eng — Platform',   co: 'Starling Bank · London',    sal: '£130–160k', mode: 'Hybrid'   as WorkMode },
  { ico: '🤖', title: 'Senior ML Engineer',      co: 'Monzo · Remote',            sal: '£110–140k', mode: 'Remote'   as WorkMode },
  { ico: '🎨', title: 'Principal Designer',       co: 'Deliveroo · London',        sal: '£95–120k',  mode: 'Hybrid'   as WorkMode },
  { ico: '⚙️', title: 'Backend Eng — Rust',      co: 'Revolut · Remote',          sal: '£120–145k', mode: 'Remote'   as WorkMode },
  { ico: '📊', title: 'Head of Data Science',    co: 'Checkout.com · London',     sal: '£150–180k', mode: 'On-site'  as WorkMode },
]

const badgeClass: Record<WorkMode, string> = {
  Remote:   'badge badge-remote',
  Hybrid:   'badge badge-hybrid',
  'On-site':'badge badge-onsite',
}

const STATS = [
  { n: '312',  l: 'Companies' },
  { n: '£92k', l: 'Avg pay'   },
  { n: '48',   l: 'New today' },
]

export default function HeroPanel() {
  return (
    <div className="card p-6 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <span className="font-display font-bold text-[11px] tracking-wide">LATEST ROLES</span>
        <span className="text-xs font-semibold text-muted uppercase tracking-wider">Just added</span>
      </div>

      {MINI_JOBS.map(j => (
        <div key={j.title} className="mini-job">
          <div className="mj-icon">{j.ico}</div>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold tracking-tight truncate">{j.title}</div>
            <div className="text-xs font-medium text-muted">{j.co}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-bold tracking-tight">{j.sal}</div>
            <span className={badgeClass[j.mode]}>{j.mode}</span>
          </div>
        </div>
      ))}

      <div className="h-[2px] bg-surface-alt my-3.5" />

      <div className="grid grid-cols-3 gap-2">
        {STATS.map(s => (
          <div key={s.l} className="bg-bg border border-border rounded-lg p-3 text-center">
            <div className="font-display font-extrabold text-[20px] leading-none tracking-[-0.04em]">{s.n}</div>
            <div className="text-[10px] font-semibold text-muted tracking-wider uppercase mt-1">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
