export type AuthUserType = 'candidate' | 'publisher' | 'board-creator'
export type AuthMode = 'sign-in' | 'sign-up'

export function toSafeLocalPath(input: string | null | undefined): string | null {
  if (!input) return null
  if (!input.startsWith('/')) return null
  if (input.startsWith('//')) return null
  return input
}

export function parseAuthUserType(input: string | null | undefined): AuthUserType {
  // Support new values
  if (input === 'candidate' || input === 'publisher' || input === 'board-creator') {
    return input
  }
  // Support old values for backward compatibility
  if (input === 'job-seeker') return 'candidate'
  if (input === 'job-poster') return 'publisher'
  return 'board-creator'
}

export function getAuthContextFromSearchParams(searchParams: URLSearchParams) {
  const userType = parseAuthUserType(searchParams.get('type'))
  const redirectTo =
    toSafeLocalPath(searchParams.get('redirectTo'))
    ?? toSafeLocalPath(searchParams.get('redirectPath'))
  return { userType, redirectTo }
}

export function buildAuthPath(options: {
  type: AuthUserType
  mode?: AuthMode
  redirectTo?: string | null
}) {
  const mode = options.mode ?? 'sign-in'
  const params = new URLSearchParams({ type: options.type })
  const redirectTo = toSafeLocalPath(options.redirectTo)
  if (redirectTo) params.set('redirectTo', redirectTo)
  return `/${mode}?${params.toString()}`
}

export function buildCandidateAuthPath(options?: { mode?: AuthMode; redirectTo?: string | null }) {
  return buildAuthPath({
    type: 'candidate',
    mode: options?.mode,
    redirectTo: options?.redirectTo,
  })
}