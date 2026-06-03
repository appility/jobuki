import { Form, Link, useActionData, useLoaderData, useNavigation } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { useDeferredValue, useState } from 'react'
import { and, eq, inArray } from 'drizzle-orm'
import { adminAuditLogs, features, getDb, roleFeatures, roles, users, workspaceMembers } from '@jobuki/db'
import { requirePlatformAdmin } from '../../lib/auth.server'

const MEMBER_ROLES = ['owner', 'admin', 'member'] as const

type MemberRole = typeof MEMBER_ROLES[number]

function isMemberRole(value: string): value is MemberRole {
  return MEMBER_ROLES.includes(value as MemberRole)
}

async function logAdminAction(params: {
  actorUserId: string
  action: string
  targetType: string
  targetId: string
  metadata: Record<string, unknown>
}) {
  const db = getDb()
  await db.insert(adminAuditLogs).values({
    actorUserId: params.actorUserId,
    action: params.action,
    targetType: params.targetType,
    targetId: params.targetId,
    metadata: params.metadata,
  })
}

export async function loader(args: LoaderFunctionArgs) {
  const { user } = await requirePlatformAdmin(args)
  const db = getDb()

  const [allUsers, allRoles, allFeatures, recentAuditLogs] = await Promise.all([
    db.query.users.findMany({
      with: {
        workspaceMembers: {
          with: { workspace: true },
        },
      },
    }),
    db.query.roles.findMany({
      with: {
        roleFeatures: {
          with: { feature: true },
        },
      },
    }),
    db.query.features.findMany(),
    db.query.adminAuditLogs.findMany({
      with: {
        actorUser: {
          columns: { email: true, name: true },
        },
      },
      orderBy: (audit, { desc }) => [desc(audit.createdAt)],
      limit: 12,
    }),
  ])

  const usersWithMemberships = allUsers
    .map((entry) => ({
      ...entry,
      workspaceMembers: [...entry.workspaceMembers].sort((left, right) =>
        left.workspace.name.localeCompare(right.workspace.name)
      ),
    }))
    .sort((left, right) => left.email.localeCompare(right.email))

  const roleCatalog = [...allRoles]
    .map((role) => ({
      ...role,
      roleFeatures: [...role.roleFeatures].sort((left, right) =>
        left.feature.name.localeCompare(right.feature.name)
      ),
    }))
    .sort((left, right) => left.name.localeCompare(right.name))

  const featureCatalog = [...allFeatures].sort((left, right) => left.name.localeCompare(right.name))

  const workspaceCount = new Set(
    usersWithMemberships.flatMap((entry) => entry.workspaceMembers.map((membership) => membership.workspaceId))
  ).size

  return {
    currentUserId: user.id,
    stats: {
      users: usersWithMemberships.length,
      platformAdmins: usersWithMemberships.filter((entry) => entry.isPlatformAdmin).length,
      workspaces: workspaceCount,
    },
    users: usersWithMemberships,
    roles: roleCatalog,
    features: featureCatalog,
    auditLogs: recentAuditLogs,
  }
}

export async function action(args: ActionFunctionArgs) {
  const { user } = await requirePlatformAdmin(args)
  const db = getDb()
  const form = await args.request.formData()
  const intent = String(form.get('intent') || '')

  if (intent === 'update_platform_admin') {
    const targetUserId = String(form.get('userId') || '')
    const nextValue = String(form.get('isPlatformAdmin') || '') === 'true'

    if (!targetUserId) {
      return { ok: false, error: 'Missing user id.' }
    }

    if (targetUserId === user.id && !nextValue) {
      return { ok: false, error: 'You cannot remove your own platform admin access.' }
    }

    await db
      .update(users)
      .set({ isPlatformAdmin: nextValue, updatedAt: new Date() })
      .where(eq(users.id, targetUserId))

    await logAdminAction({
      actorUserId: user.id,
      action: nextValue ? 'platform_admin.granted' : 'platform_admin.revoked',
      targetType: 'user',
      targetId: targetUserId,
      metadata: {
        nextValue,
      },
    })

    return {
      ok: true,
      message: nextValue ? 'Platform admin access granted.' : 'Platform admin access removed.',
    }
  }

  if (intent === 'update_membership_role') {
    const membershipId = String(form.get('membershipId') || '')
    const nextRole = String(form.get('role') || '')

    if (!membershipId || !isMemberRole(nextRole)) {
      return { ok: false, error: 'Invalid membership update.' }
    }

    const membership = await db.query.workspaceMembers.findFirst({
      where: eq(workspaceMembers.id, membershipId),
      with: { workspace: true, user: true },
    })

    if (!membership) {
      return { ok: false, error: 'Membership not found.' }
    }

    if (membership.userId === user.id && membership.role === 'owner' && nextRole !== 'owner') {
      const ownerCount = await db.query.workspaceMembers.findMany({
        where: and(
          eq(workspaceMembers.workspaceId, membership.workspaceId),
          eq(workspaceMembers.role, 'owner')
        ),
        columns: { id: true },
      })

      if (ownerCount.length <= 1) {
        return { ok: false, error: 'This workspace still needs at least one owner.' }
      }
    }

    await db
      .update(workspaceMembers)
      .set({ role: nextRole })
      .where(eq(workspaceMembers.id, membershipId))

    await logAdminAction({
      actorUserId: user.id,
      action: 'workspace_membership.role_updated',
      targetType: 'workspace_membership',
      targetId: membership.id,
      metadata: {
        workspaceId: membership.workspaceId,
        workspaceName: membership.workspace.name,
        userId: membership.userId,
        userEmail: membership.user.email,
        previousRole: membership.role,
        nextRole,
      },
    })

    return { ok: true, message: `Updated ${membership.user.email} to ${nextRole}.` }
  }

  if (intent === 'update_role_features') {
    const roleId = String(form.get('roleId') || '')
    const selectedFeatureIds = form.getAll('featureId').map((value) => String(value))

    if (!roleId) {
      return { ok: false, error: 'Missing role id.' }
    }

    const [role, availableFeatures, existingMappings] = await Promise.all([
      db.query.roles.findFirst({ where: eq(roles.id, roleId) }),
      db.query.features.findMany({ columns: { id: true } }),
      db.query.roleFeatures.findMany({ where: eq(roleFeatures.roleId, roleId) }),
    ])

    if (!role) {
      return { ok: false, error: 'Role not found.' }
    }

    const allowedFeatureIds = new Set(availableFeatures.map((entry) => entry.id))
    const nextFeatureIds = [...new Set(selectedFeatureIds)].filter((featureId) => allowedFeatureIds.has(featureId))
    const currentFeatureIds = new Set(existingMappings.map((entry) => entry.featureId))

    const toAdd = nextFeatureIds.filter((featureId) => !currentFeatureIds.has(featureId))
    const toRemove = existingMappings.filter((entry) => !nextFeatureIds.includes(entry.featureId))

    if (toRemove.length > 0) {
      await db
        .delete(roleFeatures)
        .where(inArray(roleFeatures.id, toRemove.map((entry) => entry.id)))
    }

    if (toAdd.length > 0) {
      await db.insert(roleFeatures).values(
        toAdd.map((featureId) => ({
          roleId,
          featureId,
        }))
      )
    }

    if (toAdd.length > 0 || toRemove.length > 0) {
      await logAdminAction({
        actorUserId: user.id,
        action: 'role_features.updated',
        targetType: 'role',
        targetId: role.id,
        metadata: {
          roleKey: role.key,
          addedFeatureIds: toAdd,
          removedFeatureIds: toRemove.map((entry) => entry.featureId),
        },
      })
    }

    return {
      ok: true,
      message: `Updated feature access for ${role.name}.`,
    }
  }

  return { ok: false, error: 'Unknown action.' }
}

export default function PlatformAdminPage() {
  const { currentUserId, stats, users, roles, features, auditLogs } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const filteredUsers = users.filter((entry) => {
    if (!deferredQuery.trim()) return true
    const haystack = [
      entry.email,
      entry.name ?? '',
      entry.accountType,
      ...entry.workspaceMembers.map((membership) => membership.workspace.name),
    ].join(' ').toLowerCase()
    return haystack.includes(deferredQuery.trim().toLowerCase())
  })

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-10">
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <Link
              to="/dashboard"
              className="text-sm no-underline block mb-3"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ← Back to dashboard
            </Link>
            <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Platform admin
            </h1>
            <p className="text-sm max-w-2xl" style={{ color: 'var(--color-text-secondary)' }}>
              Review every user, inspect the system role catalog, and update workspace membership roles from one place.
            </p>
          </div>
        </div>

        {actionData?.error && (
          <div className="mb-6 rounded-2xl px-4 py-3 text-sm"
            style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
            {actionData.error}
          </div>
        )}

        {actionData?.ok && actionData?.message && (
          <div className="mb-6 rounded-2xl px-4 py-3 text-sm"
            style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
            {actionData.message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <StatCard label="Users" value={String(stats.users)} />
          <StatCard label="Platform admins" value={String(stats.platformAdmins)} />
          <StatCard label="Workspaces touched" value={String(stats.workspaces)} />
        </div>

        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.95fr)]">
          <section>
            <div className="card p-5 mb-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    Users
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Search by name, email, account type, or workspace.
                  </p>
                </div>
                <div className="w-full md:w-80">
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Search
                  </label>
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="input w-full"
                    placeholder="Find a user or workspace"
                    autoComplete="off"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {filteredUsers.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-base font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                    No users match this search
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Try a different name, email address, or workspace.
                  </p>
                </div>
              ) : filteredUsers.map((entry) => (
                <article key={entry.id} className="card p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {entry.name ?? entry.email}
                        </h3>
                        {entry.id === currentUserId && <Badge tone="neutral">You</Badge>}
                        {entry.isPlatformAdmin && <Badge tone="brand">Platform admin</Badge>}
                        <Badge tone="neutral">{entry.accountType.replace('_', ' ')}</Badge>
                      </div>
                      <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>{entry.email}</p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Joined {new Date(entry.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <Form method="post" className="flex items-center gap-2">
                      <input type="hidden" name="intent" value="update_platform_admin" />
                      <input type="hidden" name="userId" value={entry.id} />
                      <input type="hidden" name="isPlatformAdmin" value={entry.isPlatformAdmin ? 'false' : 'true'} />
                      <button
                        type="submit"
                        className="btn-outline text-sm"
                        disabled={navigation.state === 'submitting' && entry.id === String(navigation.formData?.get('userId'))}
                      >
                        {entry.isPlatformAdmin ? 'Remove admin' : 'Make admin'}
                      </button>
                    </Form>
                  </div>

                  <div className="mt-5 rounded-2xl border overflow-hidden"
                    style={{ borderColor: 'var(--color-border)' }}>
                    <div className="grid grid-cols-[minmax(0,1.1fr)_120px_120px] gap-3 px-4 py-3 text-xs font-semibold"
                      style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-muted)' }}>
                      <span>Workspace</span>
                      <span>Current role</span>
                      <span>Update</span>
                    </div>
                    {entry.workspaceMembers.length === 0 ? (
                      <div className="px-4 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        This user is not a member of any workspace yet.
                      </div>
                    ) : entry.workspaceMembers.map((membership) => {
                      const isSaving = navigation.state === 'submitting'
                        && String(navigation.formData?.get('membershipId')) === membership.id

                      return (
                        <Form key={membership.id} method="post"
                          className="grid grid-cols-[minmax(0,1.1fr)_120px_120px] gap-3 px-4 py-3 items-center border-t"
                          style={{ borderColor: 'var(--color-border)' }}>
                          <input type="hidden" name="intent" value="update_membership_role" />
                          <input type="hidden" name="membershipId" value={membership.id} />
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                              {membership.workspace.name}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                              {membership.workspace.slug}
                            </p>
                          </div>
                          <select
                            name="role"
                            defaultValue={membership.role}
                            className="input text-sm"
                            aria-label={`Role for ${entry.email} in ${membership.workspace.name}`}
                          >
                            {MEMBER_ROLES.map((role) => (
                              <option key={role} value={role}>{role}</option>
                            ))}
                          </select>
                          <button type="submit" className="btn-primary text-sm" disabled={isSaving}>
                            {isSaving ? 'Saving…' : 'Save'}
                          </button>
                        </Form>
                      )
                    })}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <aside className="flex flex-col gap-5">
            <section className="card p-5">
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Role catalog
              </h2>
              <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
                Edit feature access per role and keep the permission model readable.
              </p>

              <div className="flex flex-col gap-4">
                {roles.map((role) => (
                  <Form key={role.id} method="post" className="rounded-2xl border p-4"
                    style={{ borderColor: 'var(--color-border)' }}>
                    <input type="hidden" name="intent" value="update_role_features" />
                    <input type="hidden" name="roleId" value={role.id} />
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                          {role.name}
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          {role.key}
                        </p>
                      </div>
                      {role.isSystem && <Badge tone="neutral">System</Badge>}
                    </div>
                    {role.description && (
                      <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                        {role.description}
                      </p>
                    )}
                    <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>
                      {role.roleFeatures.length} feature{role.roleFeatures.length === 1 ? '' : 's'} enabled
                    </p>
                    <div className="grid gap-2 mb-4">
                      {features.map((feature) => {
                        const checked = role.roleFeatures.some((entry) => entry.featureId === feature.id)
                        return (
                          <label key={feature.id}
                            className="flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer"
                            style={{ borderColor: 'var(--color-border)', backgroundColor: checked ? 'var(--color-primary)08' : 'var(--color-surface)' }}>
                            <input
                              type="checkbox"
                              name="featureId"
                              value={feature.id}
                              defaultChecked={checked}
                              className="mt-1"
                            />
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                                {feature.name}
                              </span>
                              <span className="block text-xs" style={{ color: 'var(--color-text-muted)' }}>
                                {feature.key}
                                {feature.description ? ` · ${feature.description}` : ''}
                              </span>
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        Changes apply immediately.
                      </span>
                      <button
                        type="submit"
                        className="btn-primary text-sm"
                        disabled={navigation.state === 'submitting' && String(navigation.formData?.get('roleId')) === role.id}
                      >
                        {navigation.state === 'submitting' && String(navigation.formData?.get('roleId')) === role.id ? 'Saving…' : 'Save features'}
                      </button>
                    </div>
                  </Form>
                ))}
              </div>
            </section>

            <section className="card p-5">
              <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>
                Notes
              </h2>
              <ul className="text-sm flex flex-col gap-2" style={{ color: 'var(--color-text-secondary)' }}>
                <li>Platform admin controls access to this area.</li>
                <li>Workspace membership roles still govern day-to-day workspace permissions.</li>
                <li>Role feature mappings can now be edited here and are ready for enforcement in the app.</li>
              </ul>
            </section>

            <section className="card p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Recent admin activity
                </h2>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Last {auditLogs.length}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {auditLogs.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    No admin changes recorded yet.
                  </p>
                ) : auditLogs.map((entry) => (
                  <div key={entry.id} className="rounded-xl border px-3 py-3"
                    style={{ borderColor: 'var(--color-border)' }}>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {formatAuditAction(entry.action)}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                      {entry.actorUser.name || entry.actorUser.email} · {new Date(entry.createdAt).toLocaleString()}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                      {entry.targetType} · {entry.targetId}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="text-3xl font-extrabold mb-1" style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </p>
      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </p>
    </div>
  )
}

function Badge({ children, tone }: { children: React.ReactNode; tone: 'brand' | 'neutral' }) {
  const styles = tone === 'brand'
    ? { backgroundColor: 'var(--color-primary)16', color: 'var(--color-primary)' }
    : { backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)' }

  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={styles}>
      {children}
    </span>
  )
}

function formatAuditAction(action: string) {
  switch (action) {
    case 'platform_admin.granted':
      return 'Platform admin granted'
    case 'platform_admin.revoked':
      return 'Platform admin revoked'
    case 'workspace_membership.role_updated':
      return 'Workspace role updated'
    case 'role_features.updated':
      return 'Role features updated'
    default:
      return action
  }
}
