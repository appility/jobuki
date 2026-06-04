import { redirect } from 'react-router'
import type { LoaderFunctionArgs } from 'react-router'
import { getDb, users } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import { requireUser, getWorkspaceForUser } from '../../lib/auth.server'

export async function loader(args: LoaderFunctionArgs) {
  const user = await requireUser(args)
  const workspaceMembership = await getWorkspaceForUser(user.id)
  if (workspaceMembership) throw redirect('/dashboard')

  if (user.accountType !== 'job_poster') {
    const db = getDb()
    await db
      .update(users)
      .set({ accountType: 'job_poster', updatedAt: new Date() })
      .where(eq(users.id, user.id))
  }

  throw redirect('/posters')
}

export default function PosterStartRoute() {
  return null
}
