import { redirect } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, users } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { requireUser, getWorkspaceForUser } from '../../lib/auth.server'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args, { type: 'job-seeker' })
  const workspaceMembership = await getWorkspaceForUser(user.id)
  if (workspaceMembership) throw redirect('/dashboard')

  if (user.accountType !== 'job_seeker') {
    const db = getDb()
    await db
      .update(users)
      .set({ accountType: 'job_seeker', updatedAt: new Date() })
      .where(eq(users.id, user.id))
  }

  throw redirect('/candidate')
}

export default function CandidateStartRoute() {
  return null
}
