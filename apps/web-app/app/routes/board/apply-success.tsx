import { Link, useLoaderData, useOutletContext } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, jobs, candidateProfiles } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import type { Board } from '@jobuki/types'
import { getOptionalUser } from '../../lib/auth.server'
import { deriveJobCategory } from '../../lib/board-categories'

type InterviewTip = { q: string; hint: string }

async function generateInterviewTips(jobTitle: string, company: string | null, description: string): Promise<InterviewTip[]> {
  const key = process.env.OPENAI_API_KEY
  if (!key) return []
  try {
    const OpenAI = (await import('openai')).default
    const client = new OpenAI({ apiKey: key, project: process.env.OPENAI_PROJECT_ID })
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Give me 4 likely interview questions for this role, each with a one-line preparation hint. Be specific to the role, not generic.

Role: ${jobTitle} at ${company ?? 'this company'}
Description extract: ${description.slice(0, 800)}

Return JSON: { "questions": [{ "q": "question", "hint": "brief prep hint" }] }`,
      }],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    })
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? '{}')
    return Array.isArray(parsed.questions) ? parsed.questions.slice(0, 4) : []
  } catch {
    return []
  }
}

function followUpAdvice(company: string | null): { days: number; message: string } {
  return {
    days: 10,
    message: `If you haven't heard from ${company ?? 'the team'} within 10 business days, send a brief, polite follow-up email referencing the role and confirming your interest.`,
  }
}

const CATEGORY_RESOURCES: Record<string, { label: string; url: string; hint: string }[]> = {
  engineering: [
    { label: 'LeetCode', url: 'https://leetcode.com', hint: 'Coding challenges' },
    { label: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', hint: 'Architecture prep' },
  ],
  product: [
    { label: 'Lenny\'s Newsletter', url: 'https://www.lennysnewsletter.com', hint: 'PM interview prep' },
    { label: 'Exponent', url: 'https://www.tryexponent.com', hint: 'PM mock interviews' },
  ],
  design: [
    { label: 'UX Portfolio Tips', url: 'https://www.nngroup.com/articles/ux-portfolio-study-guide/', hint: 'Nielsen Norman' },
    { label: 'Design Exercise Guide', url: 'https://www.designercize.com', hint: 'Practice prompts' },
  ],
  data: [
    { label: 'StrataScratch', url: 'https://www.stratascratch.com', hint: 'SQL & analytics practice' },
    { label: 'Kaggle', url: 'https://www.kaggle.com', hint: 'Datasets & competitions' },
  ],
}

export async function loader({ params, request }: LoaderFunctionArgs) {
  const db = getDb()
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, params.jobId!) })
  if (!job) throw new Response('Not found', { status: 404 })

  const user = await getOptionalUser(request)
  const profile = user
    ? await db.query.candidateProfiles.findFirst({ where: eq(candidateProfiles.userId, user.id) })
    : null

  const category = deriveJobCategory(job, [])
  const [interviewTips] = await Promise.all([
    generateInterviewTips(job.title, job.company, job.description),
  ])

  const followUp = followUpAdvice(job.company)
  const resources = CATEGORY_RESOURCES[category] ?? []

  return { job, profile, interviewTips, followUp, resources, category }
}

export default function ApplySuccess() {
  const { job, profile, interviewTips, followUp, resources } = useLoaderData<typeof loader>()
  const { board } = useOutletContext<{ board: Board }>()
  const isExternal = Boolean(job.externalApplyUrl || job.externalListingUrl)

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-[860px] mx-auto px-6 lg:px-10 pt-9 pb-20">

        {/* Confirmation */}
        <div className="rounded-[20px] border border-border bg-surface px-8 py-8 mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-5 text-lg font-bold"
            style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            ✓
          </div>
          <h1 className="text-2xl font-extrabold font-display mb-2" style={{ color: 'var(--color-text-primary)' }}>
            {isExternal ? 'Good luck!' : 'Application submitted!'}
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {isExternal
              ? `You've opened the application for ${job.title}${job.company ? ` at ${job.company}` : ''}. It's been saved to your applications.`
              : `Your application for ${job.title}${job.company ? ` at ${job.company}` : ''} has been sent.`}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Interview questions */}
          {interviewTips.length > 0 && (
            <div className="rounded-[18px] border border-border bg-surface px-7 py-6 md:col-span-2">
              <h2 className="text-[10px] font-extrabold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                Likely interview questions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {interviewTips.map((tip, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ backgroundColor: 'var(--color-surface-subtle)' }}>
                    <p className="text-sm font-semibold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>{tip.q}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{tip.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up advice */}
          <div className="rounded-[18px] border border-border bg-surface px-7 py-6">
            <h2 className="text-[10px] font-extrabold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--color-text-secondary)' }}>
              When to follow up
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-primary)' }}>
              {followUp.message}
            </p>
            <p className="text-xs mt-3" style={{ color: 'var(--color-text-muted)' }}>
              Keep your email short — one paragraph, restate the role title and your enthusiasm.
            </p>
          </div>

          {/* Profile nudge or resources */}
          {!profile ? (
            <div className="rounded-[18px] border border-border bg-surface px-7 py-6 flex flex-col justify-between">
              <div>
                <h2 className="text-[10px] font-extrabold uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                  Speed up future applications
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Add your profile once and get a personalised cover letter and match analysis on every role you apply to.
                </p>
              </div>
              <Link to="/candidate/profile" className="btn-primary mt-5 text-sm inline-flex justify-center py-2.5">
                Set up profile →
              </Link>
            </div>
          ) : resources.length > 0 ? (
            <div className="rounded-[18px] border border-border bg-surface px-7 py-6">
              <h2 className="text-[10px] font-extrabold uppercase tracking-[0.12em] mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                Prep resources
              </h2>
              <div className="space-y-3">
                {resources.map(r => (
                  <a key={r.url} href={r.url} target="_blank" rel="noreferrer"
                    className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 no-underline hover:-translate-y-px transition-all"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{r.label}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{r.hint}</p>
                    </div>
                    <span style={{ color: 'var(--color-text-muted)' }}>↗</span>
                  </a>
                ))}
              </div>
            </div>
          ) : null}

          {/* Glassdoor company link */}
          {job.company && (
            <a
              href={`https://www.glassdoor.co.uk/Search/results.htm?keyword=${encodeURIComponent(job.company)}`}
              target="_blank" rel="noreferrer"
              className="rounded-[18px] border border-border bg-surface px-7 py-6 no-underline hover:-translate-y-px transition-all block"
            >
              <h2 className="text-[10px] font-extrabold uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                Research the company
              </h2>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                {job.company} on Glassdoor ↗
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Reviews, interview questions, and salary data
              </p>
            </a>
          )}

        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mt-8">
          <Link to="/jobs" className="btn-primary text-sm px-5 py-2.5">Browse more roles</Link>
          <Link to="/candidate/applications" className="btn-outline text-sm px-5 py-2.5">My applications</Link>
          <Link to="/candidate/saved" className="btn-outline text-sm px-5 py-2.5">Saved jobs</Link>
        </div>

      </main>

      <footer className="board-container py-8 border-t border-border">
        <p className="text-xs text-center text-text-muted">
          {board.footerText || (<>Powered by <span className="font-extrabold text-text-secondary">Jobuki</span></>)}
        </p>
      </footer>
    </div>
  )
}
