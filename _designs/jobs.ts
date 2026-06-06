import { type Job } from '../components/JobCard'

export interface JobDetail extends Job {
  id:               string
  posted:           string
  closes:           string
  type:             'Full-time' | 'Part-time' | 'Contract'
  level:            string
  equity?:          string
  visa:             boolean
  remote_detail:    string
  about_company:    string
  about_role:       string
  responsibilities: string[]
  requirements:     string[]
  nice_to_have:     string[]
  benefits:         string[]
  interview_stages: string[]
  similar_ids:      string[]
}

export const JOBS: JobDetail[] = [
  {
    id: 'starling-staff-eng', num: '01',
    title: 'Staff Software Engineer — Platform', company: 'Starling Bank',
    location: 'London', sector: 'Fintech', salary: '£130–160k',
    mode: 'Hybrid', ago: '2h ago', posted: '3 Jun 2025', closes: '3 Jul 2025',
    type: 'Full-time', level: 'Staff / Principal', equity: '0.05–0.15%',
    visa: false, remote_detail: '3 days London office, 2 days remote',
    skills: ['Kotlin', 'Kafka', 'Kubernetes', 'Microservices', 'PostgreSQL', 'Terraform'],
    about_company: `Starling Bank is a UK-licensed bank built entirely in software. We're on a mission to change banking for good — building the most reliable, scalable banking infrastructure in the world. With 4 million+ customers and £10bn in deposits, we're profitable, growing fast, and still feel like a startup.`,
    about_role: `We're looking for a Staff Engineer to lead the evolution of our core banking platform. You'll own the architecture of systems that process millions of transactions per day, working across a distributed team of engineers who care deeply about reliability, performance, and correctness.`,
    responsibilities: [
      'Define and drive the technical strategy for our core payments and ledger platform',
      'Lead design reviews and set the technical bar for platform engineering',
      'Partner with product and engineering leadership on quarterly roadmap planning',
      'Mentor senior and mid-level engineers across three squads',
      'Own reliability SLOs for critical payment flows — 99.999% uptime target',
      'Drive adoption of internal platform tools and shared infrastructure',
    ],
    requirements: [
      '8+ years of backend engineering with at least 2 years at Staff level or above',
      'Deep experience with distributed systems and event streaming (Kafka or similar)',
      'Production Kubernetes experience at scale',
      'Track record of influencing technical direction across multiple teams',
    ],
    nice_to_have: [
      'Experience in regulated financial environments (FCA, PRA)',
      'Open source contributions at the infrastructure or platform layer',
      'Experience with chaos engineering and production resilience testing',
    ],
    benefits: [
      '25 days holiday + bank holidays',
      'Private medical (Bupa) for you and family',
      'Equity via EMI options',
      '£1,500 annual learning budget',
      'Cycle to work + season ticket loan',
      'Enhanced parental leave — 26 weeks full pay',
    ],
    interview_stages: [
      'Recruiter screen (30 min)',
      'Technical phone screen with Principal Eng (45 min)',
      'Systems design (60 min, async take-home option)',
      'Values & cross-functional (60 min)',
      'Offer',
    ],
    similar_ids: ['monzo-ml-eng', 'revolut-rust', 'checkout-data'],
    variant: 'default',
  },
  {
    id: 'monzo-ml-eng', num: '02',
    title: 'Senior ML Engineer', company: 'Monzo',
    location: 'Remote / London', sector: 'Fintech', salary: '£110–140k',
    mode: 'Remote', ago: '4h ago', posted: '3 Jun 2025', closes: '30 Jun 2025',
    type: 'Full-time', level: 'Senior', equity: '0.02–0.08%',
    visa: true, remote_detail: 'Fully remote — optional London office access',
    skills: ['Python', 'PyTorch', 'MLflow', 'dbt', 'Spark', 'Ray'],
    about_company: `Monzo is one of the UK's leading digital banks with 9 million customers. We're building financial tools that genuinely help people manage their money — and machine learning is at the heart of that mission.`,
    about_role: `Join our ML Platform team to build and scale models that protect Monzo customers from fraud, surface personalised insights, and power our credit decisioning engine. You'll work end-to-end with full ownership of model performance.`,
    responsibilities: [
      'Design, train and deploy ML models for fraud detection and credit risk',
      'Own model performance in production — monitoring, drift detection, retraining',
      'Collaborate with data engineers to build reliable feature pipelines',
      'Work with product to translate business requirements into ML problems',
      'Contribute to shared ML platform tooling and best practices',
    ],
    requirements: [
      '4+ years of ML engineering in a production environment',
      'Strong Python — numpy, pandas, scikit-learn, PyTorch or TensorFlow',
      'Experience deploying and monitoring models at scale',
      'Solid understanding of feature stores, model registries, experiment tracking',
    ],
    nice_to_have: [
      'Experience with LLMs or NLP in financial contexts',
      'Knowledge of causal inference or uplift modelling',
      'Previous work in fraud or credit risk specifically',
    ],
    benefits: [
      'Fully remote with £1,000 home office budget',
      '25 days holiday + flexible bank holidays',
      'Private health insurance + mental health support',
      'Equity stake',
      '£1,500 learning & development budget',
    ],
    interview_stages: [
      'Application review',
      'Take-home ML challenge (3–4 hours)',
      'Technical review of take-home (60 min)',
      'Behavioural + values (45 min)',
      'Offer',
    ],
    similar_ids: ['starling-staff-eng', 'revolut-rust', 'checkout-data'],
    variant: 'default',
  },
  {
    id: 'revolut-rust', num: '05',
    title: 'Senior Backend Engineer — Rust', company: 'Revolut',
    location: 'Remote', sector: 'Fintech', salary: '£120–145k',
    mode: 'Remote', ago: '12h ago', posted: '2 Jun 2025', closes: '2 Jul 2025',
    type: 'Full-time', level: 'Senior',
    visa: false, remote_detail: 'Fully remote globally',
    skills: ['Rust', 'Distributed Systems', 'PostgreSQL', 'gRPC', 'Redis'],
    about_company: `Revolut is a global fintech with 45 million customers across 35+ countries. We're building payments, crypto, stock trading, and banking products simultaneously with an engineering culture that's high performance and deeply technical.`,
    about_role: `We're hiring Rust engineers to work on our core transaction processing engine — the system that moves billions of pounds daily. Performance, correctness, and reliability are non-negotiable.`,
    responsibilities: [
      'Build and maintain high-throughput transaction processing systems in Rust',
      'Design low-latency APIs serving millions of requests per second',
      'Work with distributed storage systems and event streaming at scale',
      'Drive performance profiling and optimisation initiatives',
    ],
    requirements: [
      '4+ years of backend engineering with at least 1 year in production Rust',
      'Strong fundamentals: concurrency, memory safety, async Rust',
      'Experience with high-throughput, low-latency systems',
      'Distributed systems knowledge — consensus, partitioning, replication',
    ],
    nice_to_have: [
      'Previous experience in payments or financial transaction systems',
      'Contributions to the Rust ecosystem',
    ],
    benefits: [
      'Competitive equity',
      'Remote-first forever',
      'Private health insurance',
      'Annual learning budget + home office stipend',
    ],
    interview_stages: [
      'CV screen',
      'Online coding assessment — Rust (90 min)',
      'Systems design interview',
      'Culture fit interview',
      'Offer',
    ],
    similar_ids: ['starling-staff-eng', 'monzo-ml-eng', 'checkout-data'],
    variant: 'default',
  },
  {
    id: 'checkout-data', num: '07',
    title: 'Head of Data Science', company: 'Checkout.com',
    location: 'London', sector: 'Payments', salary: '£150–180k',
    mode: 'On-site', ago: '1d ago', posted: '2 Jun 2025', closes: '16 Jun 2025',
    type: 'Full-time', level: 'Head / Director', equity: '0.1–0.3%',
    visa: false, remote_detail: 'On-site London Paddington HQ — flexible Fridays',
    skills: ['Python', 'Spark', 'Risk Modelling', 'SQL', 'Causal Inference', 'Team Leadership'],
    about_company: `Checkout.com is one of the world's leading payment processors, handling $200bn+ in annualised payment volume. We're a Series D company with 1,800+ employees and a data team that punches well above its weight.`,
    about_role: `We're looking for a Head of Data Science to lead a team of 12 across fraud, risk, and merchant analytics. You'll define the data science strategy, hire the next generation of the team, and own the models that keep billions in transactions secure.`,
    responsibilities: [
      'Lead and grow a team of 12 data scientists across three squads',
      'Define the 3-year data science strategy and own quarterly OKRs',
      'Partner with product, engineering, and commercial leadership',
      'Own the fraud and risk modelling roadmap — from research to production',
      'Present data science outcomes to executive stakeholders',
    ],
    requirements: [
      '8+ years in data science with at least 3 years in a leadership role',
      'Deep expertise in risk modelling, fraud detection, or credit scoring',
      'Track record managing and growing high-performing data science teams',
      'PhD or equivalent research experience preferred',
    ],
    nice_to_have: [
      'Published research in ML, statistics, or financial risk',
      'Experience at a Tier 1 payments company',
      'Board-level presentation experience',
    ],
    benefits: [
      'Significant equity package',
      'Executive medical cover (you + family)',
      '30 days holiday',
      'Annual conference speaking budget',
      'Sabbatical after 5 years',
    ],
    interview_stages: [
      'Recruiter screen (30 min)',
      'VP Engineering interview (60 min)',
      'Technical panel — risk modelling deep-dive (90 min)',
      'Executive presentation (45 min)',
      'CEO / board meet (informal)',
      'Offer',
    ],
    similar_ids: ['monzo-ml-eng', 'starling-staff-eng', 'revolut-rust'],
    variant: 'default',
  },
]

export function getJob(id: string): JobDetail | undefined {
  return JOBS.find(j => j.id === id)
}

export function getSimilar(ids: string[]): JobDetail[] {
  return ids.map(id => JOBS.find(j => j.id === id)).filter(Boolean) as JobDetail[]
}
