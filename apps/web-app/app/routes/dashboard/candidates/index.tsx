import { Form, useLoaderData } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, users } from '@jobuki/db'
import { eq, sql, desc, or, ilike, and } from 'drizzle-orm'
import { requireWorkspaceAccess } from '../../../lib/auth.server'

const PAGE_SIZE = 20

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const db = getDb()
  const url = new URL(args.request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const search = (url.searchParams.get('q') || '').trim()

  // Build search filter
  const searchFilter = search
    ? or(
        ilike(users.email, `%${search}%`),
        ilike(users.name, `%${search}%`)
      )
    : undefined

  // Get all candidates (users with accountType 'candidate')
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(searchFilter ? and(eq(users.accountType, 'candidate'), searchFilter) : eq(users.accountType, 'candidate'))

  const total = countResult[0]?.count || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const offset = (page - 1) * PAGE_SIZE

  // Get users for this page
  const candidateList = await db
    .select()
    .from(users)
    .where(searchFilter ? and(eq(users.accountType, 'candidate'), searchFilter) : eq(users.accountType, 'candidate'))
    .orderBy(desc(users.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset)

  return {
    candidates: candidateList,
    page,
    totalPages,
    total,
    workspace,
    search,
  }
}

export default function CandidatesList() {
  const { candidates, page, totalPages, total, search } = useLoaderData<typeof loader>()

  const makePageUrl = (targetPage: number) => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (targetPage > 1) params.set('page', String(targetPage))
    const query = params.toString()
    return query ? `?${query}` : '?page=1'
  }

  return (
    <div className="w-full p-8 max-w-6xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold font-display" style={{ color: 'var(--color-text-primary)' }}>
          Candidates
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          View all candidates who've applied to your jobs. Showing {candidates.length} of {total} candidates.
        </p>
      </div>

      {/* Search Box */}
      <div className="card p-6">
        <Form method="get" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={search}
            placeholder="Search by email or name..."
            className="flex-1 px-3 py-2 rounded-lg text-sm border"
            style={{
              borderColor: 'var(--color-border)',
              backgroundColor: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
            }}
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            }}
          >
            Search
          </button>
          {search && (
            <a
              href="?page=1"
              className="px-4 py-2 rounded-lg text-sm font-medium no-underline"
              style={{
                backgroundColor: 'var(--color-surface-subtle)',
                color: 'var(--color-text-secondary)',
              }}
            >
              Clear
            </a>
          )}
        </Form>
      </div>

      <div className="card p-6">
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>Applied</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    No candidates yet
                  </td>
                </tr>
              ) : (
                candidates.map((candidate) => (
                  <tr key={candidate.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                      {candidate.email}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                      {candidate.name || '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                      {new Date(candidate.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
            {page > 1 && (
              <a
                href={makePageUrl(page - 1)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium no-underline"
                style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-primary)' }}
              >
                ← Previous
              </a>
            )}

            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
              Page {page} of {totalPages}
            </span>

            {page < totalPages && (
              <a
                href={makePageUrl(page + 1)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium no-underline"
                style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-primary)' }}
              >
                Next →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
