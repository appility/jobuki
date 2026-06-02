import { getAuth } from '@clerk/react-router/server'
import { createClerkClient } from '@clerk/react-router/api.server'
import { redirect } from 'react-router'
import { getDb, users, workspaceMembers, workspaces, boards } from '@jobuki/db'
import { eq } from 'drizzle-orm'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'

type Args = LoaderFunctionArgs | ActionFunctionArgs

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

// Gets Clerk userId; returns null if unauthenticated
export async function getAuthUser(args: Args) {
  const { userId } = await getAuth(args)
  return userId
}

// Syncs Clerk user → local users row; redirects to /sign-in if not authed
export async function requireUser(args: Args) {
  const clerkUserId = await getAuthUser(args)
  if (!clerkUserId) throw redirect('/sign-in')

  const db = getDb()
  let user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  })

  if (!user) {
    const clerkUser = await clerk.users.getUser(clerkUserId)
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null
    const [created] = await db
      .insert(users)
      .values({ clerkUserId, email, name, imageUrl: clerkUser.imageUrl ?? null })
      .returning()
    user = created
  }

  return user
}

// Finds the first workspace the user is a member of
export async function getWorkspaceForUser(userId: string) {
  const db = getDb()
  const membership = await db.query.workspaceMembers.findFirst({
    where: eq(workspaceMembers.userId, userId),
    with: { workspace: true },
  })
  return membership ? { workspace: membership.workspace, role: membership.role } : null
}

// requireUser + getWorkspace in one call; redirects to onboarding if no workspace
export async function requireWorkspaceAccess(args: Args) {
  const user = await requireUser(args)
  const result = await getWorkspaceForUser(user.id)
  if (!result) {
    if (user.accountType === 'job_seeker') throw redirect('/candidate')
    throw redirect('/dashboard/onboarding')
  }
  return { user, workspace: result.workspace, role: result.role }
}

// Verifies a board belongs to the given workspace
export async function requireBoardInWorkspace(boardId: string, workspaceId: string) {
  const db = getDb()
  const board = await db.query.boards.findFirst({
    where: eq(boards.id, boardId),
  })
  if (!board || board.workspaceId !== workspaceId) {
    throw new Response('Not found', { status: 404 })
  }
  return board
}
