import { useState } from 'react'
import { useLoaderData, useFetcher, Link } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace } from '../../../lib/auth.server'
import { runIngest } from '../../../lib/ingest-pipeline.server'
import { getIndustries, getIndustryCategories, getIndustryDisplayName } from '../../../lib/category-config'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  return { board }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)

  const form = await args.request.formData()
  const g = (k: string) => (form.get(k) as string ?? '').trim()

  try {
    const result = await runIngest({
      source: 'cryptojobslist',
      searchTerm: g('searchTerm') || undefined,
      industry: g('industry') || undefined,
      category: g('category') || undefined,
      limit: Number(g('limit')) || 200,
      boardId: board.id,
      dryRun: g('intent') === 'preview',
      previewPage: Number(g('previewPage')) || 1,
    })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

// ── Constants ──────────────────────────────────────────────────────────

const REMOTE_LABEL: Record<string, string> = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'On-site' }
const TYPE_LABEL: Record<string, string> = { 'full-time': 'Full-time', 'part-time': 'Part-time', contract: 'Contract', freelance: 'Freelance', internship: 'Internship' }
const INPUT = 'w-full px-3 py-2.5 rounded-xl text-sm border'
const INPUT_STYLE = { borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-primary)' }

// ── Component ──────────────────────────────────────────────────────────

export default function BoardImport() {
  const { board } = useLoaderData<typeof loader>()
  const fetcher = useFetcher<typeof action>()

  const [industry, setIndustry] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [category, setCategory] = useState('')
  const [limit, setLimit] = useState('200')
  const [previewPage, setPreviewPage] = useState(1)

  const availableCategories = industry ? getIndustryCategories(industry) : []

  const data = fetcher.data as any
  const loading = fetcher.state !== 'idle'
  const preview = data?.dryRun ? data : null
  const importResult = data && !data.dryRun && data.ok ? data : null
  const error = data?.ok === false ? (data.error ?? 'Something went wrong') : null

  function submit(intent: 'preview' | 'import', page = 1) {
    setPreviewPage(page)
    fetcher.submit(
      { intent, industry, searchTerm, category, limit, previewPage: String(page) },
      { method: 'post' }
    )
  }

  return (
    <div className="w-full p-8 max-w-3xl">
      <Link to={`/dashboard/boards/${board.id}`}
        className="text-sm no-underline block mb-4" style={{ color: 'var(--color-text-muted)' }}>
        ← {board.name}
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
          Import jobs
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Pull jobs from external sources into <strong>{board.name}</strong>. Preview results before importing.
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-[18px] border p-5 mb-5 space-y-4" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.06em] mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Limit</label>
            <select value={limit} onChange={e => setLimit(e.target.value)} className={INPUT} style={INPUT_STYLE}>
              <option value="50">50 jobs</option>
              <option value="100">100 jobs</option>
              <option value="200">200 jobs</option>
              <option value="500">500 jobs</option>
              <option value="1000">1000 jobs</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.06em] mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Industry (optional)</label>
            <select value={industry} onChange={e => {
              setIndustry(e.target.value)
              setCategory('')
            }} className={INPUT} style={INPUT_STYLE}>
              <option value="">Any industry</option>
              {getIndustries().map(ind => (
                <option key={ind} value={ind}>
                  {getIndustryDisplayName(ind)}
                </option>
              ))}
            </select>
          </div>
          {industry && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-[0.06em] mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Category (optional)</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className={INPUT} style={INPUT_STYLE}>
                <option value="">All categories</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.06em] mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Search term (optional)</label>
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={INPUT}
              style={INPUT_STYLE}
              placeholder="e.g. typescript, london, remote…"
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-[0.06em] mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Location (optional)</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              className={INPUT}
              style={INPUT_STYLE}
              placeholder="e.g. london, berlin, new york…"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => submit('preview', 1)}
          disabled={loading}
          className="btn-primary text-sm px-5 py-2.5"
        >
          {loading && fetcher.formData?.get('intent') === 'preview' ? 'Searching…' : 'Preview results'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
          {error}
        </div>
      )}

      {/* Import success */}
      {importResult && (
        <div className="rounded-xl px-4 py-4 mb-4" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          <p className="font-bold text-sm">Import complete</p>
          <p className="text-sm mt-0.5">
            Inserted <strong>{importResult.inserted}</strong> jobs · <strong>{importResult.skipped}</strong> already existed
          </p>
        </div>
      )}

      {/* Preview results */}
      {preview && (
        <div className="rounded-[18px] border overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>

          {/* Summary bar */}
          <div className="px-5 py-4 border-b flex items-center justify-between gap-4 flex-wrap" style={{ borderColor: 'var(--color-border)' }}>
            <div>
              <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                {preview.afterRequestFilters} jobs found
                {preview.wouldInsert < preview.afterRequestFilters && (
                  <span className="font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                    {' '}· {preview.wouldInsert} new · {preview.skipped} already in board
                  </span>
                )}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                Page {preview.preview.page} of {preview.preview.totalPages}
              </p>
            </div>
            <button
              type="button"
              onClick={() => submit('import')}
              disabled={loading || preview.wouldInsert === 0}
              className="btn-primary text-sm px-5 py-2 disabled:opacity-50"
            >
              {loading && fetcher.formData?.get('intent') === 'import' ? 'Importing…' : `Import ${preview.wouldInsert} jobs`}
            </button>
          </div>

          {/* Job list */}
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {preview.preview.jobs.length === 0 ? (
              <p className="px-5 py-8 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
                No jobs matched your filters.
              </p>
            ) : preview.preview.jobs.map((job: any, i: number) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>{job.title}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {[job.company, job.location].filter(Boolean).join(' · ')}
                    {job.externalSource && (
                      <span style={{ color: 'var(--color-text-muted)' }}> · {job.externalSource}</span>
                    )}
                  </p>
                </div>
                <div className="shrink-0 flex gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    {REMOTE_LABEL[job.remotePolicy] ?? job.remotePolicy}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    {TYPE_LABEL[job.employmentType] ?? job.employmentType}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {preview.preview.totalPages > 1 && (
            <div className="px-5 py-3 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--color-border)' }}>
              <button
                type="button"
                onClick={() => submit('preview', preview.preview.page - 1)}
                disabled={preview.preview.page <= 1 || loading}
                className="btn-outline text-xs px-3 py-1.5 disabled:opacity-40"
              >
                ← Prev
              </button>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {preview.preview.page} / {preview.preview.totalPages}
              </span>
              <button
                type="button"
                onClick={() => submit('preview', preview.preview.page + 1)}
                disabled={preview.preview.page >= preview.preview.totalPages || loading}
                className="btn-outline text-xs px-3 py-1.5 disabled:opacity-40"
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
