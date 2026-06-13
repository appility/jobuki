import { getAuth } from '@clerk/react-router/server'
import { createClerkClient } from '@clerk/react-router/api.server'
import { redirect } from 'react-router'
import { features, getDb, roles, users, workspaceMembers, workspaces, boards } from '@jobuki/db'
import { and, eq } from 'drizzle-orm'
import type { LoaderFunctionArgs, ActionFunctionArgs } from 'react-router'
import { buildAuthPath } from './auth-flow'

type Args = LoaderFunctionArgs | ActionFunctionArgs

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! })

function parseAccountType(input: unknown): 'board_creator' | 'candidate' | 'publisher' | null {
  if (input === 'board_creator' || input === 'candidate' || input === 'publisher') return input
  // Support old values for backward compatibility during migration
  if (input === 'job_seeker') return 'candidate'
  if (input === 'job_poster') return 'publisher'
  return null
}

export function isSuperUserEmail(email: string | null | undefined) {
  if (!email) return false
  const allowlist = (process.env.SUPER_USER_EMAILS ?? '')
    .split(',')
    .map(v => v.trim().toLowerCase())
    .filter(Boolean)
  return allowlist.includes(email.trim().toLowerCase())
}

// Gets Clerk userId; returns null if unauthenticated
export async function getAuthUser(args: Args) {
  const { userId } = await getAuth(args)
  return userId
}

// Syncs Clerk user → local users row; redirects to /sign-in if not authed
// Returns the user if signed in, null otherwise — never redirects
export async function getOptionalUser(request: Request) {
  try {
    const { userId } = await getAuth({ request } as any)
    if (!userId) return null
    const db = getDb()
    return await db.query.users.findFirst({ where: eq(users.clerkUserId, userId) }) ?? null
  } catch {
    return null
  }
}

export async function requireUser(
  args: Args,
  opts: { type?: 'candidate' | 'publisher' | 'board-creator' } = {}
) {
  const clerkUserId = await getAuthUser(args)
  if (!clerkUserId) {
    const url = new URL(args.request.url)
    const type = opts.type ?? 'board-creator'
    // Strip .data suffix (React Router Single Fetch) so redirectTo points to the real page
    const pathname = url.pathname.replace(/\.data$/, '')
    throw redirect(buildAuthPath({ type, mode: 'sign-in', redirectTo: pathname + url.search }))
  }

  const db = getDb()
  let user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, clerkUserId),
  })

  if (!user) {
    const clerkUser = await clerk.users.getUser(clerkUserId)
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? ''
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null
    // Prefer account type from Clerk metadata; fall back to the type hint from the sign-in context
    const metaType = parseAccountType((clerkUser.unsafeMetadata as any)?.accountType)
      ?? parseAccountType((clerkUser.publicMetadata as any)?.accountType)
    const defaultType = opts.type === 'candidate' ? 'candidate'
      : opts.type === 'publisher' ? 'publisher'
      : 'board_creator'
    const accountType = metaType ?? defaultType
    const [created] = await db
      .insert(users)
      .values({ clerkUserId, email, name, imageUrl: clerkUser.imageUrl ?? null, accountType })
      .returning()
    user = created
  }

  if (!user.isPlatformAdmin && isSuperUserEmail(user.email)) {
    const [updated] = await db
      .update(users)
      .set({ isPlatformAdmin: true, updatedAt: new Date() })
      .where(eq(users.id, user.id))
      .returning()
    user = updated ?? user
  }

  return user
}

export type JobSeekerTier = 'free' | 'paid'

export async function getJobSeekerTier(user: { clerkUserId: string }): Promise<JobSeekerTier> {
  const paidValues = new Set(
    (process.env.JOB_SEEKER_PAID_PLAN_VALUES ?? 'paid,pro,plus,premium')
      .split(',')
      .map(v => v.trim().toLowerCase())
      .filter(Boolean)
  )

  try {
    const clerkUser = await clerk.users.getUser(user.clerkUserId)
    const publicMeta = (clerkUser.publicMetadata ?? {}) as Record<string, unknown>
    const unsafeMeta = (clerkUser.unsafeMetadata ?? {}) as Record<string, unknown>

    const rawPlan =
      publicMeta.jobSeekerPlan ??
      unsafeMeta.jobSeekerPlan ??
      publicMeta.plan ??
      unsafeMeta.plan

    const explicitPaid =
      publicMeta.jobSeekerPaid === true ||
      unsafeMeta.jobSeekerPaid === true

    if (explicitPaid) return 'paid'

    if (typeof rawPlan === 'string' && paidValues.has(rawPlan.trim().toLowerCase())) {
      return 'paid'
    }
  } catch {
    // Fallback to free if Clerk lookup fails.
  }

  return 'free'
}

export async function requirePlatformAdmin(args: Args) {
  const user = await requireUser(args)

  if (!user.isPlatformAdmin && !isSuperUserEmail(user.email)) {
    throw new Response('Forbidden', { status: 403 })
  }

  return { user }
}

// API-safe platform admin guard: no redirects, only 401/403 responses.
export async function requirePlatformAdminApi(request: Request) {
  const { userId } = await getAuth({ request } as any)
  if (!userId) {
    throw new Response('Unauthorized', { status: 401 })
  }

  const db = getDb()
  const user = await db.query.users.findFirst({
    where: eq(users.clerkUserId, userId),
  })

  if (!user) {
    throw new Response('Unauthorized', { status: 401 })
  }

  if (!user.isPlatformAdmin && !isSuperUserEmail(user.email)) {
    throw new Response('Forbidden', { status: 403 })
  }

  return { user }
}

export async function userHasWorkspaceFeature(userId: string, workspaceId: string, featureKey: string) {
  const db = getDb()
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { email: true, isPlatformAdmin: true },
  })

  if (!user) return false
  if (user.isPlatformAdmin || isSuperUserEmail(user.email)) return true

  const membership = await db.query.workspaceMembers.findFirst({
    where: and(
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.workspaceId, workspaceId)
    ),
    columns: { role: true },
  })

  if (!membership) return false

  const role = await db.query.roles.findFirst({
    where: eq(roles.key, membership.role),
    with: {
      roleFeatures: {
        with: {
          feature: {
            columns: { key: true },
          },
        },
      },
    },
  })

  return role?.roleFeatures.some((entry) => entry.feature.key === featureKey) ?? false
}

export async function requireWorkspaceFeature(args: Args, workspaceId: string, featureKey: string) {
  const user = await requireUser(args)
  const allowed = await userHasWorkspaceFeature(user.id, workspaceId, featureKey)

  if (!allowed) {
    throw new Response('Forbidden', { status: 403 })
  }

  return { user }
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
  const db = getDb()
  let result = await getWorkspaceForUser(user.id)
  const isSuperUser = user.isPlatformAdmin || isSuperUserEmail(user.email)

  if (isSuperUser) {
    if (!result) {
      const fallbackWorkspace = await db.query.workspaces.findFirst()
      if (fallbackWorkspace) {
        await db
          .insert(workspaceMembers)
          .values({ workspaceId: fallbackWorkspace.id, userId: user.id, role: 'admin' })
          .onConflictDoUpdate({
            target: [workspaceMembers.workspaceId, workspaceMembers.userId],
            set: { role: 'admin' },
          })
        result = { workspace: fallbackWorkspace, role: 'admin' as const }
      }
    } else if (result.role === 'member') {
      await db
        .update(workspaceMembers)
        .set({ role: 'admin' })
        .where(
          and(
            eq(workspaceMembers.workspaceId, result.workspace.id),
            eq(workspaceMembers.userId, user.id)
          )
        )
      result = { ...result, role: 'admin' as const }
    }
  }

  if (!result) {
    if (user.accountType === 'candidate') throw redirect('/candidate')
    if (user.accountType === 'publisher') throw redirect('/hiring/start')
    throw redirect('/dashboard/onboarding')
  }
  return { user, workspace: result.workspace, role: result.role }
}

export async function requirePosterAccess(args: Args) {
  const user = await requireUser(args)

  if (user.accountType === 'candidate') {
    throw redirect('/candidate')
  }

  if (user.accountType !== 'publisher') {
    throw redirect('/sign-in?type=publisher')
  }

  return { user }
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
