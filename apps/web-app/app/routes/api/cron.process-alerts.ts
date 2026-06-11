import type { ActionFunctionArgs } from 'react-router'
import { processJobAlerts } from '../../lib/job-alerts.server'

function unauthorized() {
  return Response.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}

function getBearerToken(request: Request) {
  const auth = request.headers.get('authorization') ?? ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? ''
}

export async function action({ request }: ActionFunctionArgs) {
  const secret = process.env.INGEST_SECRET
  const token = getBearerToken(request)

  if (!secret || token !== secret) return unauthorized()
  if (request.method.toUpperCase() !== 'POST') {
    return Response.json({ ok: false, error: 'Method not allowed' }, { status: 405 })
  }

  let body: { dryRun?: boolean; limit?: number } = {}
  try {
    body = (await request.json()) as { dryRun?: boolean; limit?: number }
  } catch {
    body = {}
  }

  try {
    const result = await processJobAlerts({ dryRun: body.dryRun, limit: body.limit })
    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ ok: false, error: message }, { status: 502 })
  }
}