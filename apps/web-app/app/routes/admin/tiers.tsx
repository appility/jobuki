import { Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { and, eq } from 'drizzle-orm'
import { adminAuditLogs, getDb, workspaceMembers, workspaces } from '@jobuki/db'
import { requirePlatformAdmin } from '../../lib/auth.server'

const WORKSPACE_PLANS = ['free', 'growth', 'scale'] as const

type WorkspacePlan = typeof WORKSPACE_PLANS[number]

function isWorkspacePlan(value: string): value is WorkspacePlan {
  return WORKSPACE_PLANS.includes(value as WorkspacePlan)
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
  await requirePlatformAdmin(args)
  const db = getDb()

  const rows = await db.query.workspaces.findMany({
    with: {
      boards: { columns: { id: true } },
      members: { columns: { id: true, role: true } },
    },
    orderBy: (workspace, { asc }) => [asc(workspace.name)],
  })

  const workspacesWithCounts = rows.map((workspace) => ({
    ...workspace,
    memberCount: workspace.members.length,
    ownerCount: workspace.members.filter((member) => member.role === 'owner').length,
    boardCount: workspace.boards.length,
  }))

  return {
    workspaces: workspacesWithCounts,
    totals: {
      all: workspacesWithCounts.length,
      free: workspacesWithCounts.filter((workspace) => workspace.plan === 'free').length,
      paid: workspacesWithCounts.filter((workspace) => workspace.plan !== 'free').length,
    },
  }
}

export async function action(args: ActionFunctionArgs) {
  const { user } = await requirePlatformAdmin(args)
  const db = getDb()
  const form = await args.request.formData()
  const intent = String(form.get('intent') || '')

  if (intent !== 'update_workspace_plan') {
    return { ok: false, error: 'Unknown action.' }
  }

  const workspaceId = String(form.get('workspaceId') || '')
  const nextPlan = String(form.get('plan') || '')

  if (!workspaceId || !isWorkspacePlan(nextPlan)) {
    return { ok: false, error: 'Invalid workspace plan update.' }
  }

  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
    columns: { id: true, name: true, slug: true, plan: true },
  })

  if (!workspace) {
    return { ok: false, error: 'Workspace not found.' }
  }

  if (workspace.plan === nextPlan) {
    return { ok: true, message: `${workspace.name} is already on the ${nextPlan} plan.` }
  }

  await db
    .update(workspaces)
    .set({ plan: nextPlan, updatedAt: new Date() })
    .where(eq(workspaces.id, workspace.id))

  await logAdminAction({
    actorUserId: user.id,
    action: 'workspace.plan_updated',
    targetType: 'workspace',
    targetId: workspace.id,
    metadata: {
      workspaceName: workspace.name,
      workspaceSlug: workspace.slug,
      previousPlan: workspace.plan,
      nextPlan,
    },
  })

  return { ok: true, message: `Updated ${workspace.name} to ${nextPlan}.` }
}

export default function PlatformAdminTiersPage() {
  const { workspaces, totals } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          Workspace tiers
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Manage subscription plan tiers for every workspace.
        </p>
      </div>

      {actionData?.error && (
        <div className="mb-6 rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
          {actionData.error}
        </div>
      )}

      {actionData?.ok && actionData?.message && (
        <div className="mb-6 rounded-2xl px-4 py-3 text-sm" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          {actionData.message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <StatCard label="Workspaces" value={String(totals.all)} />
        <StatCard label="Free" value={String(totals.free)} />
        <StatCard label="Paid" value={String(totals.paid)} />
      </div>

      <section className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
        <div className="grid grid-cols-[minmax(0,1.2fr)_110px_90px_90px_220px] gap-3 px-4 py-3 text-xs font-semibold" style={{ backgroundColor: 'var(--color-surface-subtle)', color: 'var(--color-text-muted)' }}>
          <span>Workspace</span>
          <span>Members</span>
          <span>Owners</span>
          <span>Boards</span>
          <span>Update plan</span>
        </div>

        {workspaces.length === 0 ? (
          <div className="px-4 py-6 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            No workspaces found.
          </div>
        ) : workspaces.map((workspace) => {
          const formId = `workspace-plan-${workspace.id}`
          const isSaving = navigation.state === 'submitting'
            && String(navigation.formData?.get('workspaceId')) === workspace.id

          return (
            <div
              key={workspace.id}
              className="grid grid-cols-[minmax(0,1.2fr)_110px_90px_90px_220px] gap-3 px-4 py-3 items-center border-t"
              style={{ borderColor: 'var(--color-border)' }}
            >
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>{workspace.name}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{workspace.slug}</p>
              </div>

              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{workspace.memberCount}</span>
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{workspace.ownerCount}</span>
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{workspace.boardCount}</span>

              <Form id={formId} method="post" className="flex items-center gap-2">
                <input type="hidden" name="intent" value="update_workspace_plan" />
                <input type="hidden" name="workspaceId" value={workspace.id} />
                <select
                  name="plan"
                  defaultValue={workspace.plan}
                  className="input text-sm"
                  aria-label={`Plan for ${workspace.name}`}
                >
                  {WORKSPACE_PLANS.map((plan) => (
                    <option key={plan} value={plan}>{plan}</option>
                  ))}
                </select>
                <button type="submit" className="btn-primary text-sm" disabled={isSaving}>
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </Form>
            </div>
          )
        })}
      </section>
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
