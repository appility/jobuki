import { Link } from 'react-router'

interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange?: (page: number) => void
  baseUrl?: string
}

export function Pagination({ page, totalPages, totalItems, pageSize, baseUrl = '' }: PaginationProps) {
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => Math.abs(p - page) <= 2 || p === 1 || p === totalPages)
    .reduce<(number | '…')[]>((acc, p, i, arr) => {
      if (i > 0 && (arr[i - 1] as number) < p - 1) acc.push('…')
      acc.push(p)
      return acc
    }, [])

  return (
    <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        {start}–{end} of {totalItems}
      </span>
      <div className="flex gap-1">
        <Link
          to={page > 1 ? `${baseUrl}?page=${page - 1}` : '#'}
          onClick={(e) => page === 1 && e.preventDefault()}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors"
          style={{
            pointerEvents: page === 1 ? 'none' : 'auto',
            opacity: page === 1 ? 0.4 : 1,
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
          }}
        >
          ← Prev
        </Link>
        {pageNumbers.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-2 py-1.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>…</span>
          ) : (
            <Link
              key={p}
              to={`${baseUrl}?page=${p}`}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors"
              style={{
                borderColor: page === p ? 'var(--color-primary)' : 'var(--color-border)',
                backgroundColor: page === p ? 'var(--color-primary)' : 'var(--color-surface)',
                color: page === p ? 'var(--color-primary-fg)' : 'var(--color-text-secondary)',
              }}
            >
              {p}
            </Link>
          )
        )}
        <Link
          to={page < totalPages ? `${baseUrl}?page=${page + 1}` : '#'}
          onClick={(e) => page === totalPages && e.preventDefault()}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors"
          style={{
            pointerEvents: page === totalPages ? 'none' : 'auto',
            opacity: page === totalPages ? 0.4 : 1,
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-surface)',
            color: 'var(--color-text-secondary)',
          }}
        >
          Next →
        </Link>
      </div>
    </div>
  )
}
