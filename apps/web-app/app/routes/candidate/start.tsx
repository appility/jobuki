import { redirect } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, users } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { requireUser, getWorkspaceForUser } from '../../lib/auth.server'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args, { type: 'candidate' })
  const workspaceMembership = await getWorkspaceForUser(user.id)
  if (workspaceMembership) throw redirect('/dashboard')

  if (user.accountType !== 'candidate') {
    const db = getDb()
    await db
      .update(users)
      .set({ accountType: 'candidate', updatedAt: new Date() })
      .where(eq(users.id, user.id))
  }

  throw redirect('/candidate')
}

export default function CandidateStartRoute() {
  return null
}
