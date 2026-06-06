'use client'
import { useEffect, useRef } from 'react'
import JobCard, { type Job } from './JobCard'

const JOBS: Job[] = [
  { num:'01', title:'Staff Software Engineer — Platform', company:'Starling Bank', location:'London',          sector:'Fintech',      salary:'£130–160k', mode:'Hybrid',   ago:'2h ago',  skills:['Kotlin','Kafka','Kubernetes'],          variant:'accent',  featured:true },
  { num:'03', title:'Senior ML Engineer',                  company:'Monzo',         location:'Remote / London', sector:'Data & ML',    salary:'£110–140k', mode:'Remote',   ago:'4h ago',  skills:['Python','PyTorch','MLflow'],             variant:'default' },
  { num:'05', title:'Senior Backend Eng — Rust',           company:'Revolut',       location:'Remote',          sector:'Engineering',  salary:'£120–145k', mode:'Remote',   ago:'12h ago', skills:['Rust','Distributed Systems','Postgres'], variant:'ochre'   },
  { num:'06', title:'Principal Product Designer',          company:'Deliveroo',     location:'London',          sector:'Design',       salary:'£95–120k',  mode:'Hybrid',   ago:'6h ago',  skills:['Figma','Design Systems','iOS'],          variant:'default' },
  { num:'07', title:'DevOps Eng — Cloud Infra',            company:'OVO Energy',    location:'Bristol',         sector:'DevOps',       salary:'£75–95k',   mode:'Remote',   ago:'1d ago',  skills:['Terraform','AWS','Datadog'],             variant:'ink'     },
  { num:'08', title:'Head of Data Science',                company:'Checkout.com',  location:'London',          sector:'Payments',     salary:'£150–180k', mode:'On-site',  ago:'1d ago',  skills:['Python','Spark','Risk Modelling'],       variant:'default' },
]

// Column spans for each card in the 12-col bento grid
const SPANS = [
  'col-span-5', // featured
  'col-span-4', // regular
  'col-span-3', // stat 1
  'col-span-4', // alert
  'col-span-3', // stat 2
  'col-span-5', // ochre
  'col-span-7', // CTA
  'col-span-4', // regular
  'col-span-4', // ink
  'col-span-4', // regular
]

export default function BentoGrid() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const items = ref.current?.querySelectorAll('.card-reveal')
    if (!items) return
    const io = new IntersectionObserver(entries => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 50)
        }
      })
    }, { threshold: 0.08 })
    items.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className="grid grid-cols-12 gap-3 px-gutter pb-20 max-w-[1280px] mx-auto">

      {/* Featured — accent violet */}
      <div className="col-span-5">
        <JobCard job={JOBS[0]} />
      </div>

      {/* Stat: new today */}
      <div className="col-span-3">
        <div className="stat-card card-reveal">
          <div className="stat-label">New today</div>
          <div className="stat-number">48</div>
          <div className="stat-sub">roles added</div>
        </div>
      </div>

      {/* Alert signup */}
      <div className="col-span-4">
        <div className="alert-card card-reveal flex flex-col">
          <div className="font-display font-bold text-[13px] tracking-wide mb-2">GET JOB ALERTS</div>
          <p className="text-sm text-muted leading-relaxed mb-3.5">
            Right roles in your inbox the moment they go live.
          </p>
          <div className="alert-row mt-auto">
            <input className="alert-input" type="email" placeholder="you@email.com" />
            <button className="alert-go">Go →</button>
          </div>
        </div>
      </div>

      {/* ML Eng */}
      <div className="col-span-4">
        <JobCard job={JOBS[1]} />
      </div>

      {/* Stat: companies */}
      <div className="col-span-3">
        <div className="stat-card card-reveal">
          <div className="stat-label">Companies hiring</div>
          <div className="stat-number text-accent">312</div>
          <div className="stat-sub">across the UK</div>
        </div>
      </div>

      {/* Ochre — Rust */}
      <div className="col-span-5">
        <JobCard job={JOBS[2]} />
      </div>

      {/* CTA wide */}
      <div className="col-span-7">
        <div className="cta-card card-reveal">
          <div className="cta-title">
            Reach <span className="text-accent">40,000</span> UK tech professionals this week.
          </div>
          <button className="cta-button">Post a role →</button>
        </div>
      </div>

      {/* Designer */}
      <div className="col-span-4">
        <JobCard job={JOBS[3]} />
      </div>

      {/* DevOps ink */}
      <div className="col-span-4">
        <JobCard job={JOBS[4]} />
      </div>

      {/* Data Science */}
      <div className="col-span-4">
        <JobCard job={JOBS[5]} />
      </div>

    </div>
  )
}
