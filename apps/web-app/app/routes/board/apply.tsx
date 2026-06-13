import { useLoaderData, useOutletContext, Link, useNavigate } from 'react-router'
import { useState, useRef } from 'react'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, jobs, savedJobs, candidateProfiles } from '@jobuki/db'
import { and, eq } from 'drizzle-orm'
import type { Board } from '@jobuki/types'
import { requireUser } from '../../lib/auth.server'
import { parseCvFromUrl } from '../../lib/cv-parser.server'
import { generateApplyContent } from '../../lib/apply-ai.server'
import { deriveJobCategory } from '../../lib/board-categories'
import { buildJobSeekerAuthPath } from '../../lib/auth-flow'

export async function loader(args: LoaderFunctionArgs) {
  const { params } = args
  const user = await requireUser(args, { type: 'job-seeker' })
  const db = getDb()
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, params.jobId!) })
  if (!job || job.status !== 'published') throw new Response('Not found', { status: 404 })

  const externalUrl = job.externalApplyUrl || job.externalListingUrl || null
  const isExternal = Boolean(externalUrl)

  let profile = null
  let isSaved = false
  let aiContent = null

  const [savedRow, profileRow] = await Promise.all([
    db.query.savedJobs.findFirst({
      where: and(eq(savedJobs.userId, user.id), eq(savedJobs.jobId, job.id)),
    }),
    db.query.candidateProfiles.findFirst({
      where: eq(candidateProfiles.userId, user.id),
    }),
  ])
  isSaved = Boolean(savedRow)
  profile = profileRow ?? null

  // Generate AI content — use cached tips if no profile, otherwise always personalise
  const cvText = profile?.cvUrl ? await parseCvFromUrl(profile.cvUrl) : null

  if (!profile && job.applicationTips) {
    aiContent = { tips: job.applicationTips.tips, coverLetter: undefined, matchSummary: undefined }
  } else {
    aiContent = await generateApplyContent(
      {
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
        category: deriveJobCategory(job, []),
      },
      profile ? {
        name: profile.name,
        headline: profile.headline,
        bio: profile.bio,
        skills: profile.skills ?? [],
        cvText,
      } : undefined
    )

    // Cache generic tips on the job row (no profile = not personalised)
    if (!profile && aiContent.tips.length > 0) {
      await db.update(jobs)
        .set({ applicationTips: { tips: aiContent.tips, generatedAt: new Date().toISOString() } })
        .where(eq(jobs.id, job.id))
    }
  }

  const category = deriveJobCategory(job, [])

  return { job, user, profile, isSaved, aiContent, externalUrl, isExternal, category, cvText: cvText ? true : false }
}

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function buildInterviewLinks(company: string | null, title: string, category: string | null) {
  const companySlug = company ? toSlug(company) : ''
  const companyQ = company ? encodeURIComponent(company) : ''
  const linkedinSlug = companySlug

  const glassdoor = {
    label: company ? `${company} on Glassdoor` : 'Glassdoor',
    url: company
      ? `https://www.glassdoor.co.uk/Search/results.htm?keyword=${companyQ}&locT=N&locId=1&jobType=all`
      : 'https://www.glassdoor.co.uk',
    hint: 'Reviews & interview questions',
  }

  const linkedin = {
    label: company ? `${company} on LinkedIn` : 'LinkedIn',
    url: company
      ? `https://www.linkedin.com/company/${linkedinSlug}/people/`
      : 'https://www.linkedin.com',
    hint: company ? 'Browse the team' : 'Research the team',
  }

  const titleLower = title.toLowerCase()
  const isDistributed = titleLower.includes('distributed') || titleLower.includes('platform') || titleLower.includes('infra')
  const sdpSection = isDistributed
    ? '#distributed-systems'
    : titleLower.includes('mobile') ? '#communication' : ''

  const byCategory: Record<string, Array<{ label: string; url: string; hint: string }>> = {
    engineering: [
      {
        label: company ? `${company} on LeetCode` : 'LeetCode',
        url: company
          ? `https://leetcode.com/company/${companySlug}/`
          : 'https://leetcode.com',
        hint: company ? 'Company-tagged questions' : 'Coding challenges',
      },
      {
        label: 'System Design Primer',
        url: `https://github.com/donnemartin/system-design-primer${sdpSection}`,
        hint: 'Architecture & system design prep',
      },
      glassdoor,
      linkedin,
    ],
    product: [
      {
        label: 'Lenny\'s Interview Guide',
        url: 'https://www.lennysnewsletter.com/p/how-to-get-a-pm-job',
        hint: 'PM interview prep',
      },
      {
        label: 'Exponent PM Prep',
        url: 'https://www.tryexponent.com/courses/pm',
        hint: 'Mock interviews & frameworks',
      },
      glassdoor,
      linkedin,
    ],
    design: [
      {
        label: 'Portfolio Checklist',
        url: 'https://www.nngroup.com/articles/ux-portfolio-study-guide/',
        hint: 'Nielsen Norman guide',
      },
      {
        label: company ? `${company} on Dribbble` : 'Dribbble',
        url: company
          ? `https://dribbble.com/search/${companyQ}`
          : 'https://dribbble.com',
        hint: 'Brand & design inspiration',
      },
      glassdoor,
      linkedin,
    ],
    data: [
      {
        label: 'StrataScratch',
        url: 'https://www.stratascratch.com',
        hint: 'Real data science interview questions',
      },
      {
        label: 'Mode SQL Tutorial',
        url: 'https://mode.com/sql-tutorial/',
        hint: 'SQL practice',
      },
      glassdoor,
      linkedin,
    ],
  }

  return byCategory[category ?? ''] ?? [glassdoor, linkedin]
}

export default function ApplyPrep() {
  const { job, user, profile, isSaved, aiContent, externalUrl, isExternal, category } = useLoaderData<typeof loader>()
  const { board } = useOutletContext<{ board: Board }>()

  const [saved, setSaved] = useState(isSaved)
  const [savePending, setSavePending] = useState(false)
  const [coverLetter, setCoverLetter] = useState(aiContent?.coverLetter ?? '')
  const [copied, setCopied] = useState(false)
  const [checklist, setChecklist] = useState({ cv: false, linkedin: false, coverLetter: false })
  const [applying, setApplying] = useState(false)
  const coverLetterRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()
  const authPath = buildJobSeekerAuthPath({ redirectTo: `/apply/${job.id}` })

  const interviewLinks = buildInterviewLinks(job.company, job.title, category)

  const allChecked = checklist.cv && checklist.linkedin && checklist.coverLetter

  async function toggleSave() {
    setSavePending(true)
    try {
      const fd = new FormData()
      fd.set('jobId', job.id)
      fd.set('boardId', job.boardId)
      fd.set('intent', saved ? 'unsave' : 'save')
      const response = await fetch('/api/save-job', { method: 'POST', body: fd, credentials: 'include' })
      const data = await response.json().catch(() => null)
      if (data?.unauthenticated) {
        window.location.href = authPath
        return
      }
      if (data?.ok) {
        setSaved(s => !s)
      }
    } finally {
      setSavePending(false)
    }
  }

  async function handleApply() {
    if (!externalUrl) return
    setApplying(true)
    const fd = new FormData()
    fd.set('jobId', job.id)
    fd.set('boardId', job.boardId)
    // Log the application and auto-save the job — both non-blocking
    fetch('/api/log-apply', { method: 'POST', body: fd, credentials: 'include' }).catch(() => {})
    if (!saved) {
      const savefd = new FormData()
      savefd.set('jobId', job.id)
      savefd.set('boardId', job.boardId)
      savefd.set('intent', 'save')
      fetch('/api/save-job', { method: 'POST', body: savefd, credentials: 'include' })
        .then(async (response) => {
          const data = await response.json().catch(() => null)
          if (data?.ok) setSaved(true)
        })
        .catch(() => {})
    }
    window.open(externalUrl, '_blank', 'noopener,noreferrer')
    navigate(`/apply/${job.id}/success`)
  }

  function copyLetter() {
    navigator.clipboard.writeText(coverLetter)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const applyHref = isExternal ? undefined : `/apply/${job.id}/form`

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[1100px] mx-auto px-6 lg:px-10 pt-8 pb-20">

        <Link to="/jobs" className="inline-flex items-center gap-2 text-[13px] font-semibold rounded-[10px] px-4 py-2 border mb-7 text-text-secondary bg-surface border-border">
          ← Back to all roles
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">

          {/* ── Main column ── */}
          <div className="space-y-6">

            {/* Job header */}
            <div className="rounded-[20px] border border-border bg-surface px-8 py-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted mb-1">
                    {job.company ?? board.name}
                  </p>
                  <h1 className="text-2xl font-extrabold font-display text-text-primary leading-tight mb-2">
                    {job.title}
                  </h1>
                  <p className="text-sm text-text-secondary">
                    {[job.location, job.remotePolicy === 'remote' ? 'Remote' : job.remotePolicy === 'hybrid' ? 'Hybrid' : null]
                      .filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={user ? toggleSave : undefined}
                  disabled={savePending}
                  title={user ? (saved ? 'Unsave job' : 'Save job') : 'Sign in to save'}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold transition-all"
                  style={{
                    borderColor: saved ? 'var(--color-primary)' : 'var(--color-border)',
                    color: saved ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    backgroundColor: saved ? 'color-mix(in srgb, var(--color-primary) 8%, var(--color-surface))' : 'var(--color-surface)',
                  }}
                >
                  {saved ? '♥ Saved' : '♡ Save'}
                </button>
              </div>
            </div>

            {/* Match summary */}
            {aiContent?.matchSummary && (
              <div className="rounded-[18px] border border-border bg-surface px-7 py-6">
                <h2 className="text-[10px] font-extrabold uppercase tracking-[0.12em] mb-3 text-text-secondary">
                  Profile Match
                </h2>
                <p className="text-sm leading-relaxed text-text-primary">{aiContent.matchSummary}</p>
              </div>
            )}

            {/* AI Tips */}
            {aiContent?.tips && aiContent.tips.length > 0 && (
              <div className="rounded-[18px] border border-border bg-surface px-7 py-6">
                <h2 className="text-[10px] font-extrabold uppercase tracking-[0.12em] mb-4 text-text-secondary">
                  Application Tips
                </h2>
                <ul className="space-y-3">
                  {aiContent.tips.map((tip: string, i: number) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-text-primary">
                      <span className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5"
                        style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, transparent)', color: 'var(--color-primary)' }}>
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{tip}</span>
                    </li>
                  ))}
                </ul>
                {!profile && (
                  <p className="mt-4 text-xs text-text-muted border-t border-border pt-4">
                    <Link to="/candidate/profile" className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                      Complete your profile
                    </Link>{' '}
                    to get personalised tips and a cover letter tailored to your background.
                  </p>
                )}
              </div>
            )}

            {/* Cover letter */}
            {aiContent?.coverLetter && (
              <div className="rounded-[18px] border border-border bg-surface px-7 py-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-text-secondary">
                    Cover Letter Draft
                  </h2>
                  <button
                    type="button"
                    onClick={copyLetter}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
                    style={{ borderColor: 'var(--color-border)', color: copied ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <textarea
                  ref={coverLetterRef}
                  value={coverLetter}
                  onChange={e => setCoverLetter(e.target.value)}
                  rows={14}
                  className="w-full text-sm leading-relaxed rounded-xl border p-4 resize-y outline-none focus:ring-2 transition-all"
                  style={{
                    borderColor: 'var(--color-border)',
                    backgroundColor: 'var(--color-surface-subtle)',
                    color: 'var(--color-text-primary)',
                  }}
                />
                <p className="text-[11px] text-text-muted mt-2">Edit freely — this is your draft to customise.</p>
              </div>
            )}

            {/* Interview prep */}
            <div className="rounded-[18px] border border-border bg-surface px-7 py-6">
              <h2 className="text-[10px] font-extrabold uppercase tracking-[0.12em] mb-4 text-text-secondary">
                Interview Prep
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {interviewLinks.map(link => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 no-underline transition-all hover:-translate-y-px"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)' }}
                  >
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{link.label}</p>
                      <p className="text-xs text-text-muted">{link.hint}</p>
                    </div>
                    <span className="text-text-muted text-sm">↗</span>
                  </a>
                ))}
              </div>
            </div>

            {/* Checklist */}
            <div className="rounded-[18px] border border-border bg-surface px-7 py-6">
              <h2 className="text-[10px] font-extrabold uppercase tracking-[0.12em] mb-4 text-text-secondary">
                Before You Apply
              </h2>
              <div className="space-y-3">
                {[
                  { key: 'cv', label: 'CV is up to date', hint: profile?.cvUrl ? `Saved: ${profile.cvUrl.slice(0, 40)}…` : 'Add your CV URL to your profile' },
                  { key: 'linkedin', label: 'LinkedIn profile is current', hint: profile?.linkedinUrl ? profile.linkedinUrl : 'Make sure your LinkedIn is up to date' },
                  { key: 'coverLetter', label: 'Cover letter ready', hint: aiContent?.coverLetter ? 'Your draft is above — edit and copy it' : 'Prepare a tailored cover letter' },
                ].map(item => (
                  <label key={item.key} className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checklist[item.key as keyof typeof checklist]}
                      onChange={e => setChecklist(c => ({ ...c, [item.key]: e.target.checked }))}
                      className="mt-0.5 shrink-0"
                    />
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                      <p className="text-xs text-text-muted">{item.hint}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <aside className="space-y-4 lg:sticky lg:top-20">

            {/* Apply CTA */}
            <div className="rounded-[18px] border border-border bg-surface p-6">
              <h2 className="text-[10px] font-extrabold uppercase tracking-[0.1em] mb-4 text-text-secondary">
                Ready to apply?
              </h2>
              {!allChecked && (
                <p className="text-xs text-text-muted mb-4">
                  Tick the checklist when you're ready — or apply now if you're good to go.
                </p>
              )}
              {isExternal ? (
                <button
                  type="button"
                  onClick={handleApply}
                  disabled={applying}
                  className="w-full btn-primary py-3.5 text-sm font-bold"
                >
                  {applying ? 'Opening…' : 'Apply'}
                </button>
              ) : (
                <Link to={applyHref!} className="w-full btn-primary inline-flex justify-center py-3.5 text-sm font-bold">
                  Apply
                </Link>
              )}
              {!user && (
                <p className="text-xs text-text-muted mt-3 text-center">
                  <Link to={authPath} className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                    Sign in
                  </Link>{' '}
                  to save this job and get a personalised cover letter.
                </p>
              )}
            </div>

            {/* Job details */}
            <div className="rounded-[18px] border border-border bg-surface p-6">
              <h2 className="text-[10px] font-extrabold uppercase tracking-[0.1em] mb-3 text-text-secondary">Details</h2>
              {[
                { label: 'Company', value: job.company },
                { label: 'Location', value: job.location },
                { label: 'Type', value: job.employmentType },
                { label: 'Remote', value: job.remotePolicy },
              ].filter(r => r.value).map(row => (
                <div key={row.label} className="flex justify-between py-2 border-b border-border last:border-0">
                  <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-text-muted">{row.label}</span>
                  <span className="text-sm text-text-primary capitalize">{row.value}</span>
                </div>
              ))}
            </div>

            {/* Profile nudge */}
            {user && !profile && (
              <div className="rounded-[18px] border border-border p-5 text-center"
                style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, var(--color-surface))' }}>
                <p className="text-sm font-semibold text-text-primary mb-1">Complete your profile</p>
                <p className="text-xs text-text-muted mb-3">Get a personalised cover letter and match analysis.</p>
                <Link to="/candidate/profile" className="btn-primary text-xs px-4 py-2">
                  Set up profile →
                </Link>
              </div>
            )}

          </aside>
        </div>
      </main>

      <footer className="board-container py-8 border-t border-border">
        <p className="text-xs text-center text-text-muted">
          {board.footerText || (
            <>Powered by <span className="font-extrabold text-text-secondary">Jobuki</span></>
          )}
        </p>
      </footer>
    </div>
  )
}
