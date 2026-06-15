import { Form, useLoaderData, useActionData } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { getDb, users, applications, jobs, boards } from '@jobuki/db'
import { eq, inArray, sql, desc, or, ilike, and } from 'drizzle-orm'
import { requireWorkspaceAccess } from '../../../lib/auth.server'

const TIERS = ['free', 'pro', 'enterprise'] as const
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
  const userList = await db
    .select()
    .from(users)
    .where(searchFilter ? and(eq(users.accountType, 'candidate'), searchFilter) : eq(users.accountType, 'candidate'))
    .orderBy(desc(users.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset)

  return {
    users: userList,
    page,
    totalPages,
    total,
    workspace,
    search,
  }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const db = getDb()
  const form = await args.request.formData()
  const intent = form.get('intent')

  if (intent === 'update_tier') {
    const userId = form.get('userId') as string
    const tier = form.get('tier') as string

    if (!TIERS.includes(tier as any)) {
      return { error: 'Invalid tier' }
    }

    await db.update(users).set({ tier: tier as any, updatedAt: new Date() }).where(eq(users.id, userId))

    return { ok: true, message: `Tier updated to ${tier}` }
  }

  return { error: 'Unknown action' }
}

export default function WorkspaceUsers() {
  const { users: userList, page, totalPages, total, workspace, search } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()

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
          Users
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Manage candidates and publishers on your boards. Showing {userList.length} of {total} users.
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

      {actionData?.message && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          {actionData.message}
        </div>
      )}

      {actionData?.error && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--color-danger) 14%, white)', color: 'var(--color-danger)' }}>
          {actionData.error}
        </div>
      )}

      <div className="card p-6">
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>Email</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>Tier</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>Account Type</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>Joined</th>
                <th style={{ textAlign: 'left', padding: '0.75rem', color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '0.875rem' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {userList.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
                    No users yet
                  </td>
                </tr>
              ) : (
                userList.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.75rem', color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                      {user.name || '—'}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      <Form method="post" style={{ display: 'inline' }}>
                        <input type="hidden" name="intent" value="update_tier" />
                        <input type="hidden" name="userId" value={user.id} />
                        <select
                          name="tier"
                          defaultValue={user.tier}
                          onChange={(e) => {
                            e.currentTarget.form?.submit()
                          }}
                          style={{
                            padding: '0.375rem 0.5rem',
                            borderRadius: '0.375rem',
                            border: '1px solid var(--color-border)',
                            backgroundColor: 'var(--color-surface-subtle)',
                            color: 'var(--color-text-primary)',
                            fontSize: '0.875rem',
                            cursor: 'pointer',
                          }}
                        >
                          {TIERS.map((tier) => (
                            <option key={tier} value={tier}>
                              {tier.charAt(0).toUpperCase() + tier.slice(1)}
                            </option>
                          ))}
                        </select>
                      </Form>
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                      {user.accountType ? user.accountType.charAt(0).toUpperCase() + user.accountType.slice(1) : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      <a
                        href={`mailto:${user.email}`}
                        className="text-xs font-medium no-underline"
                        style={{ color: 'var(--color-primary)' }}
                      >
                        Email
                      </a>
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
