import type { LoaderFunctionArgs } from 'react-router'
import { redirect } from 'react-router'
import { getDb, jobs } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { publicJobPath } from '../../lib/public-job-path'

export async function loader({ params }: LoaderFunctionArgs) {
  const db = getDb()
  const job = await db.query.jobs.findFirst({ where: eq(jobs.id, params.jobId!) })

  if (!job || job.status !== 'published') {
    throw new Response('Not found', { status: 404 })
  }

  return redirect(publicJobPath(job), 301)
}

export default function LegacyJobRouteRedirect() {
  return null
}
