import { Form, useLoaderData, useActionData } from 'react-router'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { getDb, workspaceMembers, users, workspaces } from '@jobuki/db'
import { eq, sql, desc, ilike, and } from 'drizzle-orm'
import { requireWorkspaceAccess } from '../../../lib/auth.server'
import { useState } from 'react'

const MEMBER_LIMITS: Record<string, number | 'unlimited'> = {
  free: 1,
  growth: 3,
  scale: 'unlimited',
}

const PAGE_SIZE = 20

export async function loader(args: LoaderFunctionArgs) {
  const { workspace, user: currentUser } = await requireWorkspaceAccess(args)
  const db = getDb()
  const url = new URL(args.request.url)
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'))
  const search = (url.searchParams.get('q') || '').trim()

  // Get workspace members with user details
  const allMembers = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      createdAt: workspaceMembers.createdAt,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        imageUrl: users.imageUrl,
      },
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(workspaceMembers.userId, users.id))
    .where(eq(workspaceMembers.workspaceId, workspace.id))
    .orderBy(desc(workspaceMembers.createdAt))

  const total = allMembers.length
  const memberLimit = MEMBER_LIMITS[workspace.plan]
  const canAddMembers = memberLimit === 'unlimited' || total < memberLimit
  const slotsRemaining = memberLimit === 'unlimited' ? null : (memberLimit as number) - total

  return {
    workspace,
    currentUser,
    members: allMembers,
    total,
    memberLimit,
    canAddMembers,
    slotsRemaining,
  }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace, user: currentUser } = await requireWorkspaceAccess(args)
  const db = getDb()
  const form = await args.request.formData()
  const intent = form.get('intent') as string

  if (intent === 'remove_member') {
    const memberId = form.get('memberId') as string

    // Can't remove yourself
    const member = await db.query.workspaceMembers.findFirst({
      where: eq(workspaceMembers.id, memberId),
    })

    if (!member) {
      return { error: 'Member not found' }
    }

    if (member.userId === currentUser.id) {
      return { error: 'Cannot remove yourself from workspace' }
    }

    await db.delete(workspaceMembers).where(eq(workspaceMembers.id, memberId))
    return { ok: true, message: 'Member removed' }
  }

  if (intent === 'update_role') {
    const memberId = form.get('memberId') as string
    const newRole = form.get('role') as string

    if (!['owner', 'admin', 'member'].includes(newRole)) {
      return { error: 'Invalid role' }
    }

    const member = await db.query.workspaceMembers.findFirst({
      where: eq(workspaceMembers.id, memberId),
    })

    if (!member) {
      return { error: 'Member not found' }
    }

    if (member.userId === currentUser.id && newRole !== 'owner') {
      return { error: 'Cannot change your own role' }
    }

    await db.update(workspaceMembers).set({ role: newRole as any }).where(eq(workspaceMembers.id, memberId))
    return { ok: true, message: `Role updated to ${newRole}` }
  }

  return { error: 'Unknown action' }
}

export default function WorkspaceMembers() {
  const { workspace, currentUser, members, total, memberLimit, canAddMembers, slotsRemaining } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const [showInviteForm, setShowInviteForm] = useState(false)

  return (
    <div className="w-full p-8 max-w-6xl space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold font-display" style={{ color: 'var(--color-text-primary)' }}>
            Team Members
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Manage who can access and edit your workspace.
            {typeof memberLimit === 'number' && (
              <span> You have {slotsRemaining} of {memberLimit} slots in use.</span>
            )}
          </p>
        </div>
        {canAddMembers && (
          <button
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            }}
          >
            {showInviteForm ? 'Cancel' : 'Invite Member'}
          </button>
        )}
      </div>

      {!canAddMembers && (
        <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning) 14%, white)', color: 'var(--color-warning)' }}>
          <span className="font-semibold">Member limit reached.</span> Upgrade your plan to add more team members.
        </div>
      )}

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

      {showInviteForm && (
        <div className="card p-6 bg-blue-50" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 6%, white)' }}>
          <h3 className="font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            Invite a team member
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            Coming soon: Email-based invitation system
          </p>
          <button
            type="button"
            disabled
            className="px-4 py-2 rounded-lg text-sm font-medium opacity-50"
            style={{
              backgroundColor: 'var(--color-primary)',
              color: 'white',
            }}
          >
            Send Invite
          </button>
        </div>
      )}

      <div className="card p-6">
        {members.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-muted)' }}>
            No team members yet
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: '50%',
                      backgroundColor: 'color-mix(in srgb, var(--color-primary) 12%, white)',
                      color: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.875rem',
                      fontWeight: 'bold',
                    }}
                  >
                    {(member.user.name || member.user.email).charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>
                      {member.user.name || member.user.email}
                    </p>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                      {member.user.email}
                      {member.userId === currentUser.id && (
                        <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-muted)' }}>(you)</span>
                      )}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <Form method="post" style={{ display: 'inline' }}>
                    <input type="hidden" name="intent" value="update_role" />
                    <input type="hidden" name="memberId" value={member.id} />
                    <select
                      name="role"
                      defaultValue={member.role}
                      onChange={(e) => {
                        e.currentTarget.form?.submit()
                      }}
                      disabled={member.userId === currentUser.id}
                      style={{
                        padding: '0.375rem 0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface-subtle)',
                        color: 'var(--color-text-primary)',
                        fontSize: '0.875rem',
                        cursor: member.userId === currentUser.id ? 'not-allowed' : 'pointer',
                        opacity: member.userId === currentUser.id ? 0.6 : 1,
                      }}
                    >
                      <option value="editor">Editor</option>
                      <option value="owner">Owner</option>
                    </select>
                  </Form>

                  {member.userId !== currentUser.id && (
                    <Form method="post" style={{ display: 'inline' }}>
                      <input type="hidden" name="intent" value="remove_member" />
                      <input type="hidden" name="memberId" value={member.id} />
                      <button
                        type="submit"
                        className="text-xs font-medium no-underline px-3 py-1.5 rounded-lg"
                        style={{ color: 'var(--color-danger)', backgroundColor: 'color-mix(in srgb, var(--color-danger) 10%, white)' }}
                      >
                        Remove
                      </button>
                    </Form>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6" style={{ backgroundColor: 'color-mix(in srgb, var(--color-primary) 4%, white)' }}>
        <h3 className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Role permissions
        </h3>
        <ul className="text-sm space-y-2" style={{ color: 'var(--color-text-secondary)' }}>
          <li><strong>Editor:</strong> Can create, edit, and manage job boards and listings</li>
          <li><strong>Owner:</strong> Full workspace control including billing, settings, and team management</li>
        </ul>
      </div>
    </div>
  )
}
