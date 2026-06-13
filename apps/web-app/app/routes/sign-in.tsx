import { SignIn } from '@clerk/react-router'
import { useSearchParams } from 'react-router'
import { Link } from 'react-router'
import { clerkAuthAppearance } from '../lib/clerk-auth-appearance'
import { buildAuthPath, getAuthContextFromSearchParams } from '../lib/auth-flow'
import { AuthContextPanel } from '../components/auth-context-panel'

export default function SignInPage() {
  const [searchParams] = useSearchParams()
  const { userType, redirectTo } = getAuthContextFromSearchParams(searchParams)
  const fallbackByType = userType === 'candidate'
    ? '/candidate/start'
    : userType === 'publisher'
      ? '/hiring/start'
      : '/dashboard'
  const redirectTarget = redirectTo ?? fallbackByType
  const signUpUrl = buildAuthPath({ type: userType, mode: 'sign-up', redirectTo: redirectTarget })

  return (
    <div className="auth-shell">
      <div className="auth-shell-inner">
        <AuthContextPanel userType={userType} mode="sign-in" redirectTo={redirectTarget} />
        <section className="auth-form-panel">
          <div className="auth-clerk-slot">
            <SignIn
              fallbackRedirectUrl={redirectTarget}
              forceRedirectUrl={redirectTarget}
              signUpUrl={signUpUrl}
              appearance={clerkAuthAppearance}
            />
            <p className="text-sm mt-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
              New to Jobuki?{' '}
              <Link to={signUpUrl} style={{ color: 'var(--color-primary)' }}>
                Create an account
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
