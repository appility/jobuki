import { SignIn } from '@clerk/react-router'
import { useSearchParams } from 'react-router'
import { Link } from 'react-router'
import { clerkAuthAppearance } from '../lib/clerk-auth-appearance'

function toSafeLocalPath(input: string | null): string | null {
  if (!input) return null
  if (!input.startsWith('/')) return null
  if (input.startsWith('//')) return null
  return input
}

export default function SignInPage() {
  const [searchParams] = useSearchParams()
  const type = searchParams.get('type')
  const userType = type === 'job-seeker' || type === 'job-poster' ? type : 'board-creator'
  const requestedPath =
    toSafeLocalPath(searchParams.get('redirectTo'))
    ?? toSafeLocalPath(searchParams.get('redirectPath'))
  const fallbackByType = userType === 'job-seeker'
    ? '/candidate/start'
    : userType === 'job-poster'
      ? '/posters/start'
      : '/dashboard'
  const redirectTarget = requestedPath ?? fallbackByType
  const signUpUrl = `/sign-up?type=${userType}`

  return (
    <div className="auth-shell">
      <div className="auth-shell-inner">
        <aside className="auth-side-panel" aria-hidden>
          {userType === 'job-seeker' ? (
            <>
              <p className="auth-kicker">Job seeker access</p>
              <h1 className="auth-side-title">Welcome back</h1>
              <p className="auth-side-copy">
                Sign in to track applications and manage your candidate profile.
              </p>
            </>
          ) : userType === 'job-poster' ? (
            <>
              <p className="auth-kicker">Job poster access</p>
              <h1 className="auth-side-title">Welcome back</h1>
              <p className="auth-side-copy">
                Sign in to manage submitted listings and paid posting activity.
              </p>
            </>
          ) : (
            <>
              <p className="auth-kicker">Board creator access</p>
              <h1 className="auth-side-title">Welcome back to Jobuki</h1>
              <p className="auth-side-copy">
                Sign in to manage boards, post jobs, and track applications in one place.
              </p>
            </>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Link to="/sign-in?type=board-creator" className="btn-outline text-xs px-3 py-1.5">Board creator</Link>
            <Link to="/sign-in?type=job-poster" className="btn-outline text-xs px-3 py-1.5">Job poster</Link>
            <Link to="/sign-in?type=job-seeker" className="btn-outline text-xs px-3 py-1.5">Job seeker</Link>
          </div>
        </aside>
        <section className="auth-form-panel">
          <div className="auth-clerk-slot">
            <SignIn
              afterSignInUrl={redirectTarget}
              fallbackRedirectUrl={redirectTarget}
              forceRedirectUrl={redirectTarget}
              signUpUrl={signUpUrl}
              appearance={clerkAuthAppearance}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
