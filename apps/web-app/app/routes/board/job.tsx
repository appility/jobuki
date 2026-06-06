import { useLoaderData, useOutletContext, Link } from 'react-router'
import type { LoaderFunctionArgs, MetaFunction } from 'react-router'
import { getDb, jobs, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import type { Board } from '@jobuki/types'

export async function loader({ params }: LoaderFunctionArgs) {
  const db = getDb()
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, params.jobId!) })
  if (!job || job.status !== 'published') throw new Response('Not found', { status: 404 })
  const board = await db.query.boards.findFirst({ where: eq(boards.id, job.boardId) })
  if (!board) throw new Response('Not found', { status: 404 })
  return { job, board }
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
  const { job, board } = useLoaderData<typeof loader>()
  const { board: layoutBoard } = useOutletContext<{ board: Board }>()

  const salary = (job.salaryMin || job.salaryMax)
    ? [
        job.salaryMin ? `${job.salaryCurrency}${job.salaryMin.toLocaleString()}` : null,
        job.salaryMax ? `${job.salaryCurrency}${job.salaryMax.toLocaleString()}` : null,
      ].filter(Boolean).join(' – ') + (job.salaryPeriod ? ` / ${job.salaryPeriod}` : '')
    : null

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)', fontFamily: 'var(--font-body)' }}>

      <main className="board-container py-12">
        <div className="max-w-2xl">

          {/* Job header */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold mb-3 leading-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
              {job.title}
            </h1>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-2 mb-4">
              {job.company && (
                <Chip>{job.company}</Chip>
              )}
              {job.location && (
                <Chip icon="📍">{job.location}</Chip>
              )}
              <Chip accent>{REMOTE_LABEL[job.remotePolicy] ?? job.remotePolicy}</Chip>
              <Chip>{TYPE_LABEL[job.employmentType] ?? job.employmentType}</Chip>
              {salary && <Chip icon="💰">{salary}</Chip>}
            </div>

            <Link to={`/apply/${job.id}`}
              className="btn-primary inline-flex mt-2">
              Apply for this role →
            </Link>
          </div>

          {/* Divider */}
          <div style={{ borderTop: '1px solid var(--color-border)', marginBottom: '2rem' }} />

          {/* Body sections */}
          {job.description && (
            <Section title="About the role">
              {job.description}
            </Section>
          )}
          {job.requirements && (
            <Section title="Requirements">
              {job.requirements}
            </Section>
          )}
          {job.benefits && (
            <Section title="What we offer">
              {job.benefits}
            </Section>
          )}

          <div style={{ borderTop: '1px solid var(--color-border)', marginTop: '2.5rem', paddingTop: '2rem' }}>
            <Link to={`/apply/${job.id}`} className="btn-primary">
              Apply for this role →
            </Link>
          </div>
        </div>
      </main>

      <footer className="board-container py-8"
        style={{ borderTop: '1px solid var(--color-border)' }}>
        <p className="text-xs text-center" style={{ color: 'var(--color-text-muted)' }}>
          {layoutBoard.footerText || (
            <>Powered by <span className="font-extrabold" style={{ color: 'var(--color-text-secondary)' }}>Jobuki</span></>
          )}
        </p>
      </footer>
    </div>
  )
}

function Chip({ children, icon, accent }: { children: React.ReactNode; icon?: string; accent?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1 rounded-full"
      style={accent ? {
        backgroundColor: 'color-mix(in srgb, var(--color-primary) 10%, transparent)',
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

function Section({ title, children }: { title: string; children: string }) {
  const html = toSafeRichHtml(children)

  return (
    <section className="mb-8">
      <h2 className="text-base font-bold mb-3"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text-primary)' }}>
        {title}
      </h2>
      <div
        className="text-sm leading-relaxed"
        style={{ color: 'var(--color-text-secondary)' }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  )
}

function toSafeRichHtml(input: string) {
  const markdownHtml = marked.parse(input, { breaks: true, gfm: true })
  return sanitizeHtml(markdownHtml as string, {
    allowedTags: [
      'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span',
      'a',
    ],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      div: ['class'],
      span: ['class'],
      code: ['class'],
      '*': ['id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer', target: '_blank' }, true),
    },
  })
}
