import { useLoaderData, useOutletContext, Link } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { getDb, jobs, boards } from '@jobuki/db'
import { and, desc, eq, ne } from 'drizzle-orm'
import { marked } from 'marked'
import { repairMojibake, sanitizeFeedHtml } from '../../lib/feed-html'
import type { Board } from '@jobuki/types'
import { RichTextRenderer } from '../../components/rich-text/RichTextRenderer'
import { isTiptapDoc } from '../../lib/rich-text'

export async function loader({ params }: LoaderFunctionArgs) {
  const db = getDb()
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, params.jobId!) })
  if (!job || job.status !== 'published') throw new Response('Not found', { status: 404 })
  const board = await db.query.boards.findFirst({ where: eq(boards.id, job.boardId) })
  if (!board) throw new Response('Not found', { status: 404 })

  const similarJobs = await db.query.jobs.findMany({
    where: and(
      eq(jobs.boardId, board.id),
      eq(jobs.status, 'published'),
      ne(jobs.id, job.id),
    ),
    orderBy: [desc(jobs.createdAt)],
    limit: 3,
  })

  return { job, board, similarJobs }
}

export const meta: MetaFunction<typeof loader> = ({ data }) => {
  if (!data) {
    return [
      { title: 'Job | Jobuki' },
      { name: 'description', content: 'View the role details and apply online.' },
    ]
  }

  const locationPart = data.job.location ? ` in ${data.job.location}` : ''
  return [
    { title: `${data.job.title} | ${data.board.name}` },
    { name: 'description', content: `Apply for ${data.job.title}${locationPart} at ${data.board.name}.` },
  ]
}

const REMOTE_LABEL: Record<string, string> = {
  remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site',
}
const TYPE_LABEL: Record<string, string> = {
  'full-time': 'Full-time', 'part-time': 'Part-time',
  contract: 'Contract', freelance: 'Freelance', internship: 'Internship',
}

export default function JobDetail() {
  const { job, board, similarJobs } = useLoaderData<typeof loader>()
  const { board: layoutBoard } = useOutletContext<{ board: Board }>()

  const salary = (job.salaryMin || job.salaryMax)
    ? [
        job.salaryMin ? `${job.salaryCurrency}${job.salaryMin.toLocaleString()}` : null,
        job.salaryMax ? `${job.salaryCurrency}${job.salaryMax.toLocaleString()}` : null,
      ].filter(Boolean).join(' – ') + (job.salaryPeriod ? ` / ${job.salaryPeriod}` : '')
    : null

  const postedAt = job.createdAt ? formatDate(job.createdAt) : null
  const categoryLabel = titleCaseCategory(job.primaryCategory)
  const heroLine = `Apply directly to ${job.company || board.name}. No middlemen.`

  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: 'var(--font-body)',
        background:
          'radial-gradient(circle at 8% 12%, color-mix(in srgb, var(--color-primary) var(--board-ambient-primary), transparent) 0%, transparent 34%), radial-gradient(circle at 92% 84%, color-mix(in srgb, var(--color-accent) var(--board-ambient-accent), transparent) 0%, transparent 36%), var(--color-background)',
      }}
    >
      <main className="max-w-[1280px] mx-auto px-10 pt-8 pb-16">
        <section className="py-4 md:py-6">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-5 text-[11px] font-semibold"
            style={{ backgroundColor: 'var(--color-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
            <span className="inline-flex w-5 h-5 items-center justify-center rounded-full"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-primary-fg)' }}>•</span>
            Open role
          </div>

          <h1
            className="m-0 text-[clamp(40px,5.5vw,66px)] font-extrabold leading-[1.05] tracking-[-0.03em]"
            style={{ fontFamily: "'Unbounded', var(--font-display), sans-serif", color: 'var(--color-text-primary)' }}
          >
            {job.title}
          </h1>

          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {job.company ? <span className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{job.company}</span> : null}
            {job.company && (job.location || postedAt) ? <span>•</span> : null}
            {job.location ? <span>{job.location}</span> : null}
            {job.location && postedAt ? <span>•</span> : null}
            {postedAt ? <span>Posted {postedAt}</span> : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {categoryLabel ? <Chip accent>{categoryLabel}</Chip> : null}
            <Chip>{REMOTE_LABEL[job.remotePolicy] ?? job.remotePolicy}</Chip>
            <Chip>{TYPE_LABEL[job.employmentType] ?? job.employmentType}</Chip>
            {salary ? <Chip>{salary}</Chip> : null}
          </div>

          <p className="mt-5 text-[16px] leading-relaxed max-w-[56ch]" style={{ color: 'var(--color-text-secondary)' }}>
            {heroLine}
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Link to={`/apply/${job.id}`} className="btn-primary inline-flex justify-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
              Apply now →
            </Link>
            <Link to="/jobs" className="btn-outline inline-flex justify-center text-sm">
              Back to roles
            </Link>
          </div>
        </section>

        <section className="mt-7 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-10 items-start">
          <div className="min-w-0 space-y-10">
            {isTiptapDoc(job.descriptionJson) ? (
              <PlainSection title="About the role">
                <RichTextRenderer content={job.descriptionJson} className="prose prose-slate max-w-none text-sm" />
              </PlainSection>
            ) : job.description ? (
              <PlainSection title="About the role">
                <SectionBody>{job.description}</SectionBody>
              </PlainSection>
            ) : null}

            {job.requirements ? (
              <PlainSection title="Requirements">
                <SectionBody>{job.requirements}</SectionBody>
              </PlainSection>
            ) : null}

            {job.benefits ? (
              <PlainSection title="Benefits">
                <SectionBody>{job.benefits}</SectionBody>
              </PlainSection>
            ) : null}
          </div>

          <aside className="lg:sticky lg:top-20">
            <div className="pt-2 pb-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h2 className="text-base font-bold" style={{ fontFamily: "'Unbounded', var(--font-display), sans-serif", color: 'var(--color-text-primary)' }}>
                Role details
              </h2>
            </div>
            <div className="pt-2">
              <MetaRow label="Company" value={job.company} />
              <MetaRow label="Location" value={job.location} />
              <MetaRow label="Type" value={TYPE_LABEL[job.employmentType] ?? job.employmentType} />
              <MetaRow label="Mode" value={REMOTE_LABEL[job.remotePolicy] ?? job.remotePolicy} />
              <MetaRow label="Category" value={categoryLabel || 'General'} />
              <MetaRow label="Salary" value={salary || 'Not listed'} />
              <MetaRow label="Posted" value={postedAt} />
            </div>
          </aside>
        </section>

        {similarJobs.length > 0 ? (
          <section className="mt-12">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)', fontFamily: "'Unbounded', var(--font-display), sans-serif" }}>
                Similar roles
              </h2>
              <Link to="/jobs" className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                See all →
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {similarJobs.map((item) => (
                <Link
                  key={item.id}
                  to={`/jobs/${item.id}`}
                  className="block rounded-[18px] border p-4 no-underline transition-transform duration-150 hover:-translate-y-[1px]"
                  style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)', boxShadow: 'var(--shadow-sm)' }}
                >
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{item.title}</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    {[item.company, item.location].filter(Boolean).join(' • ')}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <footer className="py-8" style={{ borderTop: '1px solid var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="max-w-[1280px] mx-auto px-10">
          <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
            {layoutBoard.footerText || (
              <>Powered by <span className="font-extrabold" style={{ color: 'var(--color-text-secondary)' }}>Jobuki</span></>
            )}
          </p>
        </div>
      </footer>
    </div>
  )
}

function Chip({ children, icon, accent }: { children: React.ReactNode; icon?: string; accent?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full tracking-[0.02em]"
      style={accent ? {
        backgroundColor: 'color-mix(in srgb, var(--color-primary) 16%, transparent)',
        color: 'var(--color-primary)',
      } : {
        backgroundColor: 'var(--color-surface-subtle)',
        color: 'var(--color-text-secondary)',
        border: '1px solid var(--color-border)',
      }}>
      {icon && <span>{icon}</span>}
      {children}
    </span>
  )
}

function PlainSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="pb-7 border-b" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="h-4 w-1 rounded" style={{ backgroundColor: 'var(--color-primary)' }} />
        <h2 className="text-base font-bold" style={{ fontFamily: "'Unbounded', var(--font-display), sans-serif", color: 'var(--color-text-primary)' }}>
          {title}
        </h2>
      </div>
      <div>{children}</div>
    </section>
  )
}

function SectionBody({ children }: { children: string }) {
  const html = toSafeRichHtml(children)

  return (
    <div
      className="text-sm leading-relaxed"
      style={{ color: 'var(--color-text-secondary)' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null

  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b last:border-b-0"
      style={{ borderColor: 'var(--color-border)' }}>
      <span className="text-[11px] font-bold uppercase tracking-[0.06em]" style={{ color: 'var(--color-text-muted)' }}>
        {label}
      </span>
      <span className="text-sm text-right" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

function titleCaseCategory(value: string | null | undefined) {
  if (!value) return ''
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value)
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium' }).format(date)
}

function toSafeRichHtml(input: string) {
  const normalized = normalizeLegacyJobText(input)
  const repaired = repairMojibake(normalized)
  const decoded = decodeCommonHtmlEntities(repaired)
  const hasHtml = /<\/?[a-z][\s\S]*>/i.test(decoded)
  const html = hasHtml ? decoded : (marked.parse(decoded, { breaks: true, gfm: true }) as string)
  return sanitizeFeedHtml(html)
}

function normalizeLegacyJobText(input: string): string {
  return input
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\\t/g, ' ')
    .replace(/(^|\s)#(?!\s)[A-Za-z0-9][A-Za-z0-9_-]*/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function decodeCommonHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}
