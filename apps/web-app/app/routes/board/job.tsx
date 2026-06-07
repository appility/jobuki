import { useLoaderData, useOutletContext, Link } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { getDb, jobs, boards } from '@jobuki/db'
import { and, desc, eq, ne } from 'drizzle-orm'
import { marked } from 'marked'
import { repairMojibake, sanitizeFeedHtml } from '../../lib/feed-html'
import { resolveJobBoardThemeConfig, type Board } from '@jobuki/types'
import { RichTextRenderer } from '../../components/rich-text/RichTextRenderer'
import { isTiptapDoc } from '../../lib/rich-text'
import { deriveJobCategory, resolveBoardCategories, titleCaseCategory } from '../../lib/board-categories'
import { publicJobPath } from '../../lib/public-job-path'

export async function loader({ params, request }: LoaderFunctionArgs) {
  const db = getDb()
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, params.jobId!) })
  if (!job || job.status !== 'published') throw new Response('Not found', { status: 404 })
  const board = await db.query.boards.findFirst({ where: eq(boards.id, job.boardId) })
  if (!board) throw new Response('Not found', { status: 404 })
  const url = new URL(request.url)
  const isPreviewMode = url.searchParams.get('preview') === '1'
  const boardConfig = resolveJobBoardThemeConfig(board.boardConfig, {
    boardName: board.name,
    tagline: board.introText ?? undefined,
    logoUrl: board.logoUrl ?? undefined,
    headerImageUrl: board.heroImageUrl ?? undefined,
    brandColor: (board.theme as any)?.colorPrimary,
    accentColor: (board.theme as any)?.colorAccent,
    backgroundColor: (board.theme as any)?.colorBackground,
  })
  const boardCategories = resolveBoardCategories(boardConfig.categories)

  const similarJobs = await db.query.jobs.findMany({
    where: and(
      eq(jobs.boardId, board.id),
      eq(jobs.status, 'published'),
      ne(jobs.id, job.id),
    ),
    orderBy: [desc(jobs.createdAt)],
    limit: 3,
  })

  return { job, board, similarJobs, isPreviewMode, boardCategories }
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
  const { job, board, similarJobs, isPreviewMode, boardCategories } = useLoaderData<typeof loader>()
  const { board: layoutBoard } = useOutletContext<{ board: Board }>()

  const salary = (job.salaryMin || job.salaryMax)
    ? [
        job.salaryMin ? `${job.salaryCurrency}${job.salaryMin.toLocaleString()}` : null,
        job.salaryMax ? `${job.salaryCurrency}${job.salaryMax.toLocaleString()}` : null,
      ].filter(Boolean).join(' – ') + (job.salaryPeriod ? ` / ${job.salaryPeriod}` : '')
    : null

  const postedAt = job.createdAt ? formatDate(job.createdAt) : null
  const categoryLabel = titleCaseCategory(deriveJobCategory(job, boardCategories))
  const skillTags = Array.isArray(job.categoryTags) ? job.categoryTags.slice(0, 6) : []
  const remoteBadge = getRemoteBadge(job.remotePolicy)
  const categoryBadge = getCategoryBadge(categoryLabel)
  const compactSalary = formatCompactSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)
  const companyMark = companyInitials(job.company)
  const externalApplyHref = job.externalApplyUrl || job.externalListingUrl

  return (
    <div
      className="min-h-screen font-body"
      style={{
        background:
          'radial-gradient(circle at 8% 12%, color-mix(in srgb, var(--color-primary) var(--board-ambient-primary), transparent) 0%, transparent 34%), radial-gradient(circle at 92% 84%, color-mix(in srgb, var(--color-accent) var(--board-ambient-accent), transparent) 0%, transparent 36%), var(--color-background)',
      }}
    >
      <main className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-9 pb-20">
        <Link
          to="/jobs"
          className="inline-flex items-center gap-2 text-[13px] font-semibold rounded-[10px] px-4 py-2 border mb-7 text-text-secondary bg-surface border-border"
        >
          ← Back to all roles
        </Link>

        <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
          <main className="rounded-[20px] overflow-hidden border border-border bg-surface">
            <header className="px-8 py-8 border-b border-border">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] mb-4 text-text-secondary">
                <span>Jobs</span>
                <span className="text-border">›</span>
                <span style={{ color: categoryBadge.fg }}>{categoryLabel || 'General'}</span>
              </div>

              <div className="flex items-start gap-4 mb-4">
                <div className="w-[52px] h-[52px] rounded-[12px] border border-border bg-background shrink-0 overflow-hidden flex items-center justify-center">
                  {job.companyLogoUrl ? (
                    <img
                      src={job.companyLogoUrl}
                      alt={job.company ?? ''}
                      className="w-full h-full object-contain p-1.5"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex' }}
                    />
                  ) : null}
                  <span className="text-sm font-extrabold font-display text-text-secondary" style={{ display: job.companyLogoUrl ? 'none' : 'flex' }}>{companyMark}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <h1
                    className="text-[23px] font-extrabold leading-[1.15] tracking-[-0.03em] mb-2 font-display text-text-primary"
                  >
                    {job.title}
                  </h1>

                  <div className="flex items-center gap-2.5 text-[13px] flex-wrap text-text-secondary">
                    {job.company ? <span className="text-text-primary font-bold">{job.company}</span> : null}
                    <Dot />
                    <span>{job.location || 'Remote / Global'}</span>
                    <Dot />
                    <span className="text-border-strong font-semibold">{postedAt || 'Recently posted'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold tracking-[0.03em] px-2.5 py-1 rounded-[7px]" style={{ backgroundColor: categoryBadge.bg, color: categoryBadge.fg }}>
                  {categoryLabel || 'General'}
                </span>
                <span className="text-[11px] font-bold tracking-[0.03em] px-2.5 py-1 rounded-[7px]" style={{ backgroundColor: remoteBadge.bg, color: remoteBadge.fg }}>
                  {remoteBadge.label}
                </span>
                <span className="text-[11px] font-semibold tracking-[0.03em] px-2.5 py-1 rounded-[7px] border border-border bg-background text-text-secondary">
                  {TYPE_LABEL[job.employmentType] ?? job.employmentType}
                </span>
                {compactSalary ? (
                  <span className="text-[11px] font-semibold tracking-[0.03em] px-2.5 py-1 rounded-[7px] border border-border bg-background text-text-secondary">
                    {compactSalary}
                  </span>
                ) : null}
              </div>
            </header>

            {skillTags.length > 0 ? (
              <div className="px-8 py-4 border-b border-border bg-background flex gap-1.5 flex-wrap">
                {skillTags.map((tag) => (
                  <Link
                    key={tag}
                    to={`/jobs/category/${encodeURIComponent(tag.toLowerCase())}`}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-[7px] border border-border bg-surface text-text-secondary no-underline hover:border-primary hover:text-primary transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            ) : null}

            <div className="px-8 py-8">
              {isTiptapDoc(job.descriptionJson) ? (
                <RichTextRenderer
                  content={job.descriptionJson}
                  className="prose prose-slate max-w-none prose-p:text-[14px] prose-p:leading-[1.9] prose-li:text-[14px] prose-li:leading-[1.8] prose-h3:text-[10px] prose-h3:uppercase prose-h3:tracking-[0.12em] prose-h3:font-extrabold prose-h3:mt-8 prose-h3:pt-7 prose-h3:border-t"
                />
              ) : job.description ? (
                <SectionBody>{job.description}</SectionBody>
              ) : null}

              {job.requirements ? (
                <div className="mt-8 pt-7 border-t border-border">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.12em] mb-3 font-display text-text-secondary">
                    Requirements
                  </h3>
                  <SectionBody>{job.requirements}</SectionBody>
                </div>
              ) : null}

              {job.benefits ? (
                <div className="mt-8 pt-7 border-t border-border">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-[0.12em] mb-3 font-display text-text-secondary">
                    Benefits
                  </h3>
                  <SectionBody>{job.benefits}</SectionBody>
                </div>
              ) : null}
            </div>
          </main>

          <aside className="space-y-3 lg:sticky lg:top-20">
            <section className="rounded-[18px] border border-border bg-surface p-[22px]">
              {externalApplyHref ? (
                <a
                  href={externalApplyHref}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="w-full btn-primary inline-flex justify-center py-3.5 text-sm font-bold mb-2 no-underline"
                >
                  Apply
                </a>
              ) : (
                <Link to={`/apply/${job.id}`} className="w-full btn-primary inline-flex justify-center py-3.5 text-sm font-bold mb-2">
                  Apply
                </Link>
              )}
              <button className="w-full py-2.5 text-[13px] font-semibold rounded-xl border border-border text-text-secondary bg-transparent">
                Save role
              </button>
            </section>

            <section className="rounded-[18px] border border-border bg-surface p-[22px]">
              <h2 className="text-[10px] font-extrabold uppercase tracking-[0.1em] mb-3 font-display text-text-secondary">
                Details
              </h2>
              <MetaRow label="Company" value={job.company} />
              <MetaRow label="Location" value={job.location} />
              <MetaRow label="Work style" value={remoteBadge.label} />
              <MetaRow label="Type" value={TYPE_LABEL[job.employmentType] ?? job.employmentType} />
              <MetaRow label="Category" value={categoryLabel || 'General'} />
              <MetaRow label="Posted" value={postedAt} />
            </section>

            {!isPreviewMode ? (
            <section className="rounded-[18px] border p-[22px]" style={{ borderColor: 'var(--color-border-inverse)', backgroundColor: 'var(--color-panel-strong)' }}>
              <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] mb-2" style={{ fontFamily: "'Unbounded', var(--font-display), sans-serif", color: 'color-mix(in srgb, var(--color-panel-strong-fg) 40%, transparent)' }}>
                Hiring?
              </p>
              <p className="text-[13px] leading-[1.7] mb-4 text-panel-strong-fg">
                Reach <span className="text-accent font-bold">40,000+</span> Web3 engineers looking for their next role right now.
              </p>
              <a
                href={board.customDomain ? `https://${board.customDomain}` : '#'}
                className="w-full inline-flex items-center justify-center rounded-[10px] py-3 text-[13px] font-bold bg-accent text-accent-fg"
              >
                Post a role →
              </a>
            </section>
            ) : null}

            {similarJobs.length > 0 ? (
              <section>
                <h2 className="text-[10px] font-extrabold uppercase tracking-[0.1em] mb-2.5 font-display text-text-secondary">
                  Similar roles
                </h2>
                <div className="space-y-2">
                  {similarJobs.map((item) => {
                    const itemBadge = getRemoteBadge(item.remotePolicy)
                    const itemSalary = formatCompactSalary(item.salaryMin, item.salaryMax, item.salaryCurrency)

                    return (
                      <Link
                        key={item.id}
                        to={publicJobPath(item)}
                        className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface px-4 py-3 no-underline transition-colors"
                      >
                        <div>
                          <p className="text-[11px] font-bold mb-0.5 font-display text-text-primary">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-text-secondary">
                            {[item.company, item.location].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {itemSalary ? (
                            <p className="text-xs font-extrabold mb-1 font-display text-text-primary">
                              {itemSalary}
                            </p>
                          ) : null}
                          <span className="text-[10px] font-bold uppercase tracking-[0.04em] px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: itemBadge.bg, color: itemBadge.fg }}>
                            {itemBadge.label}
                          </span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </section>
            ) : null}
          </aside>
        </section>
      </main>

      <footer className="py-8 border-t border-border bg-surface">
        <div className="max-w-[1280px] mx-auto px-10">
          <p className="text-xs text-center text-text-muted">
            {layoutBoard.footerText || (
              <>Powered by <span className="font-extrabold text-text-secondary">Jobuki</span></>
            )}
          </p>
        </div>
      </footer>
    </div>
  )
}

function Dot() {
  return <span className="inline-block w-[3px] h-[3px] rounded-full bg-border" />
}

function getRemoteBadge(remotePolicy: string) {
  if (remotePolicy === 'remote') return { bg: 'var(--color-badge-remote-bg)', fg: 'var(--color-badge-remote-fg)', label: 'Remote' }
  if (remotePolicy === 'hybrid') return { bg: 'var(--color-badge-hybrid-bg)', fg: 'var(--color-badge-hybrid-fg)', label: 'Hybrid' }
  return { bg: 'var(--color-badge-onsite-bg)', fg: 'var(--color-badge-onsite-fg)', label: 'On-site' }
}

function getCategoryBadge(category: string) {
  const map: Record<string, { bg: string; fg: string }> = {
    Engineering: { bg: 'var(--color-badge-category-1-bg)', fg: 'var(--color-badge-category-1-fg)' },
    Research: { bg: 'var(--color-badge-category-2-bg)', fg: 'var(--color-badge-category-2-fg)' },
    Design: { bg: 'var(--color-badge-category-3-bg)', fg: 'var(--color-badge-category-3-fg)' },
    Growth: { bg: 'var(--color-badge-category-4-bg)', fg: 'var(--color-badge-category-4-fg)' },
    Security: { bg: 'var(--color-badge-category-5-bg)', fg: 'var(--color-badge-category-5-fg)' },
  }
  return map[category] ?? { bg: 'var(--color-surface-subtle)', fg: 'var(--color-text-secondary)' }
}

function companyInitials(company: string | null | undefined) {
  const safe = (company ?? '').trim()
  if (!safe) return 'JB'
  return safe
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatCompactSalary(min: number | null, max: number | null, currency: string) {
  if (!min && !max) return null

  const symbol = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : '$'
  const compact = (value: number | null) => (value ? `${symbol}${Math.round(value / 1000)}k` : null)
  const low = compact(min)
  const high = compact(max)

  if (low && high) return `${low}–${high}`
  return low ?? high
}

function SectionBody({ children }: { children: string }) {
  const html = toSafeRichHtml(children)

  return (
    <div
      className="prose prose-slate max-w-none prose-p:text-[14px] prose-p:leading-[1.9] prose-li:text-[14px] prose-li:leading-[1.8] prose-h3:text-[10px] prose-h3:uppercase prose-h3:tracking-[0.12em] prose-h3:font-extrabold prose-h3:mt-8 prose-h3:pt-7 prose-h3:border-t"
      style={{ color: 'var(--color-text-primary)' }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function MetaRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null

  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-b-0">
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-muted">
        {label}
      </span>
      <span className="text-sm text-right text-text-primary">
        {value}
      </span>
    </div>
  )
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
