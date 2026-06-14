import { Form, useActionData, useLoaderData, useNavigation } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { Button } from '../../components/ui/Button'
import { boards, getDb, jobAlerts } from '@jobuki/db'
import { and, count, desc, eq } from 'drizzle-orm'
import { requireUser } from '../../lib/auth.server'
import { getMaxAlertsPerUser } from '../../lib/alert-limits'

function getActionError(error: unknown, fallback: string) {
  const code = (error as { code?: string } | null)?.code
  if (code === '42P01') {
    return 'Email alerts are temporarily unavailable while database setup is finishing. Please try again shortly.'
  }
  return fallback
}

async function resolveCurrentBoard(request: Request) {
  const boardSlug = request.headers.get('x-board-slug')
  const boardHostname = request.headers.get('x-board-hostname')
  const boardType = request.headers.get('x-board-type')
  const db = getDb()

  if (boardType === 'custom' && boardHostname) {
    return db.query.boards.findFirst({ where: eq(boards.customDomain, boardHostname) })
  }

  if (boardSlug) {
    return db.query.boards.findFirst({ where: eq(boards.slug, boardSlug) })
  }

  return null
}

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args, { type: 'candidate' })
  const db = getDb()
  const board = await resolveCurrentBoard(args.request)
  const maxAlertsPerUser = getMaxAlertsPerUser()
  let alertsAvailable = true
  let alerts: Array<{ alert: typeof jobAlerts.$inferSelect; boardName: string | null }> = []

  try {
    alerts = await db
      .select({ alert: jobAlerts, boardName: boards.name })
      .from(jobAlerts)
      .leftJoin(boards, eq(jobAlerts.boardId, boards.id))
      .where(eq(jobAlerts.userId, user.id))
      .orderBy(desc(jobAlerts.createdAt))
  } catch (error: any) {
    if (error?.code !== '42P01') throw error
    alertsAvailable = false
  }

  return {
    alertsAvailable,
    maxAlertsPerUser,
    canCreateAlert: alerts.length < maxAlertsPerUser,
    alerts: alerts.map(({ alert, boardName }) => ({
      ...alert,
      boardName,
    })),
    board: board ? { id: board.id, name: board.name } : null,
  }
}

export async function action(args: ActionFunctionArgs) {
  const user = await requireUser(args, { type: 'candidate' })
  const db = getDb()
  const maxAlertsPerUser = getMaxAlertsPerUser()
  const form = await args.request.formData()
  const intent = String(form.get('intent') ?? '').trim()
  const alertId = String(form.get('alertId') ?? '').trim()

  if (intent === 'create') {
    const searchTerm = String(form.get('searchTerm') ?? '').trim()
    const remoteOnly = form.get('remoteOnly') === 'on'
    const boardId = String(form.get('boardId') ?? '').trim() || null

    if (!searchTerm) {
      return { ok: false, error: 'Add a search term to create an alert.' }
    }

    try {
      const [row] = await db
        .select({ total: count() })
        .from(jobAlerts)
        .where(eq(jobAlerts.userId, user.id))
      const totalAlerts = Number(row?.total ?? 0)
      if (totalAlerts >= maxAlertsPerUser) {
        return {
          ok: false,
          error: `You can create up to ${maxAlertsPerUser} alerts. Delete one to add another.`,
        }
      }
    } catch (error) {
      console.error('[candidate-alerts] limit check failed', error)
      return { ok: false, error: getActionError(error, 'Unable to validate alert limit right now.') }
    }

    try {
      await db.insert(jobAlerts).values({
        userId: user.id,
        boardId,
        searchTerm,
        categories: [],
        remoteOnly,
      })
    } catch (error) {
      console.error('[candidate-alerts] create failed', error)
      return { ok: false, error: getActionError(error, 'Unable to create alert right now.') }
    }

    return { ok: true, message: 'Alert created.' }
  }

  if (!alertId) {
    return { ok: false, error: 'Missing alert id.' }
  }

  const ownsAlert = and(eq(jobAlerts.id, alertId), eq(jobAlerts.userId, user.id))

  if (intent === 'toggle') {
    const enabled = String(form.get('enabled') ?? 'true') === 'true'
    try {
      await db.update(jobAlerts).set({ enabled, updatedAt: new Date() }).where(ownsAlert)
    } catch (error) {
      console.error('[candidate-alerts] toggle failed', error)
      return { ok: false, error: getActionError(error, 'Unable to update alert right now.') }
    }
    return { ok: true, message: enabled ? 'Alert enabled.' : 'Alert paused.' }
  }

  if (intent === 'delete') {
    try {
      await db.delete(jobAlerts).where(ownsAlert)
    } catch (error) {
      console.error('[candidate-alerts] delete failed', error)
      return { ok: false, error: getActionError(error, 'Unable to delete alert right now.') }
    }
    return { ok: true, message: 'Alert deleted.' }
  }

  if (intent === 'update') {
    const searchTerm = String(form.get('searchTerm') ?? '').trim()
    const remoteOnly = form.get('remoteOnly') === 'on'

    if (!searchTerm) {
      return { ok: false, error: 'Search term is required.' }
    }

    try {
      await db.update(jobAlerts)
        .set({ searchTerm, remoteOnly, updatedAt: new Date() })
        .where(ownsAlert)
    } catch (error) {
      console.error('[candidate-alerts] update failed', error)
      return { ok: false, error: getActionError(error, 'Unable to save alert changes right now.') }
    }

    return { ok: true, message: 'Alert updated.' }
  }

  return { ok: false, error: 'Unknown action.' }
}

export default function CandidateAlerts() {
  const { alerts, board, alertsAvailable, maxAlertsPerUser, canCreateAlert } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const isSubmitting = navigation.state === 'submitting'
  const pendingForm = isSubmitting ? navigation.formData : null
  const pendingIntent = pendingForm ? String(pendingForm.get('intent') ?? '') : ''
  const pendingAlertId = pendingForm ? String(pendingForm.get('alertId') ?? '') : ''
  const saving = isSubmitting

  let optimisticAlerts = alerts
  if (pendingForm) {
    const intent = String(pendingForm.get('intent') ?? '').trim()
    const alertId = String(pendingForm.get('alertId') ?? '').trim()

    if (intent === 'create') {
      const searchTerm = String(pendingForm.get('searchTerm') ?? '').trim()
      const remoteOnly = pendingForm.get('remoteOnly') === 'on'
      if (searchTerm) {
        optimisticAlerts = [
          ...alerts,
          {
            id: '__optimistic__',
            userId: '__optimistic__',
            boardId: (String(pendingForm.get('boardId') ?? '').trim() || null),
            searchTerm,
            categories: [],
            remoteOnly,
            enabled: true,
            lastNotifiedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            boardName: board?.name ?? null,
          },
        ]
      }
    } else if (intent === 'delete' && alertId) {
      optimisticAlerts = alerts.filter((alert) => alert.id !== alertId)
    } else if (intent === 'toggle' && alertId) {
      const enabled = String(pendingForm.get('enabled') ?? 'true') === 'true'
      optimisticAlerts = alerts.map((alert) => alert.id === alertId
        ? { ...alert, enabled }
        : alert)
    } else if (intent === 'update' && alertId) {
      const searchTerm = String(pendingForm.get('searchTerm') ?? '').trim()
      const remoteOnly = pendingForm.get('remoteOnly') === 'on'
      optimisticAlerts = alerts.map((alert) => alert.id === alertId
        ? {
            ...alert,
            searchTerm: searchTerm || alert.searchTerm,
            remoteOnly,
          }
        : alert)
    }
  }

  const canCreateAlertNow = optimisticAlerts.length < maxAlertsPerUser
  const createAlertCard = (
    <Form method="post" className="card p-5 space-y-4">
      <input type="hidden" name="intent" value="create" />
      <input type="hidden" name="boardId" value={board?.id ?? ''} />

      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>Create a new alert</p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {board ? `This alert will watch jobs on ${board.name}.` : 'This alert will watch jobs across your available boards.'}
        </p>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Search term</span>
        <input name="searchTerm" className="input w-full" placeholder="Product designer, Rust engineer, marketing lead..." />
      </label>

      <label className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
        <input type="checkbox" name="remoteOnly" className="h-4 w-4" />
        Remote roles only
      </label>

      <div className="pt-1">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!canCreateAlertNow}
          loading={isSubmitting && pendingIntent === 'create'}
          loadingText="Creating…"
        >
          {!canCreateAlertNow ? `Limit reached (${maxAlertsPerUser})` : 'Create alert'}
        </Button>
      </div>

      {!canCreateAlertNow && (
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          You have reached the alert limit. Delete an existing alert to create a new one.
        </p>
      )}
    </Form>
  )

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-xl font-extrabold font-display" style={{ color: 'var(--color-text-primary)' }}>
          Email alerts
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          Save a search and get notified when fresh roles match it.
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {optimisticAlerts.length}/{maxAlertsPerUser} alerts used.
        </p>
      </div>

      {!alertsAvailable && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--color-warning) 14%, white)', color: 'var(--color-warning)' }}>
          Alerts are temporarily unavailable while database setup is finishing. Please try again shortly.
        </div>
      )}

      {actionData?.error && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor: 'color-mix(in srgb, var(--color-danger) 14%, white)', color: 'var(--color-danger)' }}>
          {actionData.error}
        </div>
      )}

      {actionData?.message && (
        <div className="rounded-xl px-4 py-3 text-sm font-semibold" style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          {actionData.message}
        </div>
      )}

      {optimisticAlerts.length === 0 ? (
        <>
          {createAlertCard}
          <div className="card p-10 text-center">
            <p className="text-lg font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>No alerts yet</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Create your first alert above to get notified when matching roles land.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4">
            {optimisticAlerts.map((alert) => (
              <Form key={alert.id} method="post" className="card p-5 space-y-4">
              <input type="hidden" name="alertId" value={alert.id} />

              <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                    {alert.searchTerm}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    {alert.boardName ?? 'All boards'}
                    {alert.remoteOnly ? ' · Remote only' : ''}
                  </p>
                </div>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold w-fit"
                  style={{
                    backgroundColor: alert.enabled
                      ? 'color-mix(in srgb, var(--color-success) 12%, white)'
                      : 'color-mix(in srgb, var(--color-text-muted) 12%, white)',
                    color: alert.enabled ? 'var(--color-success)' : 'var(--color-text-muted)',
                  }}
                >
                  {alert.enabled ? 'Active' : 'Paused'}
                </span>
              </div>

              <div>
                <label className="block space-y-1.5">
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>Search term</span>
                  <input name="searchTerm" defaultValue={alert.searchTerm} className="input w-full" />
                </label>
              </div>

              <label className="inline-flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                <input type="checkbox" name="remoteOnly" className="h-4 w-4" defaultChecked={alert.remoteOnly} />
                Remote roles only
              </label>

              <div className="flex flex-wrap gap-2">
                <input type="hidden" name="enabled" value={String(!alert.enabled)} />
                <Button
                  type="submit"
                  name="intent"
                  value="update"
                  variant="primary"
                  size="sm"
                  loading={isSubmitting && pendingIntent === 'update' && pendingAlertId === alert.id}
                  loadingText="Saving…"
                  disabled={isSubmitting}
                >
                  Save changes
                </Button>
                <Button
                  type="submit"
                  name="intent"
                  value="toggle"
                  variant="outline"
                  size="sm"
                  loading={isSubmitting && pendingIntent === 'toggle' && pendingAlertId === alert.id}
                  loadingText={alert.enabled ? 'Pausing…' : 'Resuming…'}
                  disabled={isSubmitting}
                  style={alert.enabled ? { color: 'var(--color-text-muted)' } : undefined}
                >
                  {alert.enabled ? '⏸ Pause' : '▶ Resume'}
                </Button>
                <Button
                  type="submit"
                  name="intent"
                  value="delete"
                  variant="outline"
                  size="sm"
                  loading={isSubmitting && pendingIntent === 'delete' && pendingAlertId === alert.id}
                  loadingText="Deleting…"
                  disabled={isSubmitting}
                  style={{ color: 'var(--color-danger)' }}
                >
                  Delete
                </Button>
              </div>
              </Form>
            ))}
          </div>
          {createAlertCard}
        </>
      )}
    </div>
  )
}