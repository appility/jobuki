import { Form, Link, useActionData, useLoaderData, useNavigation } from 'react-router'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { requireWorkspaceAccess } from '../../lib/auth.server'
import { canMonetize } from '../../lib/creator-tier'

export async function loader(args: LoaderFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  return {
    workspace,
    canMonetize: canMonetize(workspace.plan),
  }
}

export async function action(args: ActionFunctionArgs) {
  const { workspace } = await requireWorkspaceAccess(args)
  const enabled = canMonetize(workspace.plan)
  const form = await args.request.formData()
  const intent = String(form.get('intent') ?? '')

  if (intent !== 'request_access') {
    return { ok: false, error: 'Unknown action.' }
  }

  if (!enabled) {
    return {
      ok: false,
      error: `Monetization is only available on Growth and Scale tiers. Your current tier is ${workspace.plan}.`,
    }
  }

  return {
    ok: true,
    message: 'Monetization is enabled for this workspace tier. Paid posting setup tools will appear here.',
  }
}

export default function MonetizationPage() {
  const { workspace, canMonetize: enabled } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()
  const submitting = navigation.state === 'submitting'

  return (
    <div className="w-full p-8 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold mb-1" style={{ color: 'var(--color-text-primary)' }}>
          Monetization
        </h1>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Access is tier-based. Growth and Scale can enable paid listing workflows.
        </p>
      </div>

      <div className="card p-6 mb-5">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Workspace tier: <strong style={{ color: 'var(--color-text-primary)' }}>{workspace.plan}</strong>
        </p>
        <p className="text-sm mt-2" style={{ color: enabled ? 'var(--color-success)' : 'var(--color-warning)' }}>
          {enabled ? 'Monetization enabled' : 'Monetization locked on this tier'}
        </p>
      </div>

      {!enabled && (
        <div className="mb-5 rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
          <a href="/dashboard/billing" className="underline font-semibold" style={{ color: 'inherit' }}>Upgrade to Growth or Scale</a> to accept paid job postings.
        </div>
      )}

      {actionData?.error && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
          {actionData.error}
        </div>
      )}

      {actionData?.ok && actionData.message && (
        <div className="mb-4 rounded-xl px-4 py-3 text-sm"
          style={{ backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
          {actionData.message}
        </div>
      )}

      <div className="flex gap-3">
        <Form method="post">
          <input type="hidden" name="intent" value="request_access" />
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Checking…' : 'Validate monetization access'}
          </button>
        </Form>
        <Link to="/dashboard" className="btn-outline">Back to dashboard</Link>
      </div>
    </div>
  )
}
