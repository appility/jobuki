import { SignUp } from '@clerk/react-router'
import { useSearchParams } from 'react-router'
import { Link } from 'react-router'
import { useEffect, useMemo, useState } from 'react'
import { clerkAuthAppearance } from '../lib/clerk-auth-appearance'
import { buildAuthPath, getAuthContextFromSearchParams, type AuthUserType } from '../lib/auth-flow'
import { AuthContextPanel } from '../components/auth-context-panel'

const SIGN_UP_CONTEXT_KEY = 'jobuki:sign-up-context'

type PersistedSignUpContext = {
  userType: AuthUserType
  redirectTo: string | null
}

export default function SignUpPage() {
  const [searchParams] = useSearchParams()
  const { userType: queryUserType, redirectTo: queryRedirectTo } = getAuthContextFromSearchParams(searchParams)
  const [persistedContext, setPersistedContext] = useState<PersistedSignUpContext | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (searchParams.get('type') || searchParams.get('redirectTo') || searchParams.get('redirectPath')) {
      const next: PersistedSignUpContext = {
        userType: queryUserType,
        redirectTo: queryRedirectTo,
      }
      window.sessionStorage.setItem(SIGN_UP_CONTEXT_KEY, JSON.stringify(next))
      setPersistedContext(next)
      return
    }

    const raw = window.sessionStorage.getItem(SIGN_UP_CONTEXT_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as Partial<PersistedSignUpContext>
      let userType = parsed.userType
      // Support old values
      if (userType === 'job-seeker') userType = 'candidate'
      if (userType === 'job-poster') userType = 'publisher'
      if (userType === 'candidate' || userType === 'publisher' || userType === 'board-creator') {
        // valid
      } else {
        userType = 'board-creator'
      }
      const redirectTo = typeof parsed.redirectTo === 'string' ? parsed.redirectTo : null
      setPersistedContext({ userType, redirectTo })
    } catch {
      window.sessionStorage.removeItem(SIGN_UP_CONTEXT_KEY)
    }
  }, [queryRedirectTo, queryUserType, searchParams])

  const userType = useMemo<AuthUserType>(() => {
    if (searchParams.get('type')) return queryUserType
    return persistedContext?.userType ?? 'board-creator'
  }, [persistedContext?.userType, queryUserType, searchParams])

  const requestedPath = useMemo(() => {
    if (searchParams.get('redirectTo') || searchParams.get('redirectPath')) return queryRedirectTo
    return persistedContext?.redirectTo ?? null
  }, [persistedContext?.redirectTo, queryRedirectTo, searchParams])

  const fallbackByType = userType === 'candidate'
    ? '/candidate/start'
    : userType === 'publisher'
      ? '/hiring/start'
      : '/dashboard'
  const afterSignUpUrl = requestedPath ?? fallbackByType
  const accountTypeMetadata = userType === 'candidate'
    ? 'candidate'
    : userType === 'publisher'
      ? 'publisher'
      : 'board_creator'
  const signInUrl = buildAuthPath({ type: userType, mode: 'sign-in', redirectTo: afterSignUpUrl })

  return (
    <div className="auth-shell">
      <div className="auth-shell-inner">
        <AuthContextPanel userType={userType} mode="sign-up" redirectTo={afterSignUpUrl} />
        <section className="auth-form-panel">
          <div className="auth-clerk-slot">
            <SignUp
              fallbackRedirectUrl={afterSignUpUrl}
              forceRedirectUrl={afterSignUpUrl}
              signInUrl={signInUrl}
              unsafeMetadata={{ accountType: accountTypeMetadata }}
              appearance={clerkAuthAppearance}
            />
            <p className="text-sm mt-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
              Already have an account?{' '}
              <Link to={signInUrl} style={{ color: 'var(--color-primary)' }}>
                Sign in
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
