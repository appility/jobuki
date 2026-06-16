import { useLoaderData, useOutletContext, Link } from 'react-router'
import { useState } from 'react'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { getDb, jobs, boards, jobBoardListings, savedJobs } from '@jobuki/db'
import { and, desc, eq, ne } from 'drizzle-orm'
import { getAuthUser, getOptionalUser } from '../../lib/auth.server'
import { marked } from 'marked'
import { repairMojibake, sanitizeFeedHtml } from '../../lib/feed-html'
import { resolveJobBoardThemeConfig, type Board } from '@jobuki/types'
import { RichTextRenderer } from '../../components/rich-text/RichTextRenderer'
import { isTiptapDoc } from '../../lib/rich-text'
import { deriveJobCategory, getDisplayCategoryTags, resolveBoardCategories, titleCaseCategory } from '../../lib/board-categories'
import { publicJobPath } from '../../lib/public-job-path'
import { buildCandidateAuthPath } from '../../lib/auth-flow'

export async function loader(args: LoaderFunctionArgs) {
  const { params, request } = args
  const db = getDb()
  const jobId = params.jobId!

  // Find the job with its board listing
  const jobWithListing = await db.query.jobs.findFirst({
    where: eq(jobs.id, jobId),
    with: {
      listings: {
        where: eq(jobBoardListings.status, 'published'),
      },
    },
  })

  if (!jobWithListing || jobWithListing.listings.length === 0) {
    throw new Response('Not found', { status: 404 })
  }

  const listing = jobWithListing.listings[0]
  const board = await db.query.boards.findFirst({ where: eq(boards.id, listing.boardId) })
  const job = jobWithListing
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

  const clerkUserId = await getAuthUser(args)
  const user = clerkUserId ? await getOptionalUser(request) : null
  const isSaved = user ? Boolean(await db.query.savedJobs.findFirst({
    where: and(eq(savedJobs.userId, user.id), eq(savedJobs.jobId, job.id)),
  })) : false

  const similarJobs = await db
    .select({
      id: jobs.id,
      title: jobs.title,
      company: jobs.company,
      location: jobs.location,
      remotePolicy: jobs.remotePolicy,
      employmentType: jobs.employmentType,
      primaryCategory: jobs.primaryCategory,
      categoryTags: jobs.categoryTags,
      salaryMin: jobs.salaryMin,
      salaryMax: jobs.salaryMax,
      salaryCurrency: jobs.salaryCurrency,
      salaryPeriod: jobs.salaryPeriod,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
    })
    .from(jobs)
    .innerJoin(jobBoardListings, eq(jobs.id, jobBoardListings.jobId))
    .where(and(
      eq(jobBoardListings.boardId, board.id),
      eq(jobBoardListings.status, 'published'),
      ne(jobs.id, job.id),
    ))
    .then(rows => rows.map(r => r.jobs))
    .orderBy(desc(jobs.createdAt))
    .limit(3)

  return {
    job,
    board,
    similarJobs,
    isPreviewMode,
    boardCategories,
    isSaved,
    isSignedIn: Boolean(clerkUserId),
    accountType: user?.accountType ?? null,
    requestUrl: request.url,
  }
}

export const meta: MetaFunction<typeof loader> = ({ data, location }) => {
  if (!data) {
    return [
      { title: 'Job | Jobuki' },
      { name: 'description', content: 'View the role details and apply online.' },
    ]
  }

  const { job, board, requestUrl } = data
  const url = new URL(requestUrl)
  const locationPart = job.location ? ` in ${job.location}` : ''
  const title = `${job.title} | ${board.name}`
  const description = `Apply for ${job.title}${locationPart} at ${board.name}.`

  // Build canonical URL - respects custom domains and subdomains
  const canonicalUrl = location.pathname.split('?')[0] // Remove query params

  const tags: any[] = [
    { title },
    { name: 'description', content: description },
    // Canonical tag to prevent duplicate content issues across subdomains/custom domains
    { rel: 'canonical', href: canonicalUrl },
    // OG tags for social media
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: canonicalUrl },
  ]

  // Add company logo as OG image if available
  if (job.companyLogoUrl) {
    tags.push({ property: 'og:image', content: job.companyLogoUrl })
    tags.push({ property: 'og:image:alt', content: `${job.company} logo` })
  } else if (board.logoUrl) {
    // Fallback to board logo
    tags.push({ property: 'og:image', content: board.logoUrl })
    tags.push({ property: 'og:image:alt', content: `${board.name} logo` })
  }

  // JSON-LD: Breadcrumb navigation (dynamic for each board)
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${url.protocol}//${url.hostname}/`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Jobs',
        item: `${url.protocol}//${url.hostname}/jobs`,
      },
      ...(job.primaryCategory ? [{
        '@type': 'ListItem' as const,
        position: 3,
        name: job.primaryCategory.charAt(0).toUpperCase() + job.primaryCategory.slice(1),
        item: `${url.protocol}//${url.hostname}/jobs/category/${encodeURIComponent(job.primaryCategory)}`,
      }] : []),
      {
        '@type': 'ListItem',
        position: (job.primaryCategory ? 4 : 3),
        name: job.title,
        item: canonicalUrl,
      },
    ],
  }

  tags.push({
    tag: 'script',
    props: {
      type: 'application/ld+json',
      dangerouslySetInnerHTML: { __html: JSON.stringify(breadcrumbData) },
    },
  })

  // JSON-LD: Job posting schema
  const jobPostingData = {
    '@context': 'https://schema.org/',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    url: canonicalUrl,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company || board.name,
      ...(board.logoUrl && { logo: board.logoUrl }),
      sameAs: board.customDomain ? `https://${board.customDomain}` : undefined,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'GB', // Adjust based on your data
        ...(job.location && { addressLocality: job.location }),
      },
    },
    ...(job.salaryMin && job.salaryMax && {
      baseSalary: {
        '@type': 'PriceSpecification',
        priceCurrency: job.salaryCurrency || 'GBP',
        price: `${job.salaryMin}-${job.salaryMax}`,
        ...(job.salaryPeriod && { priceValidUntil: job.salaryPeriod }),
      },
    }),
    employmentType: job.employmentType?.toUpperCase() || 'FULL_TIME',
    datePosted: job.createdAt?.toISOString(),
    ...(job.applicationDeadline && {
      validThrough: new Date(job.applicationDeadline).toISOString(),
    }),
  }

  tags.push({
    tag: 'script',
    props: {
      type: 'application/ld+json',
      dangerouslySetInnerHTML: { __html: JSON.stringify(jobPostingData) },
    },
  })

  return tags
}

const REMOTE_LABEL: Record<string, string> = {
  remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site',
}
const TYPE_LABEL: Record<string, string> = {
  'full-time': 'Full-time', 'part-time': 'Part-time',
  contract: 'Contract', freelance: 'Freelance', internship: 'Internship',
}

export default function JobDetail() {
  const { job, board, similarJobs, isPreviewMode, boardCategories, isSaved: initialSaved, isSignedIn, accountType } = useLoaderData<typeof loader>()
  const outletContext = useOutletContext<{ board?: Board }>()
  const [saved, setSaved] = useState(initialSaved)
  const [savePending, setSavePending] = useState(false)
  const needsJobSeekerAuth = !isSignedIn || accountType === 'publisher' || accountType === 'board_creator'
  const authPath = buildCandidateAuthPath({ redirectTo: `/apply/${job.id}` })
  const alertAuthPath = buildCandidateAuthPath({ redirectTo: '/candidate/alerts' })
  const applyHref = needsJobSeekerAuth ? authPath : `/apply/${job.id}`
  const alertPath = needsJobSeekerAuth ? alertAuthPath : '/candidate/alerts'
  const applyLabel = 'Apply'
  const alertLabel = 'Create email alert'

  async function toggleSave() {
    if (!isSignedIn) {
      window.location.href = authPath
      return
    }
    setSavePending(true)
    try {
      const fd = new FormData()
      fd.set('jobId', job.id)
      fd.set('boardId', job.boardId)
      fd.set('intent', saved ? 'unsave' : 'save')
      const res = await fetch('/api/jobs/save', { method: 'POST', body: fd, credentials: 'include' })
      const data = await res.json()
      if (data.unauthenticated) {
        window.location.href = authPath
        return
      }
      if (data.ok) setSaved(s => !s)
    } finally {
      setSavePending(false)
    }
  }

  const salary = (job.salaryMin || job.salaryMax)
    ? [
        job.salaryMin ? `${job.salaryCurrency}${job.salaryMin.toLocaleString()}` : null,
        job.salaryMax ? `${job.salaryCurrency}${job.salaryMax.toLocaleString()}` : null,
      ].filter(Boolean).join(' – ') + (job.salaryPeriod ? ` / ${job.salaryPeriod}` : '')
    : null

  const postedAt = job.createdAt ? formatDate(job.createdAt) : null
  const categoryLabel = titleCaseCategory(deriveJobCategory(job, boardCategories))
  const skillTags = getDisplayCategoryTags(job, boardCategories, 3)
  const remoteBadge = getRemoteBadge(job.remotePolicy)
  const categoryBadge = getCategoryBadge(categoryLabel)
  const compactSalary = formatCompactSalary(job.salaryMin, job.salaryMax, job.salaryCurrency)
  const externalApplyHref = job.externalApplyUrl || job.externalListingUrl
  const sourceHref = externalApplyHref
    || extractFirstExternalHref(job.description)
    || extractFirstExternalHref(
      typeof job.descriptionJson === 'string'
        ? job.descriptionJson
        : job.descriptionJson
          ? JSON.stringify(job.descriptionJson)
          : null,
    )

  return (
    <div
      className="min-h-screen font-body"
      style={{
        background: 'var(--color-background)',
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

              <div className="mb-4">
                <h1
                  className="text-[23px] font-extrabold leading-[1.15] tracking-[-0.03em] mb-2 font-display text-text-primary"
                >
                  {job.title}
                </h1>

                <div className="flex items-center gap-2.5 text-[13px] flex-wrap text-text-secondary">
                  {job.company ? <span className="text-text-primary font-bold">{job.company}</span> : null}
                  {job.company && job.location ? <Dot /> : null}
                  {job.location ? <span>{job.location}</span> : null}
                  {job.company || job.location ? <Dot /> : null}
                  <span className="text-border-strong font-semibold">{postedAt || 'Recently posted'}</span>
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
                    title="See all jobs with this tag"
                    aria-label={`See all jobs with tag ${tag}`}
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
              <Link
                to={applyHref}
                className="w-full btn-primary inline-flex justify-center py-3.5 text-sm font-bold mb-2"
              >
                {applyLabel}
              </Link>
              <button
                type="button"
                onClick={toggleSave}
                disabled={savePending}
                className="w-full py-2.5 text-[13px] font-semibold rounded-xl border transition-all"
                style={{
                  borderColor: saved ? 'var(--color-primary)' : 'var(--color-border)',
                  color: saved ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  backgroundColor: saved ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'transparent',
                }}
              >
                {saved ? '♥ Saved' : '♡ Save role'}
              </button>
              <Link
                to={alertPath}
                className="w-full mt-2 inline-flex items-center justify-center py-2.5 text-[13px] font-semibold rounded-xl border no-underline"
                style={{
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  backgroundColor: 'transparent',
                }}
              >
                {alertLabel}
              </Link>
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
              {sourceHref ? (
                <div className="pt-3 mt-1">
                  <a
                    href={sourceHref}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[11px] font-semibold no-underline hover:underline"
                    style={{ color: 'var(--color-primary)' }}
                  >
                    View source ↗
                  </a>
                </div>
              ) : null}
            </section>

            {!isPreviewMode && !isSignedIn ? (
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

function extractFirstExternalHref(input: string | null | undefined) {
  if (!input) return null

  const anchorMatch = input.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/i)
  if (anchorMatch?.[1] && /^https?:\/\//i.test(anchorMatch[1])) {
    return anchorMatch[1]
  }

  const urlMatch = input.match(/https?:\/\/[^\s"'<>]+/i)
  return urlMatch?.[0] ?? null
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
