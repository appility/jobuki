import { useEffect, useRef, useState } from 'react'
import { useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { requireWorkspaceAccess, requireBoardInWorkspace } from '../../../lib/auth.server'
import { getDb, jobs } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { boardUrl } from '../../../lib/board-url'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const board = await requireBoardInWorkspace(args.params.id!, workspace.id)
  const db = getDb()
  const boardJobs = await db.query.jobs.findMany({
    where: eq(jobs.boardId, board.id),
    columns: { id: true, status: true },
  })
  return {
    board,
    jobCount: boardJobs.length,
    publishedCount: boardJobs.filter(j => j.status === 'published').length,
    publicUrl: boardUrl(board.slug, board.customDomain),
  }
}

export default function BoardShow() {
  const { board, jobCount, publishedCount, publicUrl } = useLoaderData<typeof loader>()

  return (
    <div className="w-full p-10 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <h1 className="text-2xl font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
          {board.name}
        </h1>
        <span
          className="text-xs font-semibold px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: board.status === 'live' ? 'var(--color-success-bg)' : 'var(--color-surface-subtle)',
            color: board.status === 'live' ? 'var(--color-success)' : 'var(--color-text-muted)',
          }}
        >
          {board.status === 'live' ? '● Live' : '○ Draft'}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-5">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total jobs</p>
          <p className="text-2xl font-extrabold mt-1 font-display" style={{ color: 'var(--color-text-primary)' }}>
            {jobCount}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {publishedCount} published
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Status</p>
          <p className="text-2xl font-extrabold mt-1 font-display capitalize" style={{ color: 'var(--color-text-primary)' }}>
            {board.status}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {board.status === 'live' ? 'Visible to candidates' : 'Not public yet'}
          </p>
        </div>

        <div className="card p-5">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Public URL</p>
          <p className="text-sm font-semibold mt-1 truncate" style={{ color: 'var(--color-text-primary)' }}>
            {publicUrl.replace(/^https?:\/\//, '')}
          </p>
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs no-underline mt-1 block"
            style={{ color: 'var(--color-primary)' }}
          >
            Open ↗
          </a>
        </div>
      </div>

      {/* Preview */}
      <section className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>Live preview</h2>
          <a href={publicUrl} target="_blank" rel="noreferrer"
            className="text-xs no-underline" style={{ color: 'var(--color-primary)' }}>
            Open full page ↗
          </a>
        </div>
        {board.status === 'live' ? (
          <ScaledIframePreview src={`${publicUrl}?preview=1`} title={`${board.name} preview`} />
        ) : (
          <div className="rounded-xl border p-10 text-center"
            style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-subtle)' }}>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Publish the board to see the live preview.
            </p>
            <a href={`/dashboard/boards/${board.id}/settings`}
              className="text-xs no-underline mt-2 inline-block" style={{ color: 'var(--color-primary)' }}>
              Go to Settings to publish →
            </a>
          </div>
        )}
      </section>
    </div>
  )
}

// ── Scaled iframe preview ─────────────────────────────────────────────
const MOBILE_WIDTH = 360
const IFRAME_HEIGHT = 720

function ScaledIframePreview({ src, title }: { src: string; title: string }) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState<number | null>(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (!isMobile) { setScale(null); return }
    const el = wrapperRef.current
    if (!el) return
    const update = () => setScale(el.offsetWidth / MOBILE_WIDTH)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isMobile])

  if (!isMobile || scale === null) {
    return (
      <iframe title={title} src={src} loading="lazy" tabIndex={-1}
        className="w-full rounded-xl pointer-events-none"
        style={{ minHeight: 580, border: '1px solid var(--color-border)' }} />
    )
  }

  return (
    <div ref={wrapperRef} className="w-full rounded-xl overflow-hidden"
      style={{ height: IFRAME_HEIGHT * scale, border: '1px solid var(--color-border)', position: 'relative' }}>
      <iframe title={title} src={src} loading="lazy" tabIndex={-1}
        style={{
          width: MOBILE_WIDTH, height: IFRAME_HEIGHT, border: 'none',
          transformOrigin: 'top left', transform: `scale(${scale})`,
          pointerEvents: 'none', position: 'absolute', top: 0, left: 0,
        }} />
    </div>
  )
}
